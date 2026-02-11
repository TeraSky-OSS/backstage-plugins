import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/frontend-plugin-api';
import { CatalogApi } from '@backstage/plugin-catalog-react';
import type { ScaffolderAction, FieldType, FieldExtension, ValidationResult } from './types';

export const templateBuilderApiRef = createApiRef<TemplateBuilderApi>({
  id: 'plugin.template-builder.api',
});

export interface TemplateBuilderApi {
  getAvailableActions(): Promise<ScaffolderAction[]>;
  getFieldTypes(): Promise<FieldType[]>;
  getFieldExtensions(): Promise<FieldExtension[]>;
  getTemplate(entityRef: string): Promise<string>;
  validateTemplate(template: string): Promise<ValidationResult>;
}

export class DefaultTemplateBuilderApi implements TemplateBuilderApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
      catalogApi: CatalogApi;
    },
  ) {}

  async getAvailableActions(): Promise<ScaffolderAction[]> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl('scaffolder');
    const response = await this.options.fetchApi.fetch(`${baseUrl}/v2/actions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch actions: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ScaffolderAction[];
  }

  async getFieldTypes(): Promise<FieldType[]> {
    // Return basic JSON Schema types
    return [
      { name: 'string', description: 'Text input' },
      { name: 'number', description: 'Numeric input' },
      { name: 'integer', description: 'Integer input' },
      { name: 'boolean', description: 'Boolean checkbox' },
      { name: 'array', description: 'Array of items' },
      { name: 'object', description: 'Object with properties' },
    ];
  }

  async getFieldExtensions(): Promise<FieldExtension[]> {
    try {
      // Try to discover field extensions from the scaffolder-react plugin
      // This checks if field extensions are registered in the global scope
      const discoveredExtensions = new Map<string, FieldExtension>();
      
      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        // Try to get field extensions from @backstage/plugin-scaffolder-react
        // Field extensions are typically registered using scaffolderPlugin.provide(createScaffolderFieldExtension(...))
        
        // Check various possible locations where field extensions might be registered
        const possibleLocations = [
          (window as any).__SCAFFOLDER_FIELD_EXTENSIONS__,
          (window as any).backstage?.scaffolder?.fieldExtensions,
        ];

        for (const location of possibleLocations) {
          if (location && typeof location === 'object') {
            Object.keys(location).forEach(name => {
              if (!discoveredExtensions.has(name)) {
                discoveredExtensions.set(name, {
                  name,
                  displayName: name,
                  description: `Custom field extension`,
                });
              }
            });
          }
        }
      }

      // Add common built-in field extensions that are typically available
      const commonExtensions: FieldExtension[] = [
        { name: 'EntityPicker', displayName: 'Entity Picker', description: 'Select an entity from the catalog' },
        { name: 'EntityNamePicker', displayName: 'Entity Name Picker', description: 'Select an entity name' },
        { name: 'OwnedEntityPicker', displayName: 'Owned Entity Picker', description: 'Select an entity you own' },
        { name: 'EntityTagsPicker', displayName: 'Entity Tags Picker', description: 'Select entity tags' },
        { name: 'MultiEntityPicker', displayName: 'Multi Entity Picker', description: 'Select multiple entities' },
        { name: 'OwnerPicker', displayName: 'Owner Picker', description: 'Select an owner from catalog' },
        { name: 'RepoUrlPicker', displayName: 'Repository URL Picker', description: 'Select a repository URL' },
        { name: 'RepoUrlSelector', displayName: 'Repository URL Selector', description: 'Select repository URL' },
        { name: 'MyGroupsPicker', displayName: 'My Groups Picker', description: 'Select from your groups' },
      ];
      
      // Merge common extensions with discovered ones
      commonExtensions.forEach(ext => {
        if (!discoveredExtensions.has(ext.name)) {
          discoveredExtensions.set(ext.name, ext);
        }
      });

      // Try to fetch from scaffolder API (if endpoint exists)
      try {
        const baseUrl = await this.options.discoveryApi.getBaseUrl('scaffolder');
        const response = await this.options.fetchApi.fetch(`${baseUrl}/v2/actions`);
        
        if (response.ok) {
          const actions = await response.json();
          
          // Scan through action input schemas to find field extensions
          // Many custom field extensions are documented in action schemas
          for (const action of actions) {
            if (action.schema?.input?.properties) {
              for (const [, propSchema] of Object.entries(action.schema.input.properties as Record<string, any>)) {
                if (propSchema?.['ui:field']) {
                  const fieldName = propSchema['ui:field'];
                  if (!discoveredExtensions.has(fieldName)) {
                    discoveredExtensions.set(fieldName, {
                      name: fieldName,
                      displayName: fieldName,
                      description: `Field extension from ${action.id}`,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (apiError) {
        // API might not support this, continue with discovered extensions
      }
      
      return Array.from(discoveredExtensions.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      // Return minimal set of built-in extensions as fallback
      return [
        { name: 'EntityPicker', displayName: 'Entity Picker', description: 'Select an entity from the catalog' },
        { name: 'RepoUrlPicker', displayName: 'Repository URL Picker', description: 'Select a repository URL' },
        { name: 'OwnerPicker', displayName: 'Owner Picker', description: 'Select an owner' },
      ];
    }
  }

  async getTemplate(entityRef: string): Promise<string> {
    try {
      const entity = await this.options.catalogApi.getEntityByRef(entityRef);
      
      if (!entity) {
        throw new Error(`Entity ${entityRef} not found`);
      }

      // Convert the entity back to YAML format
      // For now, we'll return the entity as-is and let the caller serialize it
      return JSON.stringify(entity, null, 2);
    } catch (error) {
      throw new Error(`Failed to load template: ${error}`);
    }
  }

  async validateTemplate(template: string): Promise<ValidationResult> {
    // Basic validation - can be enhanced later
    const errors: ValidationResult['errors'] = [];

    try {
      const parsed = JSON.parse(template);
      
      if (!parsed.metadata?.name) {
        errors.push({
          path: 'metadata.name',
          message: 'Template name is required',
          severity: 'error',
        });
      }

      if (!parsed.metadata?.title) {
        errors.push({
          path: 'metadata.title',
          message: 'Template title is required',
          severity: 'error',
        });
      }

      if (!parsed.spec?.parameters || parsed.spec.parameters.length === 0) {
        errors.push({
          path: 'spec.parameters',
          message: 'At least one parameter step is required',
          severity: 'warning',
        });
      }

      if (!parsed.spec?.steps || parsed.spec.steps.length === 0) {
        errors.push({
          path: 'spec.steps',
          message: 'At least one workflow step is required',
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        path: '',
        message: `Invalid JSON: ${error}`,
        severity: 'error',
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }
}
