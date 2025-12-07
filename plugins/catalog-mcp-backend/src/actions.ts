import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';

/**
 * Helper function to handle API errors with detailed logging
 */
async function handleApiError(response: Response, context: string): Promise<never> {
  const errorText = await response.text();
  let errorDetails: any;
  
  try {
    errorDetails = JSON.parse(errorText);
  } catch {
    errorDetails = { rawError: errorText };
  }

  // Create detailed error message
  const errorMessage = {
    context,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    details: errorDetails,
  };

  console.error('[CATALOG MCP] API Error:', JSON.stringify(errorMessage, null, 2));

  throw new InputError(
    `${context}: HTTP ${response.status} ${response.statusText}. ` +
    `Details: ${JSON.stringify(errorDetails, null, 2)}`
  );
}

/**
 * Register MCP actions for Backstage Catalog plugin
 */
export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  discovery: DiscoveryService,
  auth: AuthService
) {
  // Action 1: Get entities by owner
  actionsRegistry.register({
    name: 'get_entities_by_owner',
    title: 'Get Entities by Owner',
    description:
      'Retrieves all catalog entities owned by a specific user or group. Provide the owner reference in format "user:namespace/name" or "group:namespace/name" (e.g., "user:default/john.doe" or "group:default/team-a"). Returns all entities where spec.owner matches the provided owner reference. Useful for finding all resources owned by a team or individual.',
    schema: {
      input: z =>
        z.object({
          owner: z
            .string()
            .describe(
              'Owner reference in format "user:namespace/name" or "group:namespace/name" (e.g., "user:default/john.doe" or "group:default/engineering")'
            ),
        }),
      output: z =>
        z.object({
          entities: z
            .array(z.any())
            .describe('Array of catalog entities matching the owner'),
          count: z.number().describe('Total number of entities found'),
          owner: z.string().describe('The owner reference that was queried'),
        }),
    },
    action: async ({ input, credentials }) => {
      const catalogUrl = await discovery.getBaseUrl('catalog');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'catalog',
      });

      const queryUrl = `${catalogUrl}/entities/by-query?filter=spec.owner=${encodeURIComponent(input.owner)}`;
      console.log('[CATALOG MCP] Fetching entities by owner:', queryUrl);

      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch entities by owner');
      }

      const data = await response.json();
      const entities = data.items || [];

      return {
        output: {
          entities,
          count: entities.length,
          owner: input.owner,
        },
      };
    },
  });

  // Action 2: Get entities by annotation
  actionsRegistry.register({
    name: 'get_entities_by_annotation',
    title: 'Get Entities by Annotation',
    description:
      'Retrieves all catalog entities that have a specific annotation, optionally filtered by annotation value. Annotations are key-value pairs in entity metadata used for categorization and filtering. Provide the annotation key (e.g., "backstage.io/techdocs-ref") and optionally a value. If no value is provided, returns all entities with that annotation key regardless of value. Useful for finding entities tagged with specific annotations like documentation references, source locations, or custom metadata.',
    schema: {
      input: z =>
        z.object({
          annotation: z
            .string()
            .describe(
              'The annotation key to filter by (e.g., "backstage.io/techdocs-ref", "github.com/project-slug")'
            ),
          value: z
            .string()
            .optional()
            .describe(
              'Optional annotation value to match. If provided, only entities with this exact annotation value will be returned. If omitted, all entities with the annotation key are returned.'
            ),
        }),
      output: z =>
        z.object({
          entities: z
            .array(z.any())
            .describe('Array of catalog entities matching the annotation criteria'),
          count: z.number().describe('Total number of entities found'),
          annotation: z.string().describe('The annotation key that was queried'),
          value: z
            .string()
            .optional()
            .describe('The annotation value that was queried, if provided'),
        }),
    },
    action: async ({ input, credentials }) => {
      const catalogUrl = await discovery.getBaseUrl('catalog');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'catalog',
      });

      let filterParam = `metadata.annotations.${input.annotation}`;
      if (input.value) {
        filterParam += `=${encodeURIComponent(input.value)}`;
      }

      const queryUrl = `${catalogUrl}/entities/by-query?filter=${encodeURIComponent(filterParam)}`;
      console.log('[CATALOG MCP] Fetching entities by annotation:', queryUrl);

      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch entities by annotation');
      }

      const data = await response.json();
      const entities = data.items || [];

      return {
        output: {
          entities,
          count: entities.length,
          annotation: input.annotation,
          value: input.value,
        },
      };
    },
  });

  // Action 3: Get entity types for a specific kind
  actionsRegistry.register({
    name: 'get_entity_types_for_kind',
    title: 'Get Entity Types for Kind',
    description:
      'Discovers all entity types available for a specific entity kind in the catalog. Entity kinds (e.g., Component, API, Resource) can have different types (e.g., Components can be "service", "website", "library"). This action returns a deduplicated list of all types found for the specified kind. Useful for understanding the taxonomy of your catalog and what types are in use. For example, query kind="Component" to see all component types like "service", "website", "library", etc.',
    schema: {
      input: z =>
        z.object({
          kind: z
            .string()
            .describe(
              'The entity kind to query (e.g., "Component", "API", "Resource", "Group", "User")'
            ),
        }),
      output: z =>
        z.object({
          types: z
            .array(z.string())
            .describe('Deduplicated list of entity types found for this kind'),
          count: z.number().describe('Total number of unique types found'),
          kind: z.string().describe('The entity kind that was queried'),
        }),
    },
    action: async ({ input, credentials }) => {
      const catalogUrl = await discovery.getBaseUrl('catalog');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'catalog',
      });

      const queryUrl = `${catalogUrl}/entities/by-query?filter=kind=${encodeURIComponent(input.kind)}&fields=spec.type,kind`;
      console.log('[CATALOG MCP] Fetching entity types for kind:', queryUrl);

      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch entity types');
      }

      const data = await response.json();
      const entities = data.items || [];

      // Extract unique types
      const typesSet = new Set<string>();
      entities.forEach((entity: any) => {
        if (entity.spec?.type) {
          typesSet.add(entity.spec.type);
        }
      });

      const types = Array.from(typesSet).sort();

      return {
        output: {
          types,
          count: types.length,
          kind: input.kind,
        },
      };
    },
  });

  // Action 4: Get all entities by kind and type
  actionsRegistry.register({
    name: 'get_all_entities_by_kind_and_type',
    title: 'Get All Entities by Kind and Type',
    description:
      'Retrieves all catalog entities that match both a specific kind and type. This is a refined query that filters entities by two dimensions: kind (e.g., Component, API, Resource) and type (e.g., service, website, library for Components). Useful for targeted queries like "show me all service components" or "list all REST APIs". Returns the full entity data for all matches.',
    schema: {
      input: z =>
        z.object({
          kind: z
            .string()
            .describe(
              'The entity kind to filter by (e.g., "Component", "API", "Resource")'
            ),
          type: z
            .string()
            .describe(
              'The entity type to filter by (e.g., "service", "website", "library" for Components; "openapi", "grpc" for APIs)'
            ),
        }),
      output: z =>
        z.object({
          entities: z
            .array(z.any())
            .describe('Array of catalog entities matching the kind and type criteria'),
          count: z.number().describe('Total number of entities found'),
          kind: z.string().describe('The entity kind that was queried'),
          type: z.string().describe('The entity type that was queried'),
        }),
    },
    action: async ({ input, credentials }) => {
      const catalogUrl = await discovery.getBaseUrl('catalog');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'catalog',
      });

      const queryUrl = `${catalogUrl}/entities/by-query?filter=spec.type=${encodeURIComponent(input.type)},kind=${encodeURIComponent(input.kind)}`;
      console.log('[CATALOG MCP] Fetching entities by kind and type:', queryUrl);

      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch entities by kind and type');
      }

      const data = await response.json();
      const entities = data.items || [];

      return {
        output: {
          entities,
          count: entities.length,
          kind: input.kind,
          type: input.type,
        },
      };
    },
  });

  // Action 5: Get entities with custom query
  actionsRegistry.register({
    name: 'get_entities_with_custom_query',
    title: 'Get Entities with Custom Query',
    description:
      'Performs a flexible custom query against the catalog using arbitrary filter and field parameters. This is the most powerful query action, allowing you to construct complex queries using any combination of filters (e.g., kind, type, owner, annotations, labels, metadata fields) and specify which fields to return. Filters can be combined with commas for AND logic. Use this when the other specialized query actions don\'t fit your needs. Examples: filter by multiple criteria, query custom metadata fields, or return only specific entity fields for performance.',
    schema: {
      input: z =>
        z.object({
          filter: z
            .string()
            .optional()
            .describe(
              'Query filter string. Multiple filters can be comma-separated for AND logic. Examples: "kind=Component", "spec.type=service,kind=Component", "metadata.annotations.github.com/project-slug=myorg/myrepo", "spec.owner=group:default/team-a". Leave empty to query all entities.'
            ),
          fields: z
            .string()
            .optional()
            .describe(
              'Comma-separated list of fields to return in the response. Examples: "kind,metadata.name", "spec.type,kind,metadata.namespace". Leave empty to return full entity data. Useful for performance when you only need specific fields.'
            ),
        }),
      output: z =>
        z.object({
          entities: z
            .array(z.any())
            .describe('Array of catalog entities matching the query criteria'),
          count: z.number().describe('Total number of entities found'),
          filter: z
            .string()
            .optional()
            .describe('The filter that was applied'),
          fields: z
            .string()
            .optional()
            .describe('The fields that were requested'),
        }),
    },
    action: async ({ input, credentials }) => {
      const catalogUrl = await discovery.getBaseUrl('catalog');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'catalog',
      });

      // Build query URL
      const queryParams = new URLSearchParams();
      if (input.filter) {
        queryParams.append('filter', input.filter);
      }
      if (input.fields) {
        queryParams.append('fields', input.fields);
      }

      const queryString = queryParams.toString();
      const queryUrl = `${catalogUrl}/entities/by-query${queryString ? `?${queryString}` : ''}`;
      console.log('[CATALOG MCP] Fetching entities with custom query:', queryUrl);

      const response = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to fetch entities with custom query');
      }

      const data = await response.json();
      const entities = data.items || [];

      return {
        output: {
          entities,
          count: entities.length,
          filter: input.filter,
          fields: input.fields,
        },
      };
    },
  });
}

