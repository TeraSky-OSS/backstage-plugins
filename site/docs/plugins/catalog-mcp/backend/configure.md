# Configuring the Catalog MCP Backend Plugin

This guide covers the configuration options for the Catalog MCP backend plugin.

## Prerequisites Configuration

### Catalog Configuration

Ensure the Backstage Catalog is properly configured:

```yaml
# app-config.yaml
catalog:
  import:
    entityFilename: catalog-info.yaml
  rules:
    - allow: [Component, System, API, Resource, Location, User, Group, Domain, Template]
  providers:
    # Add your catalog providers here
```

## Authentication Configuration

The plugin uses the Backstage backend authentication system to make authenticated requests to the catalog API.

### Backend Authentication

Ensure backend authentication is configured:

```yaml
backend:
  auth:
    keys:
      - secret: ${BACKEND_SECRET}
```

### Service-to-Service Authentication

The plugin automatically uses service credentials for catalog API calls. No additional configuration is required.

## MCP Actions Configuration

The plugin automatically registers all 5 MCP actions. No additional configuration is required for basic functionality.

### Available Actions

1. `get_entities_by_owner` - Query entities by owner
2. `get_entities_by_annotation` - Search by annotations
3. `get_entity_types_for_kind` - Discover entity types
4. `get_all_entities_by_kind_and_type` - Filter by kind and type
5. `get_entities_with_custom_query` - Flexible custom queries

## Best Practices

### Query Optimization

1. **Use Field Selection**
   - When using `get_entities_with_custom_query`, specify fields to reduce response size
   - Only request the data you need
   - Example: `fields: "kind,metadata.name,spec.owner"`

2. **Filter Appropriately**
   - Use specific filters to reduce result sets
   - Combine multiple filters for precise queries
   - Example: `filter: "kind=Component,spec.type=service"`

3. **Owner Queries**
   - Use group references for team-based queries
   - Cache results when querying the same owner repeatedly
   - Consider using custom queries for complex owner filters

### Entity Discovery

1. **Type Discovery**
   - Use `get_entity_types_for_kind` before querying by type
   - Cache type lists for better performance
   - Validate types before filtering

2. **Annotation Searches**
   - Use key-only searches for discovery
   - Use key+value searches for precise matches
   - Consider indexing commonly-searched annotations

3. **Custom Queries**
   - Start with simple filters and add complexity gradually
   - Test queries with field selection for performance
   - Monitor query response times

### Security

1. **Authentication**
   - Always enable authentication
   - Use strong backend secrets
   - Rotate secrets regularly
   - Monitor authentication failures

2. **Authorization**
   - Respect catalog permissions
   - Implement read-only access where appropriate
   - Log all query operations
   - Monitor unusual query patterns

3. **Logging and Monitoring**
   - Enable backend logging
   - Monitor `[CATALOG MCP]` log entries
   - Track API errors and failures
   - Set up alerts for high query volumes

### Error Handling

The plugin provides comprehensive error logging:

```
[CATALOG MCP] Fetching entities by owner: http://localhost:7007/api/catalog/entities/by-query?filter=spec.owner=...
[CATALOG MCP] Fetching entities by annotation: http://localhost:7007/api/catalog/entities/by-query?filter=...
[CATALOG MCP] API Error: { ... }
```

Enable debug logging to troubleshoot issues:

```yaml
backend:
  log:
    level: debug
```

## Advanced Configuration

### Custom Backend URL

If your catalog runs on a different URL, update the configuration:

```yaml
backend:
  baseUrl: http://your-backend:7007
```

### Timeout Configuration

Adjust timeout values for large catalogs:

```yaml
backend:
  reading:
    timeout: 60000  # 60 seconds for large queries
```

### CORS Configuration

If accessing from different origins:

```yaml
backend:
  cors:
    origin: http://localhost:3000
    methods: [GET, POST, PUT, DELETE, PATCH]
    credentials: true
```

## Integration with Catalog Providers

### Entity Ingestion

Ensure entities are being ingested properly:

```yaml
catalog:
  providers:
    github:
      organization: 'my-org'
      catalogPath: '/catalog-info.yaml'
      filters:
        branch: 'main'
    kubernetes:
      clusters:
        - name: 'production'
          url: 'https://k8s.example.com'
          authProvider: 'serviceAccount'
```

### Metadata Annotations

Configure standard annotations for better searchability:

```yaml
# Example catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    github.com/project-slug: 'my-org/my-service'
    backstage.io/techdocs-ref: 'dir:.'
    backstage.io/source-location: 'url:https://github.com/my-org/my-service'
spec:
  type: service
  owner: group:default/platform-team
```

## Query Examples

### Basic Owner Query

Find all entities owned by a team:

```json
{
  "action": "get_entities_by_owner",
  "input": {
    "owner": "group:default/platform-team"
  }
}
```

### Annotation Search

Find entities with GitHub integration:

```json
{
  "action": "get_entities_by_annotation",
  "input": {
    "annotation": "github.com/project-slug"
  }
}
```

### Type Discovery

Discover all component types:

```json
{
  "action": "get_entity_types_for_kind",
  "input": {
    "kind": "Component"
  }
}
```

### Filtered Query

Find all service components:

```json
{
  "action": "get_all_entities_by_kind_and_type",
  "input": {
    "kind": "Component",
    "type": "service"
  }
}
```

### Complex Custom Query

Find specific entities with field selection:

```json
{
  "action": "get_entities_with_custom_query",
  "input": {
    "filter": "kind=Component,spec.type=service,spec.owner=group:default/platform",
    "fields": "kind,metadata.name,metadata.namespace,spec.type,spec.owner"
  }
}
```

## Troubleshooting

### Common Configuration Issues

1. **Catalog Not Accessible**
   - Symptom: Connection errors or 404 responses
   - Solution: Verify catalog is running and accessible
   - Check: `curl http://localhost:7007/api/catalog/entities`

2. **No Entities Returned**
   - Symptom: Empty results for valid queries
   - Solution: Check catalog has entities ingested
   - Check: View catalog in Backstage UI

3. **Authentication Failures**
   - Symptom: 401 or 403 errors
   - Solution: Verify backend authentication is configured
   - Check: Backend secret is set correctly

4. **Invalid Filter Format**
   - Symptom: Query parsing errors
   - Solution: Use comma-separated filters without spaces
   - Example: `"kind=Component,spec.type=service"` (not `"kind = Component, spec.type = service"`)

5. **Large Response Times**
   - Symptom: Slow query responses
   - Solution: Use field selection to reduce data
   - Solution: Add more specific filters
   - Solution: Increase backend timeout

### Debug Mode

Enable detailed logging:

```yaml
backend:
  log:
    level: debug
    format: json
```

Check logs for:
- Query URLs being constructed
- Filter parameters being applied
- Response sizes and timing
- Error details with full context

## Performance Tuning

### For Large Catalogs (1000+ entities)

1. **Use Field Selection**
   ```json
   {
     "fields": "kind,metadata.name,spec.type"
   }
   ```

2. **Add Specific Filters**
   ```json
   {
     "filter": "kind=Component,spec.type=service,metadata.namespace=production"
   }
   ```

3. **Increase Timeouts**
   ```yaml
   backend:
     reading:
       timeout: 120000
   ```

4. **Consider Caching**
   - Cache common queries at the application level
   - Use catalog response caching
   - Implement query result memoization

## Next Steps

After configuration:
1. Test queries using MCP actions
2. Monitor performance and error rates
3. Adjust timeouts and filters as needed
4. Set up logging and monitoring
5. Document common queries for your team


