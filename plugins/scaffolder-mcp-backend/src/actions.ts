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
}

