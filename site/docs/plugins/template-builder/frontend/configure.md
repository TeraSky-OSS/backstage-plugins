# Configuring the Template Builder Frontend Plugin

This guide covers the configuration options for the Template Builder frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { templateBuilderPlugin } from '@terasky/backstage-plugin-template-builder/alpha';

export default createApp({
  features: [
    templateBuilderPlugin,
  ],
});
```

The plugin will automatically register routes and integrate with the catalog without requiring manual configuration.

## Basic Configuration

The Template Builder plugin works out of the box with minimal configuration. However, you can customize various aspects through `app-config.yaml`:

```yaml
templateBuilder:
  # Default layout direction for workflow canvas
  defaultLayout: vertical  # Options: vertical, horizontal
  
  # Enable/disable field extension auto-discovery
  autoDiscoverFieldExtensions: true
  
  # Known field extensions (optional, used as fallback)
  knownFieldExtensions:
    - EntityPicker
    - RepoUrlPicker
    - OwnerPicker
    - EntityNamePicker
```

## Configuration Options

### Default Layout

The `defaultLayout` setting determines the initial workflow canvas orientation:

```yaml
templateBuilder:
  defaultLayout: vertical  # or horizontal
```

- **vertical**: Parameters at top, actions in middle, outputs at bottom (default)
- **horizontal**: Parameters at left, actions in center, outputs at right

Users can toggle between layouts using the toolbar button.

### Field Extension Discovery

Control how the plugin discovers custom field extensions:

```yaml
templateBuilder:
  autoDiscoverFieldExtensions: true  # Enable automatic discovery
  
  # Optional: Provide known extensions as fallback
  knownFieldExtensions:
    - EntityPicker
    - RepoUrlPicker
    - OwnerPicker
    - EntityTagsPicker
    - EntityNamePicker
    - MultiEntityPicker
    - MyCustomFieldExtension
```

When `autoDiscoverFieldExtensions` is `true` (default), the plugin queries the scaffolder backend at runtime to get all registered field extensions. The `knownFieldExtensions` list serves as a fallback if discovery fails.


## Best Practices

1. **Field Extensions**
    - Keep `autoDiscoverFieldExtensions` enabled for automatic updates
    - Add custom extensions to `knownFieldExtensions` as backup
    - Document custom field extensions for your team

2. **Layout Preferences**
    - Set `defaultLayout` based on team preference
    - Vertical is better for sequential workflows
    - Horizontal is better for complex data flows

3. **Validation**
    - Enable strict validation in production
    - Use lenient validation in development
    - Test templates thoroughly before committing

4. **Performance**
    - Monitor field extension discovery performance
    - Consider caching for large action catalogs
    - Optimize Monaco editor settings for your environment

5. **User Experience**
    - Provide clear documentation about available actions
    - Train users on both visual and YAML editing
    - Encourage validation before downloading templates
