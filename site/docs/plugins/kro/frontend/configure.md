# Configuring the KRO Resources Frontend Plugin

This guide covers the configuration options and best practices for the KRO Resources frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults and integrated into the appropriate entity pages without requiring manual route configuration.

## Configuration Options

### Permission Framework Integration

The plugin integrates with Backstage's permission framework through conditional rendering hooks and wrapper components:

```typescript
// Permission Hooks
useKroResourceListAvailable()
useKroResourceGraphAvailable()

// Wrapper Components
<IfKroOverviewAvailable>
<IfKroResourceGraphAvailable>
<IfKroResourcesListAvailable>
```

Use these components to conditionally render KRO UI elements based on user permissions:

```typescript
<IfKroOverviewAvailable>
  <KroOverviewCard />
</IfKroOverviewAvailable>
```

## UI Customization

### Component Placement

You can customize where and how the KRO components appear in your Backstage instance:

1. **Overview Card** (`KroOverviewCard`): Place in the entity overview tab for quick status insights
2. **Resource Table** (`KroResourceTable`): Place in a dedicated tab for detailed resource management
3. **Resource Graph** (`KroResourceGraph`): Place in its own tab for interactive relationship visualization

Example custom layout:

```typescript
const kroOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <IfKroOverviewAvailable>
      <Grid item md={6}>
        <KroOverviewCard />
      </Grid>
    </IfKroOverviewAvailable>
  </Grid>
);
```

### Conditional Route Rendering

Use the permission hooks to conditionally show tabs based on access:

```typescript
const KroEntityPage = () => {
  const isKroResourceListAvailable = useKroResourceListAvailable();
  const isKroResourceGraphAvailable = useKroResourceGraphAvailable();

  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        {kroOverviewContent}
      </EntityLayout.Route>
      <EntityLayout.Route
        if={isKroResourceListAvailable}
        path="/kro-resources"
        title="KRO Resources"
      >
        <IfKroResourcesListAvailable>
          <KroResourceTable />
        </IfKroResourcesListAvailable>
      </EntityLayout.Route>
      <EntityLayout.Route
        if={isKroResourceGraphAvailable}
        path="/kro-graph"
        title="KRO Graph"
      >
        <IfKroResourceGraphAvailable>
          <KroResourceGraph />
        </IfKroResourceGraphAvailable>
      </EntityLayout.Route>
    </EntityLayout>
  );
};
```

## Integration with Other Plugins

### Kubernetes Ingestor Integration

The KRO plugin relies on the Kubernetes Ingestor to populate the catalog with KRO resources. Ensure:

1. The Kubernetes Ingestor is configured to watch KRO resources
2. The correct entity types (`kro-instance`) are set up in your catalog
3. The KRO Resources backend plugin is installed and reachable

### KRO Resources Backend

The frontend plugin communicates with the KRO Resources backend plugin for:

- Fetching resource data and relationships
- Retrieving YAML configurations
- Monitoring resource events

Ensure the backend plugin is installed and configured before enabling the frontend. See the [backend install guide](../backend/install.md) for details.

## Best Practices

1. **Performance**: Place the Resource Graph in a dedicated tab — it is more resource-intensive than table views.
2. **Permissions**: Use the conditional rendering hooks (`useKroResourceListAvailable`, `useKroResourceGraphAvailable`) to gate tabs rather than rendering empty components.
3. **Entity Types**: Limit the KRO entity page to the `kro-instance` component type to avoid the page appearing on unrelated entities.
