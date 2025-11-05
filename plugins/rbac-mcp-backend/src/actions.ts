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

  console.error('[RBAC MCP] API Error:', JSON.stringify(errorMessage, null, 2));

  throw new InputError(
    `${context}: HTTP ${response.status} ${response.statusText}. ` +
    `Details: ${JSON.stringify(errorDetails, null, 2)}`
  );
}

/**
 * Register MCP actions for Backstage RBAC plugin
 */
export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  discovery: DiscoveryService,
  auth: AuthService
) {
  // Action 1: List all RBAC roles
  actionsRegistry.register({
    name: 'list_rbac_roles',
    title: 'List RBAC Roles',
    description:
      'Lists all role-based access control (RBAC) roles defined in Backstage. Returns role names, members (users/groups), descriptions, and source (where the role is defined: REST API, CSV file, configuration, or legacy). Use this to discover what roles exist in your Backstage instance before managing permissions or memberships.',
    schema: {
      input: z => z.object({}).strict(),
      output: z =>
        z.object({
          roles: z.array(
            z.object({
              name: z
                .string()
                .describe(
                  'The full role reference in format "role:namespace/name" (e.g., "role:default/admin")'
                ),
              memberReferences: z
                .array(z.string())
                .describe(
                  'Array of users and groups assigned to this role. Format: "user:namespace/name" or "group:namespace/name"'
                ),
              description: z
                .string()
                .optional()
                .nullable()
                .describe('Human-readable description of the role purpose'),
              source: z
                .string()
                .describe(
                  'Where this role is defined: "rest" (REST API), "csv-file" (CSV file), "configuration" (app-config.yaml), or "legacy" (pre-v2.1.3)'
                ),
            })
          ),
          count: z.number().describe('Total number of roles'),
        }),
    },
    action: async ({ credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      const response = await fetch(`${permissionUrl}/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch roles: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const roles = await response.json();

      return {
        output: {
          roles: roles.map((role: any) => ({
            name: role.name,
            memberReferences: role.memberReferences || [],
            description: role.metadata?.description,
            source: role.metadata?.source || 'unknown',
          })),
          count: roles.length,
        },
      };
    },
  });

  // Action 2: Get detailed information about a specific role
  actionsRegistry.register({
    name: 'get_role_details',
    title: 'Get Role Details',
    description:
      'Retrieves comprehensive information about a specific RBAC role including its members, permission policies, and conditional policies. This combines role metadata, assigned members, and all associated permissions into a single response. Use this to understand what a role can do and who has it. Provide the role reference in format "kind:namespace/name" (e.g., "role:default/developers").',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .describe(
              'The role reference in format "kind:namespace/name" (e.g., "role:default/admin" or "role:default/developers"). Use list_rbac_roles to find available role references.'
            ),
        }),
      output: z =>
        z.object({
          role: z.object({
            name: z.string().describe('The full role reference'),
            memberReferences: z
              .array(z.string())
              .describe('Users and groups that have this role'),
            description: z
              .string()
              .optional()
              .nullable()
              .describe('Role description'),
            source: z.string().describe('Where the role is defined'),
          }),
          permissions: z
            .array(
              z.object({
                permission: z
                  .string()
                  .describe(
                    'Permission identifier (e.g., "catalog-entity", "catalog.entity.create")'
                  ),
                policy: z
                  .string()
                  .describe('Policy action: "create", "read", "update", "delete", or "use"'),
                effect: z
                  .enum(['allow', 'deny'])
                  .describe('Whether this permission is allowed or denied'),
                source: z.string().describe('Where this permission is defined'),
              })
            )
            .describe('All permission policies assigned to this role'),
          conditionalPolicies: z
            .array(
              z.object({
                id: z.number().describe('Unique identifier for this conditional policy'),
                pluginId: z.string().describe('Plugin this condition applies to'),
                resourceType: z.string().describe('Resource type being controlled'),
                permissionMapping: z
                  .array(z.string())
                  .describe('Policies this condition applies to (e.g., ["read", "update"])'),
                conditions: z
                  .any()
                  .describe(
                    'The conditional rules (e.g., IS_ENTITY_OWNER, HAS_ANNOTATION). Can include anyOf/allOf logic.'
                  ),
              })
            )
            .describe('Conditional permission policies for fine-grained access control'),
          permissionCount: z.number().describe('Total number of permission policies'),
          conditionalPolicyCount: z.number().describe('Total number of conditional policies'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      // Parse the role reference
      const roleRefParts = input.roleRef.split(':');
      if (roleRefParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "kind:namespace/name" (e.g., "role:default/admin")`
        );
      }
      
      const [kind, namespaceName] = roleRefParts;
      const nameParts = namespaceName.split('/');
      if (nameParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "kind:namespace/name" (e.g., "role:default/admin")`
        );
      }
      
      const [namespace, name] = nameParts;

      // Fetch role information
      const roleResponse = await fetch(
        `${permissionUrl}/roles/${kind}/${namespace}/${name}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!roleResponse.ok) {
        const errorText = await roleResponse.text();
        throw new Error(
          `Failed to fetch role: ${roleResponse.status} ${roleResponse.statusText} - ${errorText}`
        );
      }

      const roleData = await roleResponse.json();
      const role = Array.isArray(roleData) ? roleData[0] : roleData;

      // Fetch permissions for this role
      const permissionsResponse = await fetch(
        `${permissionUrl}/policies/${kind}/${namespace}/${name}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let permissions = [];
      if (permissionsResponse.ok) {
        permissions = await permissionsResponse.json();
      }

      // Fetch conditional policies
      const conditionsResponse = await fetch(`${permissionUrl}/roles/conditions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let allConditionalPolicies = [];
      if (conditionsResponse.ok) {
        allConditionalPolicies = await conditionsResponse.json();
      }

      // Filter conditional policies for this role
      const conditionalPolicies = allConditionalPolicies.filter(
        (policy: any) => policy.roleEntityRef === input.roleRef
      );

      return {
        output: {
          role: {
            name: role.name,
            memberReferences: role.memberReferences || [],
            description: role.metadata?.description,
            source: role.metadata?.source || 'unknown',
          },
          permissions: permissions.map((perm: any) => ({
            permission: perm.permission,
            policy: perm.policy,
            effect: perm.effect,
            source: perm.metadata?.source || 'unknown',
          })),
          conditionalPolicies: conditionalPolicies.map((policy: any) => ({
            id: policy.id,
            pluginId: policy.pluginId,
            resourceType: policy.resourceType,
            permissionMapping: policy.permissionMapping || [],
            conditions: policy.conditions,
          })),
          permissionCount: permissions.length,
          conditionalPolicyCount: conditionalPolicies.length,
        },
      };
    },
  });

  // Action 3: List available permissions from all plugins
  actionsRegistry.register({
    name: 'list_available_permissions',
    title: 'List Available Permissions',
    description:
      'Discovers all permissions available in your Backstage instance from installed plugins. Returns permissions grouped by plugin, showing permission names, policy types (create/read/update/delete/use), and resource types. Use this to understand what permissions can be granted to roles before assigning them. Essential for building permission policies intelligently.',
    schema: {
      input: z =>
        z.object({
          pluginId: z
            .string()
            .optional()
            .describe(
              'Optional filter to show permissions from a specific plugin only (e.g., "catalog", "scaffolder", "permission")'
            ),
        }),
      output: z =>
        z.object({
          plugins: z.array(
            z.object({
              pluginId: z.string().describe('Unique identifier of the plugin'),
              policies: z
                .array(
                  z.object({
                    name: z
                      .string()
                      .describe('Permission name (e.g., "catalog.entity.read")'),
                    policy: z
                      .string()
                      .describe('Policy action type: create, read, update, delete, or use'),
                    resourceType: z
                      .string()
                      .optional()
                      .describe(
                        'Resource type this permission applies to (e.g., "catalog-entity")'
                      ),
                  })
                )
                .describe('List of permissions provided by this plugin'),
            })
          ),
          count: z.number().describe('Total number of plugins with permissions'),
          totalPermissions: z
            .number()
            .describe('Total number of individual permissions across all plugins'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      const response = await fetch(`${permissionUrl}/plugins/policies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch plugin permissions: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      let plugins = await response.json();

      // Filter by pluginId if provided
      if (input.pluginId) {
        plugins = plugins.filter((p: any) => p.pluginId === input.pluginId);
      }

      const totalPermissions = plugins.reduce(
        (sum: number, p: any) => sum + (p.policies?.length || 0),
        0
      );

      return {
        output: {
          plugins: plugins.map((plugin: any) => ({
            pluginId: plugin.pluginId,
            policies: plugin.policies || [],
          })),
          count: plugins.length,
          totalPermissions,
        },
      };
    },
  });

  // Action 4: Grant role to members (create role if needed)
  actionsRegistry.register({
    name: 'grant_role_to_members',
    title: 'Grant Role to Members',
    description:
      'Assigns users or groups to an RBAC role, creating the role if it doesn\'t exist. This is a high-level action that handles both new and existing roles. Provide member references in format "user:namespace/name" or "group:namespace/name". If the role exists, members are added to it. If the role doesn\'t exist, it is created with the specified members and description. Use this for workflows like "give the developers team the editor role".',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .describe(
              'Role reference in format "role:namespace/name" (e.g., "role:default/developers"). Will be created if it doesn\'t exist.'
            ),
          members: z
            .array(z.string())
            .min(1)
            .describe(
              'Array of user or group references to add to the role. Format: "user:namespace/name" or "group:namespace/name" (e.g., ["user:default/john", "group:default/team-a"])'
            ),
          description: z
            .string()
            .optional()
            .describe(
              'Optional description for the role. Only used when creating a new role, ignored for existing roles.'
            ),
        }),
      output: z =>
        z.object({
          roleRef: z.string().describe('The role reference that was updated or created'),
          created: z
            .boolean()
            .describe('True if the role was newly created, false if it already existed'),
          memberReferences: z
            .array(z.string())
            .describe('Current list of all members in the role after this operation'),
          memberCount: z.number().describe('Total number of members in the role'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      // Parse the role reference
      const roleRefParts = input.roleRef.split(':');
      if (roleRefParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
        );
      }
      
      const [kind, namespaceName] = roleRefParts;
      const nameParts = namespaceName.split('/');
      if (nameParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
        );
      }
      
      const [namespace, name] = nameParts;

      // Check if role exists
      const checkResponse = await fetch(
        `${permissionUrl}/roles/${kind}/${namespace}/${name}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let created = false;
      let currentMembers: string[] = [];

      if (checkResponse.ok) {
        // Role exists - update it
        const roleData = await checkResponse.json();
        const role = Array.isArray(roleData) ? roleData[0] : roleData;
        currentMembers = role.memberReferences || [];

        // Merge new members with existing ones
        const allMembers = Array.from(new Set([...currentMembers, ...input.members]));

        const updateResponse = await fetch(
          `${permissionUrl}/roles/${kind}/${namespace}/${name}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              oldRole: {
                memberReferences: currentMembers,
                name: input.roleRef,
                metadata: {
                  description: role.metadata?.description,
                },
              },
              newRole: {
                memberReferences: allMembers,
                name: input.roleRef,
                metadata: {
                  description: role.metadata?.description,
                },
              },
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(
            `Failed to update role: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`
          );
        }

        currentMembers = allMembers;
      } else if (checkResponse.status === 404) {
        // Role doesn't exist - create it
        const createResponse = await fetch(`${permissionUrl}/roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            memberReferences: input.members,
            name: input.roleRef,
            metadata: {
              description: input.description || '',
            },
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = errorText;
          }
          throw new Error(
            `Failed to create role: ${createResponse.status} ${createResponse.statusText} - ${JSON.stringify(errorDetails)}`
          );
        }

        created = true;
        currentMembers = input.members;
      } else {
        const errorText = await checkResponse.text();
        throw new Error(
          `Failed to check role existence: ${checkResponse.status} ${checkResponse.statusText} - ${errorText}`
        );
      }

      return {
        output: {
          roleRef: input.roleRef,
          created,
          memberReferences: currentMembers,
          memberCount: currentMembers.length,
        },
      };
    },
  });

  // Action 5: Assign permissions to a role
  actionsRegistry.register({
    name: 'assign_permissions_to_role',
    title: 'Assign Permissions to Role',
    description:
      'Grants one or more permission policies to an RBAC role. Each permission specifies what can be done (policy: create/read/update/delete/use) with which resource (permission identifier) and whether it\'s allowed or denied (effect). The role must already exist (use grant_role_to_members to create it first). Use this for workflows like "let the editors role create and update catalog entities". Permissions are additive - this action adds new permissions without removing existing ones.',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .describe(
              'Role reference in format "role:namespace/name". The role must already exist.'
            ),
          permissions: z
            .array(
              z.object({
                permission: z
                  .string()
                  .describe(
                    'Permission identifier from a plugin (e.g., "catalog-entity" for all catalog operations, or "catalog.entity.create" for specific operation). Use list_available_permissions to discover valid permission identifiers.'
                  ),
                policy: z
                  .enum(['create', 'read', 'update', 'delete', 'use'])
                  .describe(
                    'The policy action type: "create" (create resources), "read" (view resources), "update" (modify resources), "delete" (remove resources), or "use" (execute/use resources)'
                  ),
                effect: z
                  .enum(['allow', 'deny'])
                  .describe(
                    'Whether to allow or deny this permission. "allow" grants access, "deny" explicitly blocks it.'
                  ),
              })
            )
            .min(1)
            .describe('Array of permission policies to assign to the role'),
        }),
      output: z =>
        z.object({
          roleRef: z.string().describe('The role that was updated'),
          addedPermissions: z.number().describe('Number of permissions that were added'),
          permissions: z
            .array(
              z.object({
                permission: z.string(),
                policy: z.string(),
                effect: z.string(),
              })
            )
            .describe('The permissions that were added'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      // Parse the role reference to verify role exists
      const roleRefParts = input.roleRef.split(':');
      if (roleRefParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
        );
      }
      
      const [kind, namespaceName] = roleRefParts;
      const nameParts = namespaceName.split('/');
      if (nameParts.length !== 2) {
        throw new InputError(
          `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
        );
      }
      
      const [namespace, name] = nameParts;

      // Verify the role exists first
      const checkResponse = await fetch(
        `${permissionUrl}/roles/${kind}/${namespace}/${name}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!checkResponse.ok) {
        if (checkResponse.status === 404) {
          throw new InputError(
            `Role "${input.roleRef}" does not exist. Create it first using grant_role_to_members.`
          );
        }
        const errorText = await checkResponse.text();
        throw new Error(
          `Failed to verify role existence: ${checkResponse.status} ${checkResponse.statusText} - ${errorText}`
        );
      }

      // Assign the permissions
      const response = await fetch(`${permissionUrl}/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          input.permissions.map(perm => ({
            entityReference: input.roleRef,
            permission: perm.permission,
            policy: perm.policy,
            effect: perm.effect,
          }))
        ),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }
        throw new Error(
          `Failed to assign permissions: ${response.status} ${response.statusText} - ${JSON.stringify(errorDetails)}`
        );
      }

      return {
        output: {
          roleRef: input.roleRef,
          addedPermissions: input.permissions.length,
          permissions: input.permissions,
        },
      };
    },
  });

  // Action 6: Create conditional permission
  actionsRegistry.register({
    name: 'create_conditional_permission',
    title: 'Create Conditional Permission',
    description:
      'Creates a fine-grained conditional access policy for a role. Conditional permissions allow you to grant access based on specific criteria, such as "users can only read entities they own" or "users can only see entities with a specific annotation". This is more powerful than simple allow/deny permissions. The conditions use rules like IS_ENTITY_OWNER, HAS_ANNOTATION, IS_ENTITY_KIND, etc. You can combine multiple conditions with anyOf (OR logic) or allOf (AND logic). Use list_conditional_rules to discover available rule types and their parameters.',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .describe('Role reference in format "role:namespace/name"'),
          pluginId: z
            .string()
            .describe(
              'Plugin identifier (e.g., "catalog", "scaffolder"). The plugin this conditional permission applies to.'
            ),
          resourceType: z
            .string()
            .describe(
              'Resource type this condition controls (e.g., "catalog-entity", "scaffolder-template")'
            ),
          permissionMapping: z
            .array(z.enum(['create', 'read', 'update', 'delete', 'use']))
            .min(1)
            .describe(
              'Array of policy actions this condition applies to (e.g., ["read", "update"] means the condition applies when users try to read or update)'
            ),
          conditions: z
            .any()
            .describe(
              'Conditional rule object. Simple form: { rule: "IS_ENTITY_OWNER", resourceType: "catalog-entity", params: { claims: ["group:default/team-a"] } }. ' +
                'Complex form with logic: { anyOf: [{ rule: "IS_ENTITY_OWNER", ... }, { rule: "HAS_ANNOTATION", ... }] } or { allOf: [...] }. ' +
                'Use list_conditional_rules to see available rules and their required parameters.'
            ),
        }),
      output: z =>
        z.object({
          id: z.number().describe('Unique ID of the created conditional policy'),
          roleRef: z.string().describe('The role this condition is attached to'),
          pluginId: z.string().describe('Plugin this condition applies to'),
          resourceType: z.string().describe('Resource type being controlled'),
          permissionMapping: z
            .array(z.string())
            .describe('Policies this condition applies to'),
          conditions: z.any().describe('The conditional rules that were created'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      const response = await fetch(`${permissionUrl}/roles/conditions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          result: 'CONDITIONAL',
          roleEntityRef: input.roleRef,
          pluginId: input.pluginId,
          resourceType: input.resourceType,
          permissionMapping: input.permissionMapping,
          conditions: input.conditions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create conditional permission: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();

      return {
        output: {
          id: result.id,
          roleRef: input.roleRef,
          pluginId: input.pluginId,
          resourceType: input.resourceType,
          permissionMapping: input.permissionMapping,
          conditions: input.conditions,
        },
      };
    },
  });

  // Action 7: List conditional rules
  actionsRegistry.register({
    name: 'list_conditional_rules',
    title: 'List Conditional Rules',
    description:
      'Discovers all available conditional rule types that can be used when creating conditional permissions. Returns rule definitions including their names, descriptions, resource types they apply to, and JSON schemas for their parameters. Common rules include IS_ENTITY_OWNER (entity ownership checks), HAS_ANNOTATION (annotation-based access), HAS_LABEL (label-based access), IS_ENTITY_KIND (entity kind filtering), HAS_METADATA/HAS_SPEC (metadata/spec field matching). Use this before creating conditional permissions to understand what conditions are available and what parameters they require.',
    schema: {
      input: z =>
        z.object({
          pluginId: z
            .string()
            .optional()
            .describe(
              'Optional filter to show rules from a specific plugin only (e.g., "catalog")'
            ),
        }),
      output: z =>
        z.object({
          plugins: z.array(
            z.object({
              pluginId: z.string().describe('Plugin identifier'),
              rules: z
                .array(
                  z.object({
                    name: z
                      .string()
                      .describe(
                        'Rule name (e.g., "IS_ENTITY_OWNER", "HAS_ANNOTATION", "IS_ENTITY_KIND")'
                      ),
                    description: z
                      .string()
                      .describe('Human-readable description of what this rule does'),
                    resourceType: z
                      .string()
                      .describe('Resource type this rule applies to'),
                    paramsSchema: z
                      .any()
                      .describe(
                        'JSON Schema defining the parameters required for this rule. Includes properties, types, descriptions, and required fields.'
                      ),
                  })
                )
                .describe('Conditional rules available in this plugin'),
            })
          ),
          count: z.number().describe('Total number of plugins with conditional rules'),
          totalRules: z.number().describe('Total number of conditional rules available'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      const response = await fetch(`${permissionUrl}/plugins/condition-rules`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch conditional rules: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      let plugins = await response.json();

      // Filter by pluginId if provided
      if (input.pluginId) {
        plugins = plugins.filter((p: any) => p.pluginId === input.pluginId);
      }

      const totalRules = plugins.reduce(
        (sum: number, p: any) => sum + (p.rules?.length || 0),
        0
      );

      return {
        output: {
          plugins: plugins.map((plugin: any) => ({
            pluginId: plugin.pluginId,
            rules: plugin.rules || [],
          })),
          count: plugins.length,
          totalRules,
        },
      };
    },
  });

  // Action 8: Get user effective permissions
  actionsRegistry.register({
    name: 'get_user_effective_permissions',
    title: 'Get User Effective Permissions',
    description:
      'Audits what a specific user or group can actually do in Backstage by aggregating all their permissions from all roles they belong to. Returns all roles the user/group is a member of, all permission policies granted through those roles, and all conditional policies. Use this to answer questions like "what access does John have?" or "what can the engineering team do?". Useful for access auditing, troubleshooting permission issues, and compliance checks. Provide the user or group reference in format "user:namespace/name" or "group:namespace/name".',
    schema: {
      input: z =>
        z.object({
          memberRef: z
            .string()
            .describe(
              'User or group reference in format "user:namespace/name" or "group:namespace/name" (e.g., "user:default/john.doe" or "group:default/engineering")'
            ),
        }),
      output: z =>
        z.object({
          memberRef: z.string().describe('The user or group that was queried'),
          roles: z
            .array(
              z.object({
                name: z.string().describe('Role reference'),
                description: z.string().optional().nullable(),
                source: z.string(),
              })
            )
            .describe('All roles this user/group belongs to'),
          permissions: z
            .array(
              z.object({
                permission: z.string(),
                policy: z.string(),
                effect: z.string(),
                roleRef: z
                  .string()
                  .describe('Which role granted this permission'),
                source: z.string(),
              })
            )
            .describe('Aggregated list of all permission policies from all roles'),
          conditionalPolicies: z
            .array(
              z.object({
                id: z.number(),
                roleRef: z.string().describe('Which role defined this condition'),
                pluginId: z.string(),
                resourceType: z.string(),
                permissionMapping: z.array(z.string()),
                conditions: z.any(),
              })
            )
            .describe('All conditional policies from all roles'),
          roleCount: z.number().describe('Number of roles the user/group has'),
          permissionCount: z.number().describe('Total number of permission policies'),
          conditionalPolicyCount: z.number().describe('Number of conditional policies'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      // Fetch all roles
      const rolesResponse = await fetch(`${permissionUrl}/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!rolesResponse.ok) {
        const errorText = await rolesResponse.text();
        throw new Error(
          `Failed to fetch roles: ${rolesResponse.status} ${rolesResponse.statusText} - ${errorText}`
        );
      }

      const allRoles = await rolesResponse.json();

      // Filter roles that include this member
      const userRoles = allRoles.filter((role: any) =>
        role.memberReferences?.includes(input.memberRef)
      );

      // Fetch all permissions
      const permissionsResponse = await fetch(`${permissionUrl}/policies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let allPermissions = [];
      if (permissionsResponse.ok) {
        allPermissions = await permissionsResponse.json();
      }

      // Fetch all conditional policies
      const conditionsResponse = await fetch(`${permissionUrl}/roles/conditions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let allConditionalPolicies = [];
      if (conditionsResponse.ok) {
        allConditionalPolicies = await conditionsResponse.json();
      }

      // Filter permissions and conditions for user's roles
      const userRoleRefs = new Set(userRoles.map((r: any) => r.name));
      
      const userPermissions = allPermissions
        .filter((perm: any) => userRoleRefs.has(perm.entityReference))
        .map((perm: any) => ({
          permission: perm.permission,
          policy: perm.policy,
          effect: perm.effect,
          roleRef: perm.entityReference,
          source: perm.metadata?.source || 'unknown',
        }));

      const userConditionalPolicies = allConditionalPolicies
        .filter((policy: any) => userRoleRefs.has(policy.roleEntityRef))
        .map((policy: any) => ({
          id: policy.id,
          roleRef: policy.roleEntityRef,
          pluginId: policy.pluginId,
          resourceType: policy.resourceType,
          permissionMapping: policy.permissionMapping || [],
          conditions: policy.conditions,
        }));

      return {
        output: {
          memberRef: input.memberRef,
          roles: userRoles.map((role: any) => ({
            name: role.name,
            description: role.metadata?.description,
            source: role.metadata?.source || 'unknown',
          })),
          permissions: userPermissions,
          conditionalPolicies: userConditionalPolicies,
          roleCount: userRoles.length,
          permissionCount: userPermissions.length,
          conditionalPolicyCount: userConditionalPolicies.length,
        },
      };
    },
  });

  // Action 9: List conditional policies
  actionsRegistry.register({
    name: 'list_conditional_policies',
    title: 'List Conditional Policies',
    description:
      'Lists all conditional permission policies defined in Backstage, optionally filtered by role. Conditional policies enable fine-grained access control based on resource attributes (like ownership, annotations, labels, etc.). Each policy includes the role it\'s assigned to, the plugin and resource type it controls, which permission actions it applies to, and the conditional rules themselves. Use this to get visibility into all conditional access rules in your system, or to see what conditional permissions a specific role has.',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .optional()
            .describe(
              'Optional role reference to filter policies for a specific role (e.g., "role:default/developers"). If not provided, returns all conditional policies from all roles.'
            ),
        }),
      output: z =>
        z.object({
          policies: z.array(
            z.object({
              id: z.number().describe('Unique ID of the conditional policy'),
              roleRef: z.string().describe('Role this policy is assigned to'),
              pluginId: z.string().describe('Plugin this policy applies to'),
              resourceType: z.string().describe('Resource type being controlled'),
              permissionMapping: z
                .array(z.string())
                .describe(
                  'Policy actions this condition applies to (e.g., ["read", "update"])'
                ),
              conditions: z
                .any()
                .describe('The conditional rules (can include anyOf/allOf logic)'),
            })
          ),
          count: z.number().describe('Total number of conditional policies'),
        }),
    },
    action: async ({ input, credentials }) => {
      const permissionUrl = await discovery.getBaseUrl('permission');
      
      const serviceCredentials = await auth.getOwnServiceCredentials();
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: credentials || serviceCredentials,
        targetPluginId: 'permission',
      });

      const response = await fetch(`${permissionUrl}/roles/conditions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch conditional policies: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      let policies = await response.json();

      // Filter by roleRef if provided
      if (input.roleRef) {
        policies = policies.filter((p: any) => p.roleEntityRef === input.roleRef);
      }

      return {
        output: {
          policies: policies.map((policy: any) => ({
            id: policy.id,
            roleRef: policy.roleEntityRef,
            pluginId: policy.pluginId,
            resourceType: policy.resourceType,
            permissionMapping: policy.permissionMapping || [],
            conditions: policy.conditions,
          })),
          count: policies.length,
        },
      };
    },
  });

  // Action 10: Create role with permissions (combined operation)
  actionsRegistry.register({
    name: 'create_role_with_permissions',
    title: 'Create Role with Permissions',
    description:
      'Creates a new RBAC role with members and assigns permission policies to it in a single atomic operation. This is the recommended way to set up new roles as it matches the typical workflow: "create a role for this team with these permissions". If the role already exists, it will update the members and add the permissions. This action combines grant_role_to_members and assign_permissions_to_role into one convenient operation.',
    schema: {
      input: z =>
        z.object({
          roleRef: z
            .string()
            .describe(
              'Role reference in format "role:namespace/name" (e.g., "role:default/developers")'
            ),
          members: z
            .array(z.string())
            .min(1)
            .describe(
              'Array of user or group references. Format: "user:namespace/name" or "group:namespace/name" (e.g., ["user:default/john", "group:default/team-a"])'
            ),
          description: z
            .string()
            .optional()
            .describe('Optional description for the role'),
          permissions: z
            .array(
              z.object({
                permission: z
                  .string()
                  .describe(
                    'Permission identifier (e.g., "catalog-entity", "catalog.entity.create")'
                  ),
                policy: z
                  .enum(['create', 'read', 'update', 'delete', 'use'])
                  .describe('Policy action type'),
                effect: z
                  .enum(['allow', 'deny'])
                  .describe('Whether to allow or deny this permission'),
              })
            )
            .min(1)
            .describe('Array of permission policies to assign to the role'),
        }),
      output: z =>
        z.object({
          roleRef: z.string().describe('The role that was created or updated'),
          created: z
            .boolean()
            .describe('True if the role was newly created, false if it already existed'),
          memberReferences: z
            .array(z.string())
            .describe('Current list of all members in the role'),
          memberCount: z.number().describe('Number of members in the role'),
          addedPermissions: z
            .number()
            .describe('Number of permissions that were assigned'),
          permissions: z
            .array(
              z.object({
                permission: z.string(),
                policy: z.string(),
                effect: z.string(),
              })
            )
            .describe('The permissions that were assigned'),
        }),
    },
    action: async ({ input, credentials }) => {
      try {
        console.log('[RBAC MCP] create_role_with_permissions called with input:', JSON.stringify(input, null, 2));
        
        const permissionUrl = await discovery.getBaseUrl('permission');
        console.log('[RBAC MCP] Permission URL:', permissionUrl);
        
        const serviceCredentials = await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: credentials || serviceCredentials,
          targetPluginId: 'permission',
        });

        // Parse the role reference
        const roleRefParts = input.roleRef.split(':');
        if (roleRefParts.length !== 2) {
          throw new InputError(
            `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
          );
        }
        
        const [kind, namespaceName] = roleRefParts;
        const nameParts = namespaceName.split('/');
        if (nameParts.length !== 2) {
          throw new InputError(
            `Invalid role reference format "${input.roleRef}". Expected format: "role:namespace/name"`
          );
        }
        
        const [namespace, name] = nameParts;

        // Step 1: Create or update the role
        const checkUrl = `${permissionUrl}/roles/${kind}/${namespace}/${name}`;
        console.log('[RBAC MCP] Checking if role exists:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let created = false;
        let currentMembers: string[] = [];

        if (checkResponse.ok) {
          console.log('[RBAC MCP] Role exists, updating...');
          // Role exists - update it
          const roleData = await checkResponse.json();
          const role = Array.isArray(roleData) ? roleData[0] : roleData;
          currentMembers = role.memberReferences || [];

          // Merge new members with existing ones
          const allMembers = Array.from(new Set([...currentMembers, ...input.members]));

          const updatePayload = {
            oldRole: {
              memberReferences: currentMembers,
              name: input.roleRef,
              metadata: {
                description: role.metadata?.description,
              },
            },
            newRole: {
              memberReferences: allMembers,
              name: input.roleRef,
              metadata: {
                description: input.description || role.metadata?.description || '',
              },
            },
          };

          console.log('[RBAC MCP] Update role payload:', JSON.stringify(updatePayload, null, 2));

          const updateResponse = await fetch(checkUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatePayload),
          });

          if (!updateResponse.ok) {
            await handleApiError(updateResponse, 'Failed to update role');
          }

          currentMembers = allMembers;
        } else if (checkResponse.status === 404) {
          console.log('[RBAC MCP] Role does not exist, creating...');
          // Role doesn't exist - create it
          const createPayload = {
            memberReferences: input.members,
            name: input.roleRef,
            metadata: {
              description: input.description || '',
            },
          };

          console.log('[RBAC MCP] Create role payload:', JSON.stringify(createPayload, null, 2));

          const createResponse = await fetch(`${permissionUrl}/roles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createPayload),
          });

          if (!createResponse.ok) {
            await handleApiError(createResponse, 'Failed to create role');
          }

          console.log('[RBAC MCP] Role created successfully');
          created = true;
          currentMembers = input.members;
        } else {
          await handleApiError(checkResponse, 'Failed to check role existence');
        }

        // Step 2: Assign the permissions
        const permissionsPayload = input.permissions.map(perm => ({
          entityReference: input.roleRef,
          permission: perm.permission,
          policy: perm.policy,
          effect: perm.effect,
        }));

        console.log('[RBAC MCP] Assigning permissions:', JSON.stringify(permissionsPayload, null, 2));

        const permissionsResponse = await fetch(`${permissionUrl}/policies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(permissionsPayload),
        });

        if (!permissionsResponse.ok) {
          await handleApiError(
            permissionsResponse,
            'Role was created/updated successfully, but failed to assign permissions'
          );
        }

        console.log('[RBAC MCP] Permissions assigned successfully');

        const result = {
          roleRef: input.roleRef,
          created,
          memberReferences: currentMembers,
          memberCount: currentMembers.length,
          addedPermissions: input.permissions.length,
          permissions: input.permissions,
        };

        console.log('[RBAC MCP] create_role_with_permissions completed:', JSON.stringify(result, null, 2));

        return {
          output: result,
        };
      } catch (error) {
        console.error('[RBAC MCP] create_role_with_permissions error:', error);
        throw error;
      }
    },
  });
}
