import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { TerraformScaffolderApi } from './TerraformScaffolderApi';
import { TerraformModuleReference, TerraformVariable } from '../types';
import { CatalogApi } from '@backstage/catalog-client';

export class TerraformScaffolderClient implements TerraformScaffolderApi {
  private readonly configApi: ConfigApi;
  private readonly catalogApi: CatalogApi;
  private readonly identityApi: IdentityApi;
  
  constructor(options: { configApi: ConfigApi; catalogApi: CatalogApi; identityApi: IdentityApi }) {
    this.configApi = options.configApi;
    this.catalogApi = options.catalogApi;
    this.identityApi = options.identityApi
  }

  private async getModulesFromCatalog(): Promise<TerraformModuleReference[]> {
    try {
      const entities = await this.catalogApi.getEntities({
        filter: {
          kind: 'resource',
          'spec.type': 'terraform-module',
        },
      });

      return entities.items
        .filter(entity => {
          const annotations = entity.metadata.annotations || {};
          return annotations['terasky.backstage.io/terraform-module-url'] && 
                 annotations['terasky.backstage.io/terraform-module-name'];
        })
        .map(entity => {
          const annotations = entity.metadata.annotations || {};
          const ref = annotations['terasky.backstage.io/terraform-module-ref'];
          return {
            name: annotations['terasky.backstage.io/terraform-module-name'],
            url: annotations['terasky.backstage.io/terraform-module-url'],
            refs: ref ? [ref] : [],
            description: annotations['terasky.backstage.io/terraform-module-description'] || entity.metadata.description,
          };
        });
    } catch (error) {
      console.error('Error fetching terraform modules from catalog:', error);
      return [];
    }
  }

  public async getModuleVersions(moduleRef: TerraformModuleReference): Promise<string[]> {
    // Only proceed if this is a registry module
    if (!moduleRef.isRegistryModule) {
      return moduleRef.refs || [];
    }

    // Parse the module name from the URL
    // Example: terraform-aws-modules/eventbridge/aws
    const urlParts = moduleRef.url.split('/');
    const provider = urlParts[urlParts.length - 1];
    const name = urlParts[urlParts.length - 2];
    const namespace = urlParts[urlParts.length - 3];
    const backendUrl = this.configApi.getString('backend.baseUrl');
    const token = await this.identityApi.getCredentials();

    // For registry modules, we need to fetch the versions
    try {
      
      const response = await fetch(
        `${backendUrl}/api/proxy/terraform-registry/v1/modules/${namespace}/${name}/${provider}/versions`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token.token || ''}`,
          }
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch versions for module ${namespace}/${name}/${provider}:`, response.statusText);
        return [];
      }

      const data = await response.json();
      return data.modules[0].versions
        .map((version: any) => `v${version.version}`)
        .sort((a: string, b: string) => {
          // Remove 'v' prefix and compare versions
          const versionA = a.slice(1).split('.').map(Number);
          const versionB = b.slice(1).split('.').map(Number);
          
          // Compare major version
          if (versionA[0] !== versionB[0]) return versionB[0] - versionA[0];
          // Compare minor version
          if (versionA[1] !== versionB[1]) return versionB[1] - versionA[1];
          // Compare patch version
          return versionB[2] - versionA[2];
        });
    } catch (error) {
      console.error(`Error fetching versions for module ${namespace}/${name}:`, error);
      return [];
    }
  }

  private async getModulesFromRegistry(): Promise<TerraformModuleReference[]> {
    try {
      if (!this.configApi.has('terraformScaffolder.registryReferences.namespaces')) {
        return [];
      }
      const backendUrl = this.configApi.getString('backend.baseUrl');
      const namespaces = this.configApi.getStringArray('terraformScaffolder.registryReferences.namespaces');
      const modules: TerraformModuleReference[] = [];
      const token = await this.identityApi.getCredentials(); 
                
      for (const namespace of namespaces) {
        let hasMore = true;
        let offset = 0;

        while (hasMore) {
          const response = await fetch(
            `${backendUrl}/api/proxy/terraform-registry/v1/modules/${namespace}?include=latest-version${offset ? `&offset=${offset}` : ''}`,{
              method: 'GET',
              headers: {
                  Authorization: `Bearer ${token.token}`,
              }
          });

          if (!response.ok) {
            console.error(`Failed to fetch modules for namespace ${namespace}:`, response.statusText);
            break;
          }

          const data = await response.json();
          
          for (const module of data.modules) {
            // Only store the latest version initially
            const versions = [`v${module.version}`].sort((a: string, b: string) => {
              // Remove 'v' prefix and compare versions
              const versionA = a.slice(1).split('.').map(Number);
              const versionB = b.slice(1).split('.').map(Number);
              
              // Compare major version
              if (versionA[0] !== versionB[0]) return versionB[0] - versionA[0];
              // Compare minor version
              if (versionA[1] !== versionB[1]) return versionB[1] - versionA[1];
              // Compare patch version
              return versionB[2] - versionA[2];
            });
            
            modules.push({
              name: `${module.name} (${module.namespace})`,
              url: `https://github.com/${module.namespace}/terraform-${module.provider}-${module.name}`,
              refs: versions,
              description: module.description,
              isRegistryModule: false,
            });
          }

          if (data.meta.next_offset) {
            offset = data.meta.next_offset;
          } else {
            hasMore = false;
          }
        }
      }

      return modules;
    } catch (error) {
      console.error('Error fetching terraform modules from registry:', error);
      return [];
    }
  }

  private async getModulesFromConfig(): Promise<TerraformModuleReference[]> {
    try {
      if (!this.configApi.has('terraformScaffolder.moduleReferences')) {
        return [];
      }

      const moduleRefs = this.configApi.getConfigArray('terraformScaffolder.moduleReferences');
      return moduleRefs.map(moduleRef => {
        const url = moduleRef.getString('url');
        const ref = moduleRef.getOptionalString('ref');
        const refs = moduleRef.getOptionalStringArray('refs');
        
        // Handle both old ref and new refs format
        const versions = refs || (ref ? [ref] : []);
        
        // Check if this is a GitHub URL
        const isGitHub = url.startsWith('http://github.com/') || url.startsWith('https://github.com/');
        
        if (isGitHub) {
          return {
            name: moduleRef.getString('name'),
            url: url,
            refs: versions,
            description: moduleRef.getOptionalString('description'),
            isRegistryModule: false
          };
        } else {
          // Assume it's a registry module if it's not a GitHub URL
          // Parse registry path into components
          const [org, module, provider] = url.split('/');
          return {
            name: moduleRef.getString('name'),
            url: `https://github.com/${org}/terraform-${provider}-${module}`,
            refs: versions,
            description: moduleRef.getOptionalString('description'),
            isRegistryModule: false
          };
        }
      });
    } catch (error) {
      console.error('Error reading terraform module references from config:', error);
      return [];
    }
  }

  async getModuleReferences(): Promise<TerraformModuleReference[]> {
    try {
      const [configModules, catalogModules, registryModules] = await Promise.all([
        this.getModulesFromConfig(),
        this.getModulesFromCatalog(),
        this.getModulesFromRegistry(),
      ]);

      return [...configModules, ...catalogModules, ...registryModules]
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching terraform module references:', error);
      return [];
    }
  }

  async getModuleVariables(moduleRef: TerraformModuleReference, selectedVersion?: string): Promise<TerraformVariable[]> {
    try {
      const backendUrl = this.configApi.getString('backend.baseUrl');
      const useProxyForGitHub = this.configApi.getBoolean('terraformScaffolder.useProxyForGitHub') || false;
      const version = selectedVersion || 
                     (moduleRef.refs && moduleRef.refs.length > 0 ? moduleRef.refs[0] : 'main');
      let rawUrl;
      // For GitHub URLs
      if (!useProxyForGitHub) {
        rawUrl = moduleRef.url
          .replace('github.com', 'raw.githubusercontent.com')
          .replace(/\.git$/, '');
      } else {
        rawUrl = moduleRef.url
          .replace('https://github.com', `${backendUrl}/api/proxy/github-raw`)
          .replace(/\.git$/, '');
      }
      
      // For GitHub, we need to use refs/tags/ for version tags
      const versionPath = version.startsWith('v') ? `refs/tags/${version}` : version;
      let response
      const token = await this.identityApi.getCredentials(); 
      if (!useProxyForGitHub) {
        response = await fetch(`${rawUrl}/${versionPath}/variables.tf`);
      } else {
        response = await fetch(`${rawUrl}/${versionPath}/variables.tf`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token.token || ''}`,
            }
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch variables.tf from ${moduleRef.url} at version ${version}`);
      }

      const content = await response.text();
      const variables = this.parseVariablesFile(content);

      // Store the original content for later use in the template
      variables.forEach(variable => {
        variable.originalDefinition = content;
      });

      return variables;
    } catch (error) {
      console.error('Error fetching module variables:', error);
      throw error;
    }
  }

  private parseVariablesFile(content: string): TerraformVariable[] {
    const variables: TerraformVariable[] = [];
    const blocks = content.split('\nvariable');

    blocks.slice(1).forEach(block => {
      const nameMatch = block.match(/"([^"]+)"/);
      if (!nameMatch) return;

      const name = nameMatch[1];
      const typeMatch = block.match(/type\s*=\s*([^\n]+)/);
      const descriptionMatch = block.match(/description\s*=\s*"([^"]+)"/);
      const defaultMatch = block.match(/default\s*=\s*({[^}]+}|\[[^\]]+\]|[^\n]+)/);
      const sensitiveMatch = block.match(/sensitive\s*=\s*(true|false)/);

      let type = 'string';

      if (typeMatch) {
        type = typeMatch[1].trim();
      }

      let defaultValue = undefined;
      if (defaultMatch) {
        const rawDefault = defaultMatch[1].trim();
        defaultValue = this.parseDefaultValue(rawDefault, type);
      }

      variables.push({
        name,
        type,
        description: descriptionMatch ? descriptionMatch[1] : undefined,
        default: defaultValue,
        required: !defaultMatch,
        sensitive: sensitiveMatch ? sensitiveMatch[1] === 'true' : false,
        originalDefinition: block.trim(),
      });
    });

    return variables;
  }

  private parseDefaultValue(value: string, type: string): any {
    value = value.trim();

    // Handle quoted strings
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    // Handle HCL lists with maps
    if (value.startsWith('[') && type.startsWith('list(map(')) {
      try {
        // Extract each map from the list
        const matches = value.match(/\{[^}]+\}/g);
        if (!matches) return [];

        return matches.map(item => {
          // Clean up the item string and split into key-value pairs
          const pairs = item
            .slice(1, -1) // Remove braces
            .split('\n') // Split by newline
            .map(line => line.trim()) // Trim each line
            .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments

          const obj: Record<string, any> = {};

          pairs.forEach(pair => {
            const [key, val] = pair.split(/\s*=\s*/);
            if (!key || !val) return;

            const cleanKey = key.trim();
            const cleanVal = val.trim();

            // Handle quoted strings and numbers
            obj[cleanKey] = cleanVal.startsWith('"') && cleanVal.endsWith('"')
              ? cleanVal.slice(1, -1)
              : !isNaN(Number(cleanVal))
                ? Number(cleanVal)
                : cleanVal;
          });

          return obj;
        });
      } catch (error) {
        console.error('Error parsing list(map) default value:', error);
        return [];
      }
    }

    // Handle regular HCL lists
    if (value.startsWith('[')) {
      try {
        // Convert HCL list to JSON array
        const listStr = value
          .replace(/\[|\]/g, '') // Remove brackets
          .split(',') // Split by comma
          .map(v => v.trim()) // Trim each value
          .filter(v => v) // Remove empty values
          .map(v => {
            // Handle quoted strings in list
            if (v.startsWith('"') && v.endsWith('"')) {
              return v.slice(1, -1);
            }
            // Handle numbers in list
            if (!isNaN(Number(v))) {
              return Number(v);
            }
            return v;
          });
        return listStr;
      } catch {
        return [];
      }
    }

    // Handle HCL maps
    if (value.startsWith('{')) {
      try {
        // Convert HCL map to object
        const mapStr = value
          .slice(1, -1) // Remove braces
          .split(',') // Split by comma
          .map(pair => pair.trim()) // Trim each pair
          .filter(pair => pair) // Remove empty pairs
          .reduce((acc, pair) => {
            const [key, val] = pair.split('=').map(p => p.trim());
            // Handle quoted strings in map
            const parsedVal = val.startsWith('"') && val.endsWith('"') 
              ? val.slice(1, -1)
              : !isNaN(Number(val)) 
                ? Number(val)
                : val;
            return { ...acc, [key]: parsedVal };
          }, {});
        return mapStr;
      } catch {
        return {};
      }
    }

    // Handle booleans
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Handle numbers
    if (type === 'number' && !isNaN(Number(value))) {
      return Number(value);
    }

    // Handle null
    if (value === 'null') return null;

    // Default to string
    return value;
  }
}