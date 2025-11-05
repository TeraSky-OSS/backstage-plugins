# RBAC MCP Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-rbac-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-rbac-mcp-backend)

## Overview

The RBAC MCP backend plugin (`@terasky/backstage-plugin-rbac-mcp-backend`) provides Model Context Protocol (MCP) actions for comprehensive Role-Based Access Control management in Backstage. This enables AI agents and automation tools to discover, manage, and audit roles, permissions, and access policies through a standardized interface.

## Features

### Role Discovery and Management
- List all RBAC roles with members and metadata
- Get detailed role information
- Create new roles with members
- Assign users and groups to roles
- View role sources (REST API, CSV, configuration, legacy)

### Permission Management
- Discover available permissions from installed plugins
- Assign permission policies to roles
- Support for all policy types (create, read, update, delete, use)
- Permission effect management (allow/deny)
- Atomic role creation with permissions

### Conditional Access Control
- Create fine-grained conditional permissions
- Discover available conditional rule types
- Support for complex conditions (anyOf, allOf logic)
- Common rules: IS_ENTITY_OWNER, HAS_ANNOTATION, HAS_LABEL, IS_ENTITY_KIND
- Resource-specific access control

### Access Auditing
- View effective permissions for users and groups
- Aggregate permissions from all roles
- List all conditional policies
- Role membership tracking
- Permission policy inspection

### MCP Actions Support
- 10 comprehensive MCP actions
- Standardized MCP action interface
- Integration with AI agents and automation tools
- Detailed error handling and logging
- Validation and existence checks

## Technical Details

### Available MCP Actions

The plugin provides 10 main MCP actions grouped into three categories:

#### Discovery Actions

1. **list_rbac_roles**
    - Lists all roles in the system
    - Returns role names, members, descriptions, and sources
    - No input parameters required
    - Shows where roles are defined (REST API, CSV, configuration, legacy)

2. **list_available_permissions**
    - Discovers all permissions from installed plugins
    - Optional plugin filter
    - Returns permissions grouped by plugin
    - Shows permission names, policy types, and resource types

3. **list_conditional_rules**
    - Lists available conditional rule types
    - Optional plugin filter
    - Returns rule definitions with parameter schemas
    - Helps build conditional permissions

#### Management Actions

4. **grant_role_to_members**
    - Assigns users or groups to a role
    - Creates the role if it doesn't exist
    - Input: Role reference and member references
    - Supports user and group references

5. **assign_permissions_to_role**
    - Grants permission policies to an existing role
    - Validates role existence
    - Input: Role reference and permissions array
    - Additive - doesn't remove existing permissions

6. **create_conditional_permission**
    - Creates fine-grained conditional access policies
    - Supports simple and complex conditions
    - Input: Role reference, plugin ID, resource type, conditions
    - Enables attribute-based access control

7. **create_role_with_permissions** ⭐
    - Atomic operation combining role creation and permission assignment
    - Recommended for new role setup
    - Input: Role reference, members, description, permissions
    - Updates existing roles or creates new ones

#### Audit Actions

8. **get_role_details**
    - Retrieves comprehensive role information
    - Returns members, permission policies, and conditional policies
    - Input: Role reference
    - Format: "role:namespace/name"

9. **get_user_effective_permissions**
    - Audits all permissions for a user or group
    - Aggregates from all roles
    - Returns roles, permission policies, and conditional policies
    - Input: User or group reference

10. **list_conditional_policies**
    - Lists all conditional permission policies
    - Optional role filter
    - Returns policies with conditions and rules
    - Shows plugin, resource type, and permission mappings

### Integration Points

- Backstage RBAC Backend Plugin (required)
- Backstage Permission Framework (required)
- MCP Actions Registry (required)
- Backstage Authentication System (required)
- Backstage Catalog (for entity-based conditions)

### Security Considerations

- All actions require RBAC admin permissions
- Actions run on behalf of the authenticated user
- Comprehensive input validation
- Detailed error messages with security context
- Audit trail through backend logs

### Error Handling

The plugin provides comprehensive error handling:

- Detailed error messages with context
- HTTP status codes and status text
- Full URL logging for debugging
- JSON error response parsing
- Input validation and existence checks

All errors are logged with the `[RBAC MCP]` prefix for easy debugging.

### Validation Features

- Role existence validation before permission assignment
- Member reference format validation (user:namespace/name, group:namespace/name)
- Permission identifier validation
- Policy type validation (create/read/update/delete/use)
- Conditional rule parameter validation


