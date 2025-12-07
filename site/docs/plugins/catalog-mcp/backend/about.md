# Catalog MCP Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-catalog-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-catalog-mcp-backend)

## Overview

The Catalog MCP backend plugin (`@terasky/backstage-plugin-catalog-mcp-backend`) provides Model Context Protocol (MCP) actions for comprehensive catalog querying in Backstage. This enables AI agents and automation tools to discover and query catalog entities through a standardized interface with powerful filtering capabilities.

## Features

### Owner-Based Queries
- Find all entities owned by specific users or groups
- Support for user and group references
- Full entity data in responses
- Use cases: Team resource auditing, ownership tracking

### Annotation-Based Search
- Search entities by annotation keys
- Optional value filtering for exact matches
- Discover entities with specific metadata
- Use cases: Finding entities by GitHub project, documentation references, custom tags

### Entity Type Discovery
- Discover all types for a specific entity kind
- Deduplicated type lists
- Understand catalog taxonomy
- Use cases: Exploring catalog structure, validating types

### Kind and Type Filtering
- Query entities by both kind and type
- Targeted entity discovery
- Full entity data responses
- Use cases: Find all service components, list all REST APIs

### Custom Query Builder
- Most powerful and flexible query action
- Support for arbitrary filter combinations
- Field selection for performance optimization
- Multiple filter criteria with AND logic
- Use cases: Complex queries, custom reporting, data analysis

### MCP Actions Support
- 5 comprehensive MCP actions
- Standardized MCP action interface
- Integration with AI agents and automation tools
- Detailed error handling and logging
- Input validation and query optimization

## Technical Details

### Available MCP Actions

The plugin provides 5 main MCP actions for catalog querying:

#### 1. get_entities_by_owner

Retrieves all catalog entities owned by a specific user or group.

**Input:**
- `owner`: Owner reference (e.g., "user:default/john.doe", "group:default/engineering")

**Output:**
- `entities`: Array of matching entities
- `count`: Total number found
- `owner`: The queried owner reference

**API Endpoint:**
```
/api/catalog/entities/by-query?filter=spec.owner=<OWNER>
```

**Example:**
```json
{
  "owner": "group:default/platform-team"
}
```

#### 2. get_entities_by_annotation

Searches for entities with specific annotations, with optional value matching.

**Input:**
- `annotation`: Annotation key (e.g., "backstage.io/techdocs-ref")
- `value` (optional): Annotation value for exact matching

**Output:**
- `entities`: Array of matching entities
- `count`: Total number found
- `annotation`: The queried annotation key
- `value`: The queried value (if provided)

**API Endpoints:**
- Key only: `/api/catalog/entities/by-query?filter=metadata.annotations.<KEY>`
- Key + value: `/api/catalog/entities/by-query?filter=metadata.annotations.<KEY>=<VALUE>`

**Examples:**
```json
// Find all entities with annotation
{
  "annotation": "github.com/project-slug"
}

// Find entities with specific annotation value
{
  "annotation": "github.com/project-slug",
  "value": "my-org/my-repo"
}
```

#### 3. get_entity_types_for_kind

Discovers all entity types available for a specific kind.

**Input:**
- `kind`: Entity kind (e.g., "Component", "API", "Resource")

**Output:**
- `types`: Deduplicated array of type strings
- `count`: Total number of unique types
- `kind`: The queried kind

**API Endpoint:**
```
/api/catalog/entities/by-query?filter=kind=<KIND>&fields=spec.type,kind
```

**Example:**
```json
{
  "kind": "Component"
}
```

**Response Example:**
```json
{
  "types": ["service", "website", "library", "documentation"],
  "count": 4,
  "kind": "Component"
}
```

#### 4. get_all_entities_by_kind_and_type

Retrieves entities matching both a specific kind and type.

**Input:**
- `kind`: Entity kind (e.g., "Component", "API")
- `type`: Entity type (e.g., "service", "openapi")

**Output:**
- `entities`: Array of matching entities
- `count`: Total number found
- `kind`: The queried kind
- `type`: The queried type

**API Endpoint:**
```
/api/catalog/entities/by-query?filter=spec.type=<TYPE>,kind=<KIND>
```

**Example:**
```json
{
  "kind": "Component",
  "type": "service"
}
```

#### 5. get_entities_with_custom_query ⭐

The most flexible query action, supporting arbitrary filters and field selection.

**Input:**
- `filter` (optional): Query filter string with comma-separated criteria
- `fields` (optional): Comma-separated list of fields to return

**Output:**
- `entities`: Array of matching entities
- `count`: Total number found
- `filter`: The applied filter
- `fields`: The requested fields

**API Endpoint:**
```
/api/catalog/entities/by-query?filter=<FILTER>&fields=<FIELDS>
```

**Examples:**
```json
// Filter by multiple criteria
{
  "filter": "spec.type=service,kind=Component,spec.owner=group:default/platform"
}

// With field selection for performance
{
  "filter": "kind=Component",
  "fields": "kind,metadata.name,metadata.namespace"
}

// Complex annotation query
{
  "filter": "metadata.annotations.github.com/project-slug=myorg/myrepo,kind=Component"
}
```

### Integration Points

- Backstage Catalog API (required)
- MCP Actions Registry (required)
- Backstage Authentication System (required)
- Backstage Discovery Service (required)

### Security Considerations

- All actions use authenticated requests
- Actions run with catalog read permissions
- URL encoding for safe parameter passing
- Input validation for all parameters
- Comprehensive error handling

### Error Handling

The plugin provides comprehensive error handling:

- Detailed error messages with context
- HTTP status codes and status text
- Full URL logging for debugging
- JSON error response parsing
- Query validation

All errors are logged with the `[CATALOG MCP]` prefix for easy debugging.

### Query Optimization

- Field selection reduces response size
- Filter combinations use efficient catalog queries
- Proper URL encoding
- Response caching at the catalog level
- Pagination support through catalog API

### Response Formats

All actions return consistent response structures:

```json
{
  "entities": [ /* array of entity objects */ ],
  "count": 42,
  /* additional query-specific fields */
}
```

Entity objects follow the Backstage entity schema with:
- `apiVersion`
- `kind`
- `metadata` (name, namespace, annotations, labels, etc.)
- `spec` (entity-specific specifications)
- `relations` (entity relationships)


