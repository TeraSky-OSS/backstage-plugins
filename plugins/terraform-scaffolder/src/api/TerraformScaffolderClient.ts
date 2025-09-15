import { ConfigApi } from '@backstage/core-plugin-api';
import { TerraformScaffolderApi } from './TerraformScaffolderApi';
import { TerraformModuleReference, TerraformVariable } from '../types';

export class TerraformScaffolderClient implements TerraformScaffolderApi {
  private readonly configApi: ConfigApi;

  constructor(options: { configApi: ConfigApi }) {
    this.configApi = options.configApi;
  }

  async getModuleReferences(): Promise<TerraformModuleReference[]> {
    try {
      if (!this.configApi.has('terraformScaffolder.moduleReferences')) {
        console.warn('No terraformScaffolder.moduleReferences config found');
        return [];
      }

      const moduleRefs = this.configApi.getConfigArray('terraformScaffolder.moduleReferences');
      return moduleRefs.map(moduleRef => ({
        name: moduleRef.getString('name'),
        url: moduleRef.getString('url'),
        ref: moduleRef.getOptionalString('ref'),
        description: moduleRef.getOptionalString('description'),
      }));
    } catch (error) {
      console.error('Error reading terraform module references:', error);
      return [];
    }
  }

  async getModuleVariables(moduleRef: TerraformModuleReference): Promise<TerraformVariable[]> {
    try {
      // For GitHub URLs, convert to raw content URL
      const rawUrl = moduleRef.url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace(/\.git$/, '');
      
      const response = await fetch(`${rawUrl}/${moduleRef.ref || 'main'}/variables.tf`);
      if (!response.ok) {
        throw new Error(`Failed to fetch variables.tf from ${moduleRef.url}`);
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