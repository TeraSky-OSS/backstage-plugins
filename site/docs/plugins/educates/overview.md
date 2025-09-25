# Educates Plugin

The Educates plugin for Backstage provides seamless integration with Educates training portals, enabling users to discover, access, and manage educational workshops directly within the Backstage interface.

## Plugin Components

### Frontend Plugin
The frontend plugin provides a user interface for:

- Browsing available workshops across multiple training portals
- Viewing detailed workshop information
- Launching workshop sessions
- Managing active workshop sessions

[Learn more about the frontend plugin](./frontend/about.md)

### Backend Plugin
The backend plugin handles:

- Integration with Educates training portals
- Authentication and session management
- Workshop session operations
- API endpoints for workshop data
- Advanced permission rules and conditions

[Learn more about the backend plugin](./backend/about.md)

## Features

- **Multi-Portal Support**: Connect to multiple training portals simultaneously
- **Workshop Discovery**: Browse and search available workshops
- **Detailed Information**: View comprehensive workshop details including:
    - Title and description
    - Difficulty level
    - Duration
    - Tags and labels
    - Capacity and availability
- **Session Management**: Launch and track workshop sessions
- **Advanced Permission Controls**: Resource-based permissions with conditional rules and portal-specific access control

## Documentation Structure

Frontend Plugin

  - [About](./frontend/about.md)
  - [Installation](./frontend/install.md)
  - [Configuration](./frontend/configure.md)

Backend Plugin

  - [About](./backend/about.md)
  - [Installation](./backend/install.md)
  - [Configuration](./backend/configure.md)

## Available Permissions

The plugin provides a comprehensive resource-based permission system with the following permissions:

### Resource-Based Permissions

- **`educates.portal.view`**: Permission to view and access specific training portals
  - Resource Type: `educates-training-portal`
  - Action: `read`
  - Supports conditional access based on portal ownership and access rules

- **`educates.workshop.start`**: Permission to start workshop sessions for specific workshops
  - Resource Type: `educates-workshop`
  - Action: `create`
  - Supports conditional access based on workshop ownership and access rules

### Permission Rules

The plugin includes advanced permission rules for fine-grained access control:

#### Portal Rules
- **`IS_PORTAL_OWNER`**: Allow users who are owners of a training portal
- **`HAS_PORTAL_ACCESS`**: Allow users who have been granted access to a specific portal

#### Workshop Rules
- **`IS_WORKSHOP_OWNER`**: Allow users who are owners of a workshop
- **`HAS_WORKSHOP_ACCESS`**: Allow users who have been granted access to a specific workshop

### Conditional Permissions

The plugin supports conditional permission decisions that can be configured based on:
- User entity references
- Portal names
- Workshop names
- Custom access control logic

### Deprecated Permissions

⚠️ **The following permissions are removed in this version:**

- `educates.workshops.view` → Use `educates.portal.view` instead
- `educates.workshop-sessions.create` → Use `educates.workshop.start` instead

## MCP Actions Integration

The Educates plugin provides MCP (Model Control Protocol) actions for interacting with training portals and workshops. To enable these actions:

1. First, ensure you have the MCP actions backend plugin installed and configured. See the [MCP Actions Backend Plugin documentation](https://github.com/backstage/backstage/blob/master/plugins/mcp-actions-backend/README.md) for setup instructions.

2. Add the plugin to your actions configuration in `app-config.yaml`:

```yaml
backend:
  actions:
    pluginSources:
      - 'catalog'
      - 'educates'
      # ... other action sources
```

### Available MCP Actions

The plugin provides the following MCP actions:

- `get_educates_training_portals`: Get configured training portals
  - Input: None
  - Output: List of training portals with their URLs

- `get_educates_workshops`: Get available workshops in a training portal
  - Input: Portal name
  - Output: List of workshops with detailed information including:
    - Title and description
    - Vendor and authors
    - Difficulty and duration
    - Environment capacity and availability

- `request_educates_workshop_session`: Request a new workshop session
  - Input: Portal name and workshop environment name
  - Output: Session details including URL, ID, and expiration time

## Getting Started

To get started with the Educates plugin:

1. Install and configure the backend plugin
2. Set up the frontend components
3. Configure your training portal connections
4. Configure permission rules and access policies
5. Configure MCP actions in your app-config.yaml
6. Start discovering and launching workshops

For detailed installation and configuration instructions, refer to the frontend and backend documentation linked above.
