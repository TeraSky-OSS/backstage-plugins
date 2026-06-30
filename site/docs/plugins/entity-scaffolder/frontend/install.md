# Installing the Entity Scaffolder Content Frontend Plugin

This guide will help you install and set up the Entity Scaffolder Content frontend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A working Backstage instance
2. The Scaffolder plugin installed and configured
3. Access to entity pages where you want to embed templates

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-entity-scaffolder-content
```

### 2. Add to Entity Page (Legacy Frontend System)

Modify your entity page configuration in `packages/app/src/components/catalog/EntityPage.tsx`:

```typescript
import { EntityScaffolderContent } from '@terasky/backstage-plugin-entity-scaffolder-content';

// Example for system entity page
const systemPage = (
  <EntityLayout>
    {/* ... other routes ... */}

    <EntityLayout.Route path="/scaffolder" title="Templates">
      <EntityScaffolderContent
        templateGroupFilters={[
          {
            title: 'System Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.forEntity === 'system' &&
              entity.spec?.type === 'kubernetes-namespace',
          },
        ]}
        buildInitialState={(entity, template) => ({
          namespace: entity.metadata.name,
          // Add other initial state mappings
        })}
      />
    </EntityLayout.Route>
  </EntityLayout>
);

// Add similar configurations for other entity pages as needed
```

Field extensions (e.g. `RepoUrlPicker`, `EntityPicker`) can be passed via the optional `ScaffolderFieldExtensions` prop. See the [Configuration Guide](./configure.md#field-extensions) for details.

## New Frontend System Support (Alpha)

The plugin ships a ready-to-use alpha export for the new Backstage frontend system. To use it:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { entityScaffolderContentPlugin } from '@terasky/backstage-plugin-entity-scaffolder-content/alpha';

export default createApp({
  features: [
    // ...
    entityScaffolderContentPlugin,
    // ...
  ],
});
```

This registers the built-in entity content extensions automatically. In this mode **field extensions are auto-discovered** — any extension registered via `FormFieldBlueprint` is picked up without additional configuration.

### Registering Form Decorators (New Frontend System)

Form decorators are registered the same way as other Backstage extensions:

```typescript
import { createApp } from '@backstage/frontend-defaults';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { createScaffolderFormDecorator, FormDecoratorBlueprint } from '@backstage/plugin-scaffolder-react/alpha';
import { githubAuthApiRef } from '@backstage/core-plugin-api';

const githubTokenDecorator = createScaffolderFormDecorator({
  id: 'github-token',
  deps: {
    githubApi: githubAuthApiRef,
  },
  decorator: async ({ setSecrets, secrets }, { githubApi }) => {
    const token = await githubApi.getAccessToken(['repo']);
    setSecrets({ ...secrets, GITHUB_TOKEN: token });
  },
});

const githubTokenDecoratorExtension = FormDecoratorBlueprint.make({
  name: 'github-token',
  params: {
    decorator: githubTokenDecorator,
  },
});

export default createApp({
  features: [
    entityScaffolderContentPlugin,
    createFrontendModule({
      pluginId: 'scaffolder',
      extensions: [githubTokenDecoratorExtension],
    }),
  ],
});
```

The decorator will run automatically for any template that declares it in `spec.formDecorators`.

## Verification

After installation, verify that:

1. The plugin appears in your `package.json` dependencies
2. The templates tab appears on configured entity pages
3. Templates are properly filtered based on entity context
4. Template forms are pre-populated with entity data
5. After template submission, an inline task progress view (steps, logs, outputs) is displayed

## Troubleshooting

Common issues and solutions:

1. **Templates Tab Not Showing**
    - Verify `EntityLayout.Route` configuration
    - Check component import path
    - Ensure entity page configuration is applied

2. **Templates Not Filtered**
    - Review `templateGroupFilters` configuration
    - Check template metadata and labels
    - Verify entity type matching

3. **Form Pre-population Issues**
    - Check `buildInitialState` function signature — it now receives both `entity` and `template` as arguments
    - Verify entity data access
    - Review data transformation logic

4. **Field Extensions Not Rendering**
    - In the new frontend system, ensure extensions are registered via `FormFieldBlueprint`
    - In the legacy system, pass extensions via the `ScaffolderFieldExtensions` prop (see [Configuration Guide](./configure.md#field-extensions))

5. **Form Decorator Not Executing**
    - Ensure the template declares the decorator in `spec.formDecorators`
    - Verify the decorator is registered via `FormDecoratorBlueprint` with the matching `id`
    - Check the browser console for any API resolution errors

For configuration options and customisation, proceed to the [Configuration Guide](./configure.md).
