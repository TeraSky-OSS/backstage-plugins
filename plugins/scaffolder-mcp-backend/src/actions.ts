import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';

interface TemplateInfo {
  name: string;
  title: string;
  description?: string;
  tags: string[];
  entityRef: string;
}

/**
 * Get all software templates from the catalog
 */
async function getAllTemplates(
  catalog: CatalogService,
  credentials?: any
): Promise<TemplateInfo[]> {
  const { items } = await catalog.queryEntities(
    {
      filter: {
        kind: 'Template',
      },
    },
    { credentials }
  );

  return items.map(entity => {
    const template = entity as TemplateEntityV1beta3;
    return {
      name: template.metadata.name,
      title: template.metadata.title || template.metadata.name,
      description: template.metadata.description,
      tags: template.metadata.tags || [],
      entityRef: stringifyEntityRef(entity),
    };
  });
}

/**
 * Get a specific template by name or entity ref
 */
async function getTemplate(
  catalog: CatalogService,
  nameOrRef: string,
  credentials?: any
): Promise<TemplateEntityV1beta3> {
  let filter: Record<string, string> = { kind: 'Template' };

  // Try to parse as entity ref first
  try {
    const entityRef = parseEntityRef(nameOrRef);
    filter['metadata.name'] = entityRef.name;
    if (entityRef.namespace) {
      filter['metadata.namespace'] = entityRef.namespace;
    }
  } catch {
    // If not a valid entity ref, just use the name
    filter['metadata.name'] = nameOrRef;
  }

  const { items } = await catalog.queryEntities(
    { filter },
    { credentials }
  );

  if (items.length === 0) {
    throw new InputError(`No template found with name or ref "${nameOrRef}"`);
  }

  if (items.length > 1) {
    throw new InputError(
      `Multiple templates found with name "${nameOrRef}". Please use a full entity ref (e.g., "template:default/my-template") to specify which one.`
    );
  }

  const entity = items[0];

  if (entity.kind !== 'Template') {
    throw new InputError(
      `Entity "${nameOrRef}" is not a Template (found kind: ${entity.kind})`
    );
  }

  return entity as TemplateEntityV1beta3;
}

/**
 * Register MCP actions for Backstage scaffolder templates
 */
export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  catalog: CatalogService,
  discovery: DiscoveryService,
  auth: AuthService
) {
  // List all software templates
  actionsRegistry.register({
    name: 'list_software_templates',
    title: 'List Software Templates',
    description:
      'Lists all available software templates in the Backstage catalog. Returns the name, title, description, and tags for each template. Use this to discover what templates are available before getting their parameter schemas or running them.',
    schema: {
      input: z => z.object({}).strict(),
      output: z =>
        z.object({
          templates: z.array(
            z.object({
              name: z.string().describe('The unique name of the template'),
              title: z.string().describe('The human-readable title of the template'),
              description: z
                .string()
                .optional()
                .describe('A description of what this template creates'),
              tags: z
                .array(z.string())
                .describe('Tags associated with this template for categorization'),
              entityRef: z
                .string()
                .describe(
                  'The full entity reference for this template (use this when calling other actions)'
                ),
            })
          ),
          count: z.number().describe('Total number of templates available'),
        }),
    },
    action: async ({ credentials }) => {
      const templates = await getAllTemplates(catalog, credentials);

      return {
        output: {
          templates,
          count: templates.length,
        },
      };
    },
  });

  // Get parameter schema for a specific template
  actionsRegistry.register({
    name: 'get_software_template_parameter_schema',
    title: 'Get Software Template Parameter Schema',
    description:
      'Retrieves the parameter schema for a specific software template. This schema defines what inputs are required to execute the template. Use the template name or full entity reference from list_software_templates. The schema follows JSON Schema format and includes validation rules, default values, and field descriptions.',
    schema: {
      input: z =>
        z.object({
          templateNameOrRef: z
            .string()
            .describe(
              'The name of the template (e.g., "my-template") or the full entity reference (e.g., "template:default/my-template"). If multiple templates have the same name, use the full entity reference.'
            ),
        }),
      output: z =>
        z.object({
          templateName: z.string().describe('The name of the template'),
          templateTitle: z
            .string()
            .describe('The human-readable title of the template'),
          templateDescription: z
            .string()
            .optional()
            .describe('Description of what this template creates'),
          entityRef: z
            .string()
            .describe('The full entity reference for this template'),
          parameters: z
            .any()
            .describe(
              'Array of parameter steps. Each step contains a set of input fields that will be requested from the user. The structure follows the JSON Schema format with properties, required fields, and validation rules.'
            ),
        }),
    },
    action: async ({ input, credentials }) => {
      const template = await getTemplate(
        catalog,
        input.templateNameOrRef,
        credentials
      );

      // Extract parameter schema from template
      const parameters = template.spec.parameters || [];

      return {
        output: {
          templateName: template.metadata.name,
          templateTitle: template.metadata.title || template.metadata.name,
          templateDescription: template.metadata.description,
          entityRef: stringifyEntityRef(template),
          parameters: Array.isArray(parameters) ? parameters : [parameters],
        },
      };
    },
  });

  // Execute a software template
  actionsRegistry.register({
    name: 'run_software_template',
    title: 'Run Software Template',
    description:
      'Executes a software template with the provided parameters and waits for completion. The template will create a new component, repository, or other resources as defined by the template. Use get_software_template_parameter_schema first to understand what parameters are required. The parameters should be provided as a JSON object matching the schema. This action will poll the task status until completion and return the outputs.',
    schema: {
      input: z =>
        z.object({
          templateNameOrRef: z
            .string()
            .describe(
              'The name of the template (e.g., "my-template") or the full entity reference (e.g., "template:default/my-template"). Must match a template returned by list_software_templates.'
            ),
          parameters: z
            .record(z.any())
            .describe(
              'A JSON object containing all required and optional parameters for the template. The structure must match the schema returned by get_software_template_parameter_schema. Nested objects are supported.'
            ),
        }),
      output: z =>
        z.object({
          taskId: z
            .string()
            .describe(
              'Unique identifier for the scaffolder task.'
            ),
          templateName: z.string().describe('The name of the template that was executed'),
          templateRef: z.string().describe('The full entity reference of the template'),
          status: z.string().describe('Final status of the task (completed, failed, cancelled)'),
          output: z
            .record(z.any())
            .optional()
            .describe('Output values produced by the template execution'),
        }),
    },
    action: async ({ input, credentials }) => {
      const template = await getTemplate(
        catalog,
        input.templateNameOrRef,
        credentials
      );

      const templateRef = stringifyEntityRef(template);

      // Get the scaffolder base URL
      const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
      
      // Get the service token for making backend API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'scaffolder',
      });

      // Execute the template via HTTP API
      const response = await fetch(`${scaffolderUrl}/v2/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateRef,
          values: input.parameters,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to execute template: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      const taskId = result.id;

      // Poll for task completion
      let taskStatus = 'processing';
      let taskData: any;
      const maxAttempts = 300; // 5 minutes with 1 second intervals
      let attempts = 0;

      while (taskStatus === 'processing' && attempts < maxAttempts) {
        // Wait 1 second before polling
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        // Get task status
        const taskResponse = await fetch(`${scaffolderUrl}/v2/tasks/${taskId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!taskResponse.ok) {
          throw new Error(
            `Failed to fetch task status: ${taskResponse.status} ${taskResponse.statusText}`
          );
        }

        taskData = await taskResponse.json();
        taskStatus = taskData.status;
      }

      if (attempts >= maxAttempts) {
        throw new Error(
          `Task execution timed out after ${maxAttempts} seconds. Task ID: ${taskId}. Current status: ${taskStatus}`
        );
      }

      if (taskStatus === 'failed') {
        const errorMessage = taskData.error?.message || 'Unknown error';
        throw new Error(
          `Template execution failed: ${errorMessage}. Task ID: ${taskId}`
        );
      }

      if (taskStatus === 'cancelled') {
        throw new Error(
          `Template execution was cancelled. Task ID: ${taskId}`
        );
      }

      return {
        output: {
          taskId,
          templateName: template.metadata.name,
          templateRef,
          status: taskStatus,
          output: taskData.output || {},
        },
      };
    },
  });

  // List all available scaffolder actions
  actionsRegistry.register({
    name: 'list_software_template_actions',
    title: 'List Software Template Actions',
    description:
      'Lists all available scaffolder actions that can be used in software templates. Returns the ID and description of each action. Use this to discover what actions are available for building templates.',
    schema: {
      input: z =>
        z.object({
          filter: z
            .string()
            .optional()
            .describe(
              'Optional filter string to match against action IDs and descriptions. Only actions containing this string (case-insensitive) will be returned.'
            ),
        }),
      output: z =>
        z.object({
          actions: z.array(
            z.object({
              id: z.string().describe('The unique identifier of the action'),
              description: z
                .string()
                .optional()
                .describe('Description of what this action does'),
            })
          ),
          count: z.number().describe('Total number of actions returned'),
        }),
    },
    action: async ({ input, credentials }) => {
      // Get the scaffolder base URL
      const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
      
      // Get the service token for making backend API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'scaffolder',
      });

      // Fetch all actions via HTTP API
      const response = await fetch(`${scaffolderUrl}/v2/actions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch actions: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      let filteredActions = data.map((action: any) => ({
        id: action.id,
        description: action.description,
      }));

      // Apply filter if provided
      if (input.filter) {
        const filterLower = input.filter.toLowerCase();
        filteredActions = filteredActions.filter(
          (action: { id: string; description?: string }) =>
            action.id.toLowerCase().includes(filterLower) ||
            (action.description?.toLowerCase().includes(filterLower) ?? false)
        );
      }

      return {
        output: {
          actions: filteredActions,
          count: filteredActions.length,
        },
      };
    },
  });

  // Get details for a specific scaffolder action
  actionsRegistry.register({
    name: 'get_software_template_action_details',
    title: 'Get Software Template Action Details',
    description:
      'Retrieves detailed information about a specific scaffolder action, including its schema and examples. Use this to understand how to use an action in a template.',
    schema: {
      input: z =>
        z.object({
          actionId: z
            .string()
            .describe(
              'The unique identifier of the action (e.g., "fetch:plain", "catalog:register"). Use list_software_template_actions to find available action IDs.'
            ),
        }),
      output: z =>
        z.object({
          id: z.string().describe('The unique identifier of the action'),
          description: z
            .string()
            .optional()
            .describe('Description of what this action does'),
          schema: z
            .object({
              input: z.any().optional().describe('JSON Schema for the action input parameters'),
              output: z.any().optional().describe('JSON Schema for the action output'),
            })
            .describe('The input and output schemas for this action'),
          examples: z
            .array(z.any())
            .optional()
            .describe('Example usages of this action, if available'),
        }),
    },
    action: async ({ input, credentials }) => {
      // Get the scaffolder base URL
      const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
      
      // Get the service token for making backend API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'scaffolder',
      });

      // Fetch all actions via HTTP API
      const response = await fetch(`${scaffolderUrl}/v2/actions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch actions: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      const action = data.find((a: any) => a.id === input.actionId);

      if (!action) {
        throw new InputError(
          `No action found with ID "${input.actionId}". Use list_software_template_actions to see available actions.`
        );
      }

      return {
        output: {
          id: action.id,
          description: action.description,
          schema: action.schema || {},
          examples: action.examples || [],
        },
      };
    },
  });

  // List all available template extensions (filters)
  actionsRegistry.register({
    name: 'list_software_template_extensions',
    title: 'List Software Template Extensions',
    description:
      'Lists all available template extensions (filters and functions) that can be used in software templates. Returns the name, type, and description of each extension. Use this to discover what custom filters and functions are available for use in Nunjucks templates.',
    schema: {
      input: z =>
        z.object({
          filter: z
            .string()
            .optional()
            .describe(
              'Optional filter string to match against extension names and descriptions. Only extensions containing this string (case-insensitive) will be returned.'
            ),
        }),
      output: z =>
        z.object({
          extensions: z.array(
            z.object({
              name: z.string().describe('The name of the extension/filter'),
              type: z
                .enum(['filter', 'function', 'value'])
                .describe('The type of the extension (filter function or value)'),
              description: z
                .string()
                .optional()
                .describe('Description of what this extension does'),
            })
          ),
          count: z.number().describe('Total number of extensions returned'),
        }),
    },
    action: async ({ input, credentials }) => {
      // Get the scaffolder base URL
      const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
      
      // Get the service token for making backend API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'scaffolder',
      });

      // Fetch all template extensions via HTTP API
      const response = await fetch(`${scaffolderUrl}/v2/templating-extensions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch template extensions: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      
      // Transform the response structure into a flat list
      const extensions: Array<{ name: string; type: 'filter' | 'function' | 'value'; description?: string }> = [];
      
      // Add filters
      if (data.filters) {
        Object.entries(data.filters).forEach(([name, filterData]: [string, any]) => {
          extensions.push({
            name,
            type: 'filter',
            description: filterData.description,
          });
        });
      }
      
      // Add global functions
      if (data.globals?.functions) {
        Object.entries(data.globals.functions).forEach(([name, funcData]: [string, any]) => {
          extensions.push({
            name,
            type: 'function',
            description: funcData.description,
          });
        });
      }
      
      // Add global values
      if (data.globals?.values) {
        Object.entries(data.globals.values).forEach(([name, valueData]: [string, any]) => {
          extensions.push({
            name,
            type: 'value',
            description: valueData.description,
          });
        });
      }

      // Apply filter if provided
      let filteredExtensions = extensions;
      if (input.filter) {
        const filterLower = input.filter.toLowerCase();
        filteredExtensions = extensions.filter(
          (extension) =>
            extension.name.toLowerCase().includes(filterLower) ||
            extension.type.toLowerCase().includes(filterLower) ||
            (extension.description?.toLowerCase().includes(filterLower) ?? false)
        );
      }

      return {
        output: {
          extensions: filteredExtensions,
          count: filteredExtensions.length,
        },
      };
    },
  });

  // Get details for a specific template extension
  actionsRegistry.register({
    name: 'get_software_template_extension_details',
    title: 'Get Software Template Extension Details',
    description:
      'Retrieves detailed information about a specific template extension (filter or function), including its type, description, and usage examples. Use this to understand how to use an extension in a template.',
    schema: {
      input: z =>
        z.object({
          extensionName: z
            .string()
            .describe(
              'The name of the extension (e.g., "parseRepoUrl", "parseEntityRef"). Use list_software_template_extensions to find available extension names.'
            ),
        }),
      output: z =>
        z.object({
          name: z.string().describe('The name of the extension/filter'),
          type: z
            .enum(['filter', 'function', 'value'])
            .describe('The type of the extension (filter function or value)'),
          description: z
            .string()
            .optional()
            .describe('Description of what this extension does'),
          schema: z
            .any()
            .optional()
            .describe('Schema information for the extension, if available'),
          value: z
            .any()
            .optional()
            .describe('The value, if this is a global value type'),
          examples: z
            .array(z.any())
            .optional()
            .describe('Example usages of this extension, if available'),
        }),
    },
    action: async ({ input, credentials }) => {
      // Get the scaffolder base URL
      const scaffolderUrl = await discovery.getBaseUrl('scaffolder');
      
      // Get the service token for making backend API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'scaffolder',
      });

      // Fetch all template extensions via HTTP API
      const response = await fetch(`${scaffolderUrl}/v2/templating-extensions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch template extensions: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      
      // Search for the extension in filters
      if (data.filters && data.filters[input.extensionName]) {
        const filterData = data.filters[input.extensionName];
        return {
          output: {
            name: input.extensionName,
            type: 'filter' as const,
            description: filterData.description,
            schema: filterData.schema,
            examples: filterData.examples || [],
          },
        };
      }
      
      // Search for the extension in global functions
      if (data.globals?.functions && data.globals.functions[input.extensionName]) {
        const funcData = data.globals.functions[input.extensionName];
        return {
          output: {
            name: input.extensionName,
            type: 'function' as const,
            description: funcData.description,
            schema: funcData.schema,
            examples: funcData.examples || [],
          },
        };
      }
      
      // Search for the extension in global values
      if (data.globals?.values && data.globals.values[input.extensionName]) {
        const valueData = data.globals.values[input.extensionName];
        return {
          output: {
            name: input.extensionName,
            type: 'value' as const,
            description: valueData.description,
            value: valueData.value,
            examples: [],
          },
        };
      }

      throw new InputError(
        `No template extension found with name "${input.extensionName}". Use list_software_template_extensions to see available extensions.`
      );
    },
  });
}

