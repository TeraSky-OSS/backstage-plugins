import type { AvailableAction } from '../types';

/**
 * Generate a JSON Schema for Backstage templates with IntelliSense support
 */
export function generateTemplateSchema(availableActions: AvailableAction[]) {
  // Extract action IDs for enum values
  const actionIds = availableActions.map(a => a.id);
  
  // Build action-specific input schemas
  const actionInputSchemas: Record<string, any> = {};
  availableActions.forEach(action => {
    if (action.schema?.input?.properties) {
      actionInputSchemas[action.id] = {
        type: 'object',
        properties: action.schema.input.properties,
        required: action.schema.input.required || [],
      };
    }
  });

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['apiVersion', 'kind', 'metadata', 'spec'],
    properties: {
      apiVersion: {
        type: 'string',
        const: 'scaffolder.backstage.io/v1beta3',
        description: 'The API version of the Backstage scaffolder',
      },
      kind: {
        type: 'string',
        const: 'Template',
        description: 'The kind of entity (must be Template)',
      },
      metadata: {
        type: 'object',
        required: ['name', 'title'],
        properties: {
          name: {
            type: 'string',
            description: 'Unique identifier for the template',
            pattern: '^[a-z0-9-]+$',
          },
          title: {
            type: 'string',
            description: 'Human-readable title for the template',
          },
          description: {
            type: 'string',
            description: 'Brief description of what this template does',
          },
          tags: {
            type: 'array',
            description: 'Tags for categorizing the template',
            items: {
              type: 'string',
            },
          },
          labels: {
            type: 'object',
            description: 'Key-value labels for the template',
            additionalProperties: {
              type: 'string',
            },
          },
          annotations: {
            type: 'object',
            description: 'Key-value annotations for the template',
            additionalProperties: {
              type: 'string',
            },
          },
        },
      },
      spec: {
        type: 'object',
        required: ['parameters', 'steps'],
        properties: {
          owner: {
            type: 'string',
            description: 'Owner of the template (e.g., user:default/guest)',
            default: 'user:default/guest',
          },
          type: {
            type: 'string',
            description: 'Type of component this template creates',
            enum: ['service', 'website', 'library', 'documentation', 'other'],
            default: 'service',
          },
          parameters: {
            type: 'array',
            description: 'Steps for collecting user input',
            items: {
              type: 'object',
              required: ['title', 'properties'],
              properties: {
                title: {
                  type: 'string',
                  description: 'Title for this parameter step',
                },
                description: {
                  type: 'string',
                  description: 'Description for this parameter step',
                },
                required: {
                  type: 'array',
                  description: 'List of required field names',
                  items: {
                    type: 'string',
                  },
                },
                properties: {
                  type: 'object',
                  description: 'Field definitions for user input',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      type: { 
                        type: 'string',
                        enum: ['string', 'number', 'integer', 'boolean', 'array', 'object'],
                      },
                      description: { type: 'string' },
                      default: {},
                      enum: { type: 'array' },
                      'ui:field': { 
                        type: 'string',
                        description: 'Custom field extension to use',
                      },
                      'ui:widget': { 
                        type: 'string',
                        enum: ['password', 'textarea', 'email', 'uri', 'date', 'datetime'],
                      },
                      'ui:options': { 
                        type: 'object',
                        description: 'UI-specific options',
                      },
                      'ui:help': { type: 'string' },
                      'ui:placeholder': { type: 'string' },
                    },
                  },
                },
                dependencies: {
                  type: 'object',
                  description: 'Field dependencies',
                },
              },
            },
          },
          steps: {
            type: 'array',
            description: 'Workflow steps to execute',
            items: {
              type: 'object',
              required: ['id', 'name', 'action'],
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique identifier for this step (used in expressions)',
                  pattern: '^[a-zA-Z0-9-_]+$',
                },
                name: {
                  type: 'string',
                  description: 'Human-readable name for this step',
                },
                action: {
                  type: 'string',
                  description: 'Action to execute',
                  enum: actionIds,
                },
                input: {
                  type: 'object',
                  description: 'Input parameters for the action. Use ${{ parameters.fieldName }} or ${{ steps.stepId.output.property }}',
                  additionalProperties: true,
                },
                if: {
                  type: 'string',
                  description: 'Conditional expression for step execution',
                  examples: [
                    '${{ parameters.createRepo === true }}',
                    '${{ steps.fetch.output.success }}',
                  ],
                },
              },
            },
          },
          output: {
            type: 'object',
            description: 'Template output displayed after execution',
            properties: {
              links: {
                type: 'array',
                description: 'Links to display',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { 
                      type: 'string',
                      description: 'URL (can use expressions like ${{ steps.publish.output.remoteUrl }})',
                    },
                    icon: { 
                      type: 'string',
                      description: 'Icon name (e.g., github, dashboard)',
                    },
                    entityRef: { 
                      type: 'string',
                      description: 'Entity reference',
                    },
                  },
                },
              },
              text: {
                type: 'array',
                description: 'Text content to display',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { 
                      type: 'string',
                      description: 'Text content (can use expressions)',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Get common Backstage expression examples for IntelliSense
 */
export function getExpressionExamples() {
  return {
    parameters: [
      '${{ parameters.name }}',
      '${{ parameters.description }}',
      '${{ parameters.owner }}',
    ],
    steps: [
      '${{ steps.fetch.output.remoteUrl }}',
      '${{ steps.publish.output.entityRef }}',
      '${{ steps.register.output.catalogInfoUrl }}',
    ],
    conditionals: [
      '${{ parameters.createRepo === true }}',
      '${{ parameters.visibility === "public" }}',
      '${{ steps.fetch.output.success }}',
    ],
  };
}
