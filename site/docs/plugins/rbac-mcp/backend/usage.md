# RBAC MCP Backend Plugin Usage Examples

This guide provides comprehensive examples of how to use the RBAC MCP backend plugin's actions.

## Discovery Actions

### List RBAC Roles

Discover all roles in the system:

```json
{
  "action": "list_rbac_roles"
}
```

**Example Response:**
```json
{
  "roles": [
    {
      "name": "role:default/developers",
      "members": ["group:default/engineering"],
      "description": "Development team role",
      "source": "csv-file"
    },
    {
      "name": "role:default/admins",
      "members": ["user:default/admin"],
      "description": "System administrators",
      "source": "rest"
    }
  ],
  "count": 2
}
```

### List Available Permissions

Discover all permissions from installed plugins:

```json
{
  "action": "list_available_permissions"
}
```

**With Plugin Filter:**
```json
{
  "action": "list_available_permissions",
  "input": {
    "pluginId": "catalog"
  }
}
```

**Example Response:**
```json
{
  "permissions": {
    "catalog": [
      {
        "name": "catalog.entity.read",
        "attributes": {
          "action": "read"
        }
      },
      {
        "name": "catalog.entity.create",
        "attributes": {
          "action": "create"
        }
      }
    ]
  }
}
```

### List Conditional Rules

Discover available conditional rule types:

```json
{
  "action": "list_conditional_rules"
}
```

**Example Response:**
```json
{
  "rules": {
    "catalog": [
      {
        "name": "IS_ENTITY_OWNER",
        "description": "Allow users that own the entity",
        "resourceType": "catalog-entity",
        "paramsSchema": {
          "type": "object",
          "properties": {
            "claims": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      }
    ]
  }
}
```

## Management Actions

### Create Role with Permissions (Recommended)

The recommended way to create a new role:

```json
{
  "action": "create_role_with_permissions",
  "input": {
    "roleRef": "role:default/developers",
    "members": [
      "group:default/engineering",
      "user:default/john.doe"
    ],
    "description": "Developers with catalog access",
    "permissions": [
      {
        "permission": "catalog.entity.read",
        "policy": "read",
        "effect": "allow"
      },
      {
        "permission": "catalog.entity.create",
        "policy": "create",
        "effect": "allow"
      },
      {
        "permission": "catalog.entity.update",
        "policy": "update",
        "effect": "allow"
      }
    ]
  }
}
```

### Grant Role to Members

Create a role or add members to an existing role:

```json
{
  "action": "grant_role_to_members",
  "input": {
    "roleRef": "role:default/viewers",
    "members": [
      "group:default/all-users"
    ],
    "description": "Read-only access for all users"
  }
}
```

### Assign Permissions to Role

Add permissions to an existing role:

```json
{
  "action": "assign_permissions_to_role",
  "input": {
    "roleRef": "role:default/developers",
    "permissions": [
      {
        "permission": "scaffolder-template",
        "policy": "read",
        "effect": "allow"
      },
      {
        "permission": "scaffolder.task.create",
        "policy": "create",
        "effect": "allow"
      }
    ]
  }
}
```

### Create Conditional Permission

Set up fine-grained access control based on entity ownership:

```json
{
  "action": "create_conditional_permission",
  "input": {
    "roleRef": "role:default/developers",
    "pluginId": "catalog",
    "resourceType": "catalog-entity",
    "permissionMapping": ["read", "update"],
    "conditions": {
      "rule": "IS_ENTITY_OWNER",
      "resourceType": "catalog-entity",
      "params": {
        "claims": ["group:default/engineering"]
      }
    }
  }
}
```

**Complex Conditional with anyOf Logic:**
```json
{
  "action": "create_conditional_permission",
  "input": {
    "roleRef": "role:default/developers",
    "pluginId": "catalog",
    "resourceType": "catalog-entity",
    "permissionMapping": ["read"],
    "conditions": {
      "anyOf": [
        {
          "rule": "IS_ENTITY_OWNER",
          "resourceType": "catalog-entity",
          "params": {
            "claims": ["group:default/engineering"]
          }
        },
        {
          "rule": "HAS_ANNOTATION",
          "resourceType": "catalog-entity",
          "params": {
            "annotation": "public",
            "value": "true"
          }
        }
      ]
    }
  }
}
```

**Conditional with allOf Logic:**
```json
{
  "action": "create_conditional_permission",
  "input": {
    "roleRef": "role:default/senior-devs",
    "pluginId": "catalog",
    "resourceType": "catalog-entity",
    "permissionMapping": ["update", "delete"],
    "conditions": {
      "allOf": [
        {
          "rule": "IS_ENTITY_OWNER",
          "resourceType": "catalog-entity",
          "params": {
            "claims": ["group:default/senior-engineers"]
          }
        },
        {
          "rule": "IS_ENTITY_KIND",
          "resourceType": "catalog-entity",
          "params": {
            "kinds": ["Component", "API"]
          }
        }
      ]
    }
  }
}
```

## Audit Actions

### Get Role Details

View complete information about a role:

```json
{
  "action": "get_role_details",
  "input": {
    "roleRef": "role:default/developers"
  }
}
```

**Example Response:**
```json
{
  "role": {
    "name": "role:default/developers",
    "members": [
      "group:default/engineering",
      "user:default/john.doe"
    ],
    "description": "Developers with catalog access"
  },
  "permissions": [
    {
      "permission": "catalog.entity.read",
      "policy": "read",
      "effect": "allow"
    },
    {
      "permission": "catalog.entity.create",
      "policy": "create",
      "effect": "allow"
    }
  ],
  "conditionalPolicies": [
    {
      "pluginId": "catalog",
      "resourceType": "catalog-entity",
      "permissionMapping": ["read", "update"],
      "conditions": { ... }
    }
  ]
}
```

### Get User Effective Permissions

Audit all permissions for a user or group:

```json
{
  "action": "get_user_effective_permissions",
  "input": {
    "memberRef": "user:default/john.doe"
  }
}
```

**Example Response:**
```json
{
  "memberRef": "user:default/john.doe",
  "roles": [
    "role:default/developers",
    "role:default/viewers"
  ],
  "permissions": [
    {
      "permission": "catalog.entity.read",
      "policy": "read",
      "effect": "allow",
      "source": "role:default/developers"
    },
    {
      "permission": "catalog.entity.create",
      "policy": "create",
      "effect": "allow",
      "source": "role:default/developers"
    }
  ],
  "conditionalPolicies": [
    {
      "pluginId": "catalog",
      "resourceType": "catalog-entity",
      "permissionMapping": ["read", "update"],
      "conditions": { ... },
      "source": "role:default/developers"
    }
  ]
}
```

### List Conditional Policies

View all conditional permission policies:

```json
{
  "action": "list_conditional_policies"
}
```

**Filter by Role:**
```json
{
  "action": "list_conditional_policies",
  "input": {
    "roleRef": "role:default/developers"
  }
}
```

## Common Use Cases

### Use Case 1: Onboarding a New Team

Create a role for a new team with appropriate permissions:

```json
{
  "action": "create_role_with_permissions",
  "input": {
    "roleRef": "role:default/platform-team",
    "members": ["group:default/platform-engineers"],
    "description": "Platform team with infrastructure access",
    "permissions": [
      {
        "permission": "catalog.entity.read",
        "policy": "read",
        "effect": "allow"
      },
      {
        "permission": "kubernetes.proxy",
        "policy": "use",
        "effect": "allow"
      },
      {
        "permission": "scaffolder-template",
        "policy": "read",
        "effect": "allow"
      },
      {
        "permission": "scaffolder.task.create",
        "policy": "create",
        "effect": "allow"
      }
    ]
  }
}
```

### Use Case 2: Restricting Access to Owned Entities

Set up conditional access so users can only modify entities they own:

```json
{
  "action": "create_conditional_permission",
  "input": {
    "roleRef": "role:default/developers",
    "pluginId": "catalog",
    "resourceType": "catalog-entity",
    "permissionMapping": ["update", "delete"],
    "conditions": {
      "rule": "IS_ENTITY_OWNER",
      "resourceType": "catalog-entity",
      "params": {
        "claims": ["group:default/engineering"]
      }
    }
  }
}
```

### Use Case 3: Auditing Before Granting Admin Access

Before giving someone admin access, check what they currently have:

```json
{
  "action": "get_user_effective_permissions",
  "input": {
    "memberRef": "user:default/jane.smith"
  }
}
```

Then grant admin role:

```json
{
  "action": "grant_role_to_members",
  "input": {
    "roleRef": "role:default/rbac-admin",
    "members": ["user:default/jane.smith"]
  }
}
```

### Use Case 4: Setting Up Read-Only Access

Create a viewer role with read-only permissions:

```json
{
  "action": "create_role_with_permissions",
  "input": {
    "roleRef": "role:default/readonly-viewers",
    "members": ["group:default/contractors"],
    "description": "Read-only access to catalog",
    "permissions": [
      {
        "permission": "catalog.entity.read",
        "policy": "read",
        "effect": "allow"
      },
      {
        "permission": "scaffolder-template",
        "policy": "read",
        "effect": "allow"
      }
    ]
  }
}
```

## Error Handling

### Invalid Role Reference Format

**Error:**
```json
{
  "error": "Invalid role reference format. Expected 'role:namespace/name'"
}
```

**Solution:** Use the correct format:
```json
{
  "roleRef": "role:default/my-role"
}
```

### Permission Not Found

**Error:**
```json
{
  "error": "Permission 'invalid.permission' not found"
}
```

**Solution:** Use `list_available_permissions` to discover valid permissions first.

### Insufficient Permissions

**Error:**
```json
{
  "error": "Forbidden: User lacks RBAC admin permissions",
  "status": 403
}
```

**Solution:** Ensure you have admin permissions configured as described in the [Configuration Guide](./configure.md).

## Best Practices

1. **Always use `create_role_with_permissions` for new roles** - It's atomic and prevents partial state
2. **Discover permissions first** - Use `list_available_permissions` before assigning
3. **Audit regularly** - Use `get_user_effective_permissions` to verify access
4. **Use groups over individual users** - Makes management easier
5. **Document role purposes** - Use the description field
6. **Test conditional rules** - Use `list_conditional_rules` to understand parameters
7. **Check role details** - Use `get_role_details` to verify configuration

