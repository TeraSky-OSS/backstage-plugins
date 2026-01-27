# MCP Actions Reference

## Overview

MCP (Model Context Protocol) actions allow Backstage plugins to expose functionality to AI/LLM interfaces. Actions are registered through the **Actions Registry Service** (`actionsRegistryServiceRef`), enabling AI assistants to invoke plugin capabilities in a structured, secure manner.

---

## Actions Registry Service

**Import**: `actionsRegistryServiceRef` from `@backstage/backend-plugin-api/alpha`

**Type**: `typeof actionsRegistryServiceRef.T`

### Plugin Setup

```ts
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { registerMcpActions } from './actions';

export const examplePlugin = createBackendPlugin({
  pluginId: 'example',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        permissions: coreServices.permissions,
      },
      async init({ actionsRegistry, discovery, auth, permissions }) {
        // Register MCP actions
        registerMcpActions(actionsRegistry, discovery, auth, permissions);
      },
    });
  },
});
```

---

## Action Registration

### Basic Structure

Create a separate `actions.ts` file for MCP actions:

```ts
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { DiscoveryService, AuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  discovery: DiscoveryService,
  auth: AuthService
) {
  actionsRegistry.register({
    name: 'get_example_data',
    title: 'Get Example Data',
    description: 'Retrieves example data from the plugin. Use this when you need to...',
    schema: {
      input: z => z.object({
        filter: z.string().optional().describe('Optional filter string'),
        limit: z.number().optional().describe('Maximum items to return'),
      }),
      output: z => z.object({
        items: z.array(z.any()).describe('Array of items'),
        count: z.number().describe('Total items found'),
      }),
    },
    action: async ({ input, credentials }) => {
      // Get auth token for API calls
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'example',
      });

      // Call your plugin API or service
      const baseUrl = await discovery.getBaseUrl('example');
      const response = await fetch(`${baseUrl}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new InputError(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        output: {
          items: data.items || [],
          count: data.items?.length || 0,
        },
      };
    },
  });
}
```

### Action Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique action identifier (use snake_case with plugin prefix) |
| `title` | `string` | Human-readable title |
| `description` | `string` | Clear description for AI to understand when/how to use the action |
| `schema.input` | `(z) => ZodSchema` | Input parameter schema using zod builder |
| `schema.output` | `(z) => ZodSchema` | Output schema using zod builder |
| `action` | `async ({ input, credentials }) => { output }` | Handler function |

### Naming Convention

Use snake_case with action verbs:

```ts
// Pattern: <verb>_<plugin>_<resource>
'get_catalog_entities_by_owner'
'get_educates_workshops'
'request_educates_workshop_session'
'get_spectrocloud_health_for_cluster'
'find_spectrocloud_clusters_for_profile'
```

---

## Authentication in MCP Actions

### ⚠️ CRITICAL: Always Handle Credentials

The `credentials` parameter is passed to action handlers automatically from the MCP request context. **Always use these credentials** for downstream API calls to preserve the user's identity and permissions.

```ts
action: async ({ input, credentials }) => {
  // Get service credentials as fallback
  const serviceCredentials = await auth.getOwnServiceCredentials();
  
  // Get token for downstream plugin calls - ALWAYS use onBehalfOf
  const { token } = await auth.getPluginRequestToken({
    onBehalfOf: credentials || serviceCredentials,
    targetPluginId: 'catalog', // Target plugin you're calling
  });

  // Use token in API calls
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  // ...
}
```

### Why This Matters

1. **User identity preservation** - The token carries the original user's identity
2. **Permission enforcement** - Downstream services can enforce their own permissions
3. **Audit trails** - Actions are traceable to the invoking user
4. **Service-to-service auth** - Proper token exchange between plugins

---

## Integrating Permissions with MCP Actions

For sensitive operations, add explicit permission checks at the action level.

### Define Permissions in Common Package

```ts
// plugins/example-common/src/permissions.ts
import { createPermission } from '@backstage/plugin-permission-common';

export const exampleViewPermission = createPermission({
  name: 'example.view',
  attributes: { action: 'read' },
});

export const exampleCreatePermission = createPermission({
  name: 'example.create',
  attributes: { action: 'create' },
});

export const exampleDeletePermission = createPermission({
  name: 'example.delete',
  attributes: { action: 'delete' },
});

export const examplePermissions = [
  exampleViewPermission,
  exampleCreatePermission,
  exampleDeletePermission,
];
```

### Register Permissions in Plugin

```ts
import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { examplePermissions } from '@internal/backstage-plugin-example-common';

export const examplePlugin = createBackendPlugin({
  pluginId: 'example',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        auth: coreServices.auth,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
      },
      async init({ actionsRegistry, auth, permissions, permissionsRegistry }) {
        // Register all plugin permissions
        permissionsRegistry.addPermissions(examplePermissions);
        
        // Register MCP actions with permission checking
        registerMcpActions(actionsRegistry, auth, permissions);
      },
    });
  },
});
```

### Check Permissions in Actions

```ts
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError, NotAllowedError } from '@backstage/errors';
import { 
  exampleViewPermission,
  exampleDeletePermission 
} from '@internal/backstage-plugin-example-common';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  auth: AuthService,
  permissions: PermissionsService
) {
  // Read action with permission check
  actionsRegistry.register({
    name: 'get_example_items',
    title: 'Get Example Items',
    description: 'Returns a list of items from the example plugin',
    schema: {
      input: z => z.object({
        filter: z.string().optional().describe('Filter by name'),
      }),
      output: z => z.object({
        items: z.array(z.any()).describe('List of items'),
      }),
    },
    action: async ({ input, credentials }) => {
      // Permission check
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const decision = await permissions.authorize(
        [{ permission: exampleViewPermission }],
        { credentials: credentials || serviceCredentials }
      );

      if (decision[0].result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError('Permission denied: cannot view example items');
      }

      // Proceed with authorized operation
      const items = await fetchItems(input.filter);
      return { output: { items } };
    },
  });

  // Sensitive action with stricter permission check
  actionsRegistry.register({
    name: 'delete_example_item',
    title: 'Delete Example Item',
    description: 'Deletes an item from the example plugin',
    schema: {
      input: z => z.object({
        id: z.string().describe('The item ID to delete'),
      }),
      output: z => z.object({
        success: z.boolean().describe('Whether deletion succeeded'),
        deletedId: z.string().describe('The deleted item ID'),
      }),
    },
    action: async ({ input, credentials }) => {
      const serviceCredentials = await auth.getOwnServiceCredentials();
      
      // DELETE is sensitive - require strict permission
      const decision = await permissions.authorize(
        [{ permission: exampleDeletePermission }],
        { credentials: credentials || serviceCredentials }
      );

      if (decision[0].result !== AuthorizeResult.ALLOW) {
        throw new NotAllowedError('Permission denied: cannot delete items');
      }

      await deleteItem(input.id);
      return { 
        output: { 
          success: true, 
          deletedId: input.id 
        } 
      };
    },
  });
}
```

### Resource-Based Permissions

For fine-grained permissions on specific resources:

```ts
action: async ({ input, credentials }) => {
  const serviceCredentials = await auth.getOwnServiceCredentials();
  
  // Check permission for specific resource
  const decision = await permissions.authorize(
    [{ 
      permission: portalViewPermission, 
      resourceRef: input.portalName  // The specific resource
    }],
    { credentials: credentials || serviceCredentials }
  );

  if (decision[0].result !== AuthorizeResult.ALLOW) {
    throw new InputError('Access denied. You do not have permission to view this portal.');
  }

  // Proceed with authorized operation
  const data = await service.getData(input.portalName);
  return { output: { data } };
}
```

---

## Reusing Plugin Services

MCP actions should reuse existing service classes rather than duplicating logic:

```ts
// src/service/ExampleService.ts
export class ExampleService {
  constructor(
    private readonly config: Config,
    private readonly logger: LoggerService,
  ) {}

  async list(filter?: string): Promise<Item[]> {
    // Business logic here
  }

  async create(data: CreateItemInput, owner: string): Promise<Item> {
    // Business logic here
  }

  async delete(id: string): Promise<void> {
    // Business logic here
  }
}

// src/plugin.ts
export const examplePlugin = createBackendPlugin({
  pluginId: 'example',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        actionsRegistry: actionsRegistryServiceRef,
        auth: coreServices.auth,
        permissions: coreServices.permissions,
      },
      async init({ config, logger, actionsRegistry, auth, permissions }) {
        // Create service instance
        const service = new ExampleService(config, logger);
        
        // Register MCP actions that use the service
        registerMcpActions(actionsRegistry, service, auth, permissions);
      },
    });
  },
});

// src/actions.ts
export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: ExampleService,
  auth: AuthService,
  permissions: PermissionsService
) {
  actionsRegistry.register({
    name: 'get_example_items',
    // ...
    action: async ({ input, credentials }) => {
      // Auth/permission checks...
      
      // Reuse service logic
      const items = await service.list(input.filter);
      return { output: { items } };
    },
  });
}
```

---

## Error Handling

Use Backstage error types for consistent error handling:

```ts
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';

action: async ({ input, credentials }) => {
  try {
    // Permission check
    const decision = await permissions.authorize(...);
    if (decision[0].result !== AuthorizeResult.ALLOW) {
      throw new NotAllowedError('Permission denied');
    }

    // Input validation
    if (!input.id) {
      throw new InputError('Item ID is required');
    }

    // Business logic
    const item = await service.get(input.id);
    if (!item) {
      throw new InputError(`Item not found: ${input.id}`);
    }

    return { output: { item } };
  } catch (error) {
    // Re-throw known error types
    if (error instanceof InputError || error instanceof NotAllowedError) {
      throw error;
    }
    // Wrap unknown errors
    throw new InputError(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### API Error Helper

For actions that call external APIs:

```ts
async function handleApiError(response: Response, context: string): Promise<never> {
  const errorText = await response.text();
  let errorDetails: any;
  
  try {
    errorDetails = JSON.parse(errorText);
  } catch {
    errorDetails = { rawError: errorText };
  }

  console.error(`[PLUGIN MCP] API Error:`, {
    context,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    details: errorDetails,
  });

  throw new InputError(
    `${context}: HTTP ${response.status} ${response.statusText}. ` +
    `Details: ${JSON.stringify(errorDetails, null, 2)}`
  );
}

// Usage in action
action: async ({ input, credentials }) => {
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch items');
  }
  
  const data = await response.json();
  return { output: { items: data.items } };
}
```

---

## Schema Best Practices

### Descriptive Field Descriptions

Provide clear descriptions for AI to understand each field:

```ts
schema: {
  input: z => z.object({
    owner: z
      .string()
      .describe(
        'Owner reference in format "user:namespace/name" or "group:namespace/name" ' +
        '(e.g., "user:default/john.doe" or "group:default/engineering")'
      ),
    kind: z
      .string()
      .describe(
        'The entity kind to filter by (e.g., "Component", "API", "Resource")'
      ),
    limit: z
      .number()
      .optional()
      .describe('Maximum items to return (default: 50)'),
  }),
  output: z => z.object({
    entities: z
      .array(z.any())
      .describe('Array of catalog entities matching the query'),
    count: z
      .number()
      .describe('Total number of entities found'),
  }),
}
```

### Action Descriptions

Write descriptions that help AI understand when to use the action:

```ts
actionsRegistry.register({
  name: 'get_entities_by_owner',
  title: 'Get Entities by Owner',
  description:
    'Retrieves all catalog entities owned by a specific user or group. ' +
    'Provide the owner reference in format "user:namespace/name" or "group:namespace/name" ' +
    '(e.g., "user:default/john.doe" or "group:default/team-a"). ' +
    'Returns all entities where spec.owner matches the provided owner reference. ' +
    'Useful for finding all resources owned by a team or individual.',
  // ...
});
```

---

## Complete Example

```ts
// src/actions.ts
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { PermissionsService, AuthService, DiscoveryService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { InputError, NotAllowedError } from '@backstage/errors';
import { 
  itemViewPermission,
  itemCreatePermission 
} from '@internal/backstage-plugin-example-common';
import { ExampleService } from './service/ExampleService';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: ExampleService,
  discovery: DiscoveryService,
  auth: AuthService,
  permissions: PermissionsService
) {
  // List items action
  actionsRegistry.register({
    name: 'get_example_items',
    title: 'Get Example Items',
    description: 
      'Returns a list of items from the example plugin. ' +
      'Can optionally filter by name pattern and limit results.',
    schema: {
      input: z => z.object({
        filter: z.string().optional().describe('Filter items by name (partial match)'),
        limit: z.number().optional().describe('Maximum items to return'),
      }),
      output: z => z.object({
        items: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
        })).describe('List of matching items'),
        count: z.number().describe('Total items returned'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        // Permission check
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: itemViewPermission }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new NotAllowedError('Permission denied: cannot view items');
        }

        // Use service
        const items = await service.list(input.filter, input.limit);
        
        return {
          output: {
            items,
            count: items.length,
          },
        };
      } catch (error) {
        if (error instanceof NotAllowedError || error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get items: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Create item action
  actionsRegistry.register({
    name: 'create_example_item',
    title: 'Create Example Item',
    description: 'Creates a new item in the example plugin',
    schema: {
      input: z => z.object({
        name: z.string().describe('Name of the item'),
        type: z.string().describe('Type of item (e.g., "service", "library")'),
        description: z.string().optional().describe('Optional description'),
      }),
      output: z => z.object({
        item: z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
        }).describe('The created item'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        // Permission check for create
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: itemCreatePermission }],
          { credentials: credentials || serviceCredentials }
        );

        if (decision[0].result !== AuthorizeResult.ALLOW) {
          throw new NotAllowedError('Permission denied: cannot create items');
        }

        // Use service to create
        const item = await service.create({
          name: input.name,
          type: input.type,
          description: input.description,
        });
        
        return { output: { item } };
      } catch (error) {
        if (error instanceof NotAllowedError || error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to create item: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}
```

---

## Key Points Summary

1. **Use `actionsRegistryServiceRef` from `@backstage/backend-plugin-api/alpha`**
2. **Always use credentials from action handler** for downstream API calls via `auth.getPluginRequestToken({ onBehalfOf: credentials })`
3. **Add permission checks for sensitive operations** using `permissions.authorize()`
4. **Reuse existing service classes** - don't duplicate business logic in actions
5. **Write descriptive descriptions** - AI needs good context to use actions correctly
6. **Use Backstage error types** - `InputError`, `NotAllowedError`, `NotFoundError`
7. **Keep actions focused** - one action per operation, use snake_case naming

---

## External References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Backstage Permission Framework](https://backstage.io/docs/permissions/overview)
- [Backend Plugin API](https://backstage.io/docs/reference/backend-plugin-api/)
