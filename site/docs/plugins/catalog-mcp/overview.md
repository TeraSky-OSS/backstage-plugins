# Catalog MCP Plugin

The Catalog MCP plugin for Backstage provides comprehensive integration with Model Context Protocol (MCP), enabling AI agents and automation tools to discover and query catalog entities programmatically through flexible and powerful query interfaces.

## Plugin Components

### Backend Plugin (`@terasky/backstage-plugin-catalog-mcp-backend`)
The backend plugin provides MCP actions for:
- Querying entities by owner
- Searching entities by annotations
- Discovering entity types for specific kinds
- Filtering entities by kind and type combinations
- Building custom queries with flexible filter and field parameters
- Integration with Backstage's Catalog API

[Learn more about the backend plugin](./backend/about.md)

## Documentation Structure

- Backend Plugin
    - [About](./backend/about.md)
    - [Installation](./backend/install.md)
    - [Configuration](./backend/configure.md)

## MCP Actions Integration

The Catalog MCP plugin provides MCP (Model Context Protocol) actions for programmatic querying of the Backstage Catalog. This enables AI agents and automation tools to:

1. **Query by Owner**: Find all entities owned by specific users or groups
2. **Search by Annotation**: Discover entities with specific metadata annotations
3. **Discover Entity Types**: Explore the taxonomy of your catalog
4. **Filter by Kind and Type**: Find specific entity types (e.g., all service components)
5. **Custom Queries**: Build flexible queries with any combination of filters

### Available MCP Actions

The plugin provides 5 comprehensive MCP actions for catalog querying:

#### Query Actions

1. **get_entities_by_owner**
   - Find all entities owned by a specific user or group
   - Input: Owner reference (user:namespace/name or group:namespace/name)
   - Returns full entity data for all matches
   - Use case: "Show me everything the platform team owns"

2. **get_entities_by_annotation**
   - Search for entities with specific annotations
   - Input: Annotation key and optional value
   - Supports partial matching (key only) or exact matching (key + value)
   - Use case: "Find all entities with GitHub project slug annotation"

3. **get_entity_types_for_kind**
   - Discover all entity types available for a specific kind
   - Input: Entity kind (Component, API, Resource, etc.)
   - Returns deduplicated list of types
   - Use case: "What types of Components exist in my catalog?"

4. **get_all_entities_by_kind_and_type**
   - Query entities by both kind and type
   - Input: Kind and type
   - Returns all matching entities
   - Use case: "Show me all service components"

5. **get_entities_with_custom_query** ⭐
   - Most flexible query action
   - Input: Custom filter and fields parameters
   - Supports complex filtering with multiple criteria
   - Supports field selection for performance optimization
   - Use case: "Find all components of type service owned by the platform team with a specific annotation"

### Integration Requirements

To enable these MCP actions:

1. Install and configure the Catalog MCP backend plugin
2. Ensure the Backstage Catalog is populated with entities
3. Ensure the MCP server is configured in your Backstage instance
4. Configure authentication
5. Verify catalog integration is working

## Getting Started

To get started with the Catalog MCP plugin:

1. Install and configure the backend plugin
2. Ensure the Backstage Catalog is set up
3. Configure authentication
4. Start using MCP actions with AI agents or automation tools

For detailed installation and configuration instructions, refer to the backend documentation linked above.

