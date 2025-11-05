# RBAC MCP Plugin

The RBAC MCP plugin for Backstage provides comprehensive integration with Model Context Protocol (MCP), enabling AI agents and automation tools to discover, manage, and audit Role-Based Access Control (RBAC) roles, permissions, and policies programmatically.

## Plugin Components

### Backend Plugin (`@terasky/backstage-plugin-rbac-mcp-backend`)
The backend plugin provides MCP actions for:
- Discovering roles, permissions, and conditional rules
- Creating and managing roles and memberships
- Assigning permissions and conditional policies
- Auditing user and group permissions
- Integration with Backstage's RBAC framework

[Learn more about the backend plugin](./backend/about.md)

## Documentation Structure

- Backend Plugin
    - [About](./backend/about.md)
    - [Installation](./backend/install.md)
    - [Configuration](./backend/configure.md)
    - [Usage Examples](./backend/usage.md)

## MCP Actions Integration

The RBAC MCP plugin provides MCP (Model Context Protocol) actions for programmatic management of Role-Based Access Control in Backstage. This enables AI agents and automation tools to:

1. **Discover Resources**: List roles, permissions, and conditional rules
2. **Manage Roles**: Create roles and assign members
3. **Manage Permissions**: Assign permission policies to roles
4. **Audit Access**: View effective permissions for users and groups
5. **Create Conditional Policies**: Set up fine-grained access control

### Available MCP Actions

The plugin provides 10 comprehensive MCP actions grouped into three categories:

#### Discovery Actions
- `list_rbac_roles`: Discover all roles in the system with their members and sources
- `list_available_permissions`: See what permissions plugins provide
- `list_conditional_rules`: Discover available conditional access rule types

#### Management Actions
- `grant_role_to_members`: Assign users/groups to roles (creates role if needed)
- `assign_permissions_to_role`: Grant permission policies to roles
- `create_conditional_permission`: Set up fine-grained conditional access
- `create_role_with_permissions`: ⭐ Combined operation for atomic role creation

#### Audit Actions
- `get_role_details`: View complete role information including members and permissions
- `get_user_effective_permissions`: Audit what a specific user/group can do
- `list_conditional_policies`: View all conditional access policies

### Integration Requirements

To enable these MCP actions:

1. Install and configure the RBAC MCP backend plugin
2. Install and configure the Backstage RBAC backend plugin
3. Ensure the MCP server is configured in your Backstage instance
4. Configure authentication with admin permissions
5. Verify RBAC integration is working

## Getting Started

To get started with the RBAC MCP plugin:

1. Install and configure the backend plugin
2. Ensure RBAC backend plugin is installed
3. Configure admin permissions
4. Start using MCP actions with AI agents or automation tools

For detailed installation and configuration instructions, refer to the backend documentation linked above.

