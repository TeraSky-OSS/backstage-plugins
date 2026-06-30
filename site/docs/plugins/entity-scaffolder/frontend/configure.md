# Configuring the Entity Scaffolder Content Frontend Plugin

This guide covers the configuration options available for the Entity Scaffolder Content frontend plugin.

## New Frontend System Configuration (Alpha)

When using the new frontend system through the `/alpha` export, the plugin is configured automatically with sensible defaults. The configuration options described below are still available and can be customised through direct component usage.

In the new frontend system, **field extensions are discovered automatically** — any extension registered via `FormFieldBlueprint` (e.g. `RepoUrlPicker`, `EntityPicker`) is available without any additional wiring.

## Component Configuration

### EntityScaffolderContent Props

The main component accepts the following configuration props:

```typescript
interface EntityScaffolderContentProps {
  // Define template filtering and grouping
  templateGroupFilters: Array<{
    title?: ReactNode;
    filter: (entity: Entity, template: TemplateEntityV1beta3) => boolean;
  }>;

  // Map entity and template data to template form fields
  buildInitialState: (
    entity: Entity,
    template: TemplateEntityV1beta3,
  ) => Record<string, JsonValue>;

  // Optional explicit field extensions.
  // Not needed in the new frontend system — extensions are auto-discovered.
  ScaffolderFieldExtensions?: ReactNode;

  // Optional custom layout options for the workflow stepper
  layouts?: LayoutOptions[];

  // Optional component overrides
  components?: {
    TemplateCard?: ComponentType<{ template: TemplateEntityV1beta3 }>;
  };
}
```

> **Note**: The `buildInitialState` function now receives both the `entity` and the selected `template` as arguments. This allows you to tailor initial values per template.

### Template Group Filters

Configure how templates are filtered and grouped based on entity context:

```typescript
const templateGroupFilters = [
  {
    title: 'Kubernetes Resources',
    filter: (entity, template) =>
      template.metadata?.labels?.type === 'kubernetes' &&
      entity.spec?.type === 'kubernetes-namespace',
  },
  {
    title: 'Application Templates',
    filter: (entity, template) =>
      template.metadata?.labels?.type === 'application' &&
      entity.spec?.type === 'service',
  },
];
```

### Initial State Builder

Define how entity data maps to template form fields. The function now receives both `entity` and `template`:

```typescript
const buildInitialState = (entity: Entity, template: TemplateEntityV1beta3) => ({
  // Basic metadata mapping
  name: entity.metadata.name,
  namespace: entity.metadata.namespace,

  // Extract from annotations
  cluster: entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(': ')[1],

  // Custom transformations
  labels: Object.entries(entity.metadata.labels || {}).map(
    ([key, value]) => `${key}=${value}`
  ),
});
```

### Field Extensions

#### New Frontend System (recommended)

In the new frontend system, field extensions registered via `FormFieldBlueprint` are **automatically discovered** — no `ScaffolderFieldExtensions` prop is needed.

#### Legacy Frontend System

If you are using the legacy frontend system, pass extensions explicitly via the `ScaffolderFieldExtensions` prop:

```typescript
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { EntityPickerFieldExtension, RepoUrlPickerFieldExtension } from '@backstage/plugin-scaffolder';

<EntityScaffolderContent
  templateGroupFilters={templateGroupFilters}
  buildInitialState={buildInitialState}
  ScaffolderFieldExtensions={
    <ScaffolderFieldExtensions>
      <RepoUrlPickerFieldExtension />
      <EntityPickerFieldExtension />
    </ScaffolderFieldExtensions>
  }
/>
```

> The `ScaffolderFieldExtensions` prop is still accepted in the new frontend system and will be merged with auto-discovered extensions, so existing usage continues to work.

### Custom Layouts

Pass custom layout options to the workflow stepper:

```typescript
import { LayoutOptions } from '@backstage/plugin-scaffolder-react';

const layouts: LayoutOptions[] = [
  {
    name: 'TwoColumn',
    component: TwoColumnLayout,
  },
];

<EntityScaffolderContent
  templateGroupFilters={templateGroupFilters}
  buildInitialState={buildInitialState}
  layouts={layouts}
/>
```

### Custom Template Card

Override the default template card component:

```typescript
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';

const MyTemplateCard = ({ template }: { template: TemplateEntityV1beta3 }) => (
  <div>
    <h3>{template.metadata.title ?? template.metadata.name}</h3>
    <p>{template.metadata.description}</p>
  </div>
);

<EntityScaffolderContent
  templateGroupFilters={templateGroupFilters}
  buildInitialState={buildInitialState}
  components={{ TemplateCard: MyTemplateCard }}
/>
```

## Form Decorators

Form decorators allow you to collect secrets or modify form state before the scaffold call is made. A common use-case is fetching a GitHub OAuth token to prevent self-approval of Backstage-created PRs.

### How They Work

1. A template declares the decorators it needs in `spec.formDecorators`:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: my-template
spec:
  # ...
  formDecorators:
    - id: github-token
```

2. When the user submits the form, the plugin automatically runs all declared decorators in order before calling the scaffolder backend.

3. Decorators can set secrets (passed to the backend but not stored in the task) and/or update form state values.

### Registering a Decorator (New Frontend System)

```typescript
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import {
  createScaffolderFormDecorator,
  FormDecoratorBlueprint,
} from '@backstage/plugin-scaffolder-react/alpha';
import { githubAuthApiRef } from '@backstage/core-plugin-api';

const githubTokenDecorator = createScaffolderFormDecorator({
  id: 'github-token',
  deps: {
    githubApi: githubAuthApiRef,
  },
  decorator: async ({ setSecrets, secrets }, { githubApi }) => {
    const token = await githubApi.getAccessToken(['repo']);
    // Functional update — spread existing secrets and add the new one
    setSecrets(prev => ({ ...prev, GITHUB_TOKEN: token }));
  },
});

export const githubTokenDecoratorExtension = FormDecoratorBlueprint.make({
  name: 'github-token',
  params: {
    decorator: githubTokenDecorator,
  },
});

// Register in App.tsx
createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [githubTokenDecoratorExtension],
});
```

### Decorator Context

The decorator function receives:

| Property | Type | Description |
|----------|------|-------------|
| `input` | `Record<string, JsonValue>` | Values from the template's `spec.formDecorators[].input` |
| `formState` | `Record<string, JsonValue>` | Current form field values |
| `setFormState` | `(state \| (prev => state)) => void` | Update form field values |
| `secrets` | `Record<string, string>` | Current secrets |
| `setSecrets` | `(state \| (prev => state)) => void` | Update secrets (supports functional updates) |

Both `setFormState` and `setSecrets` accept either a plain object (replaces the entire state) or a functional update `prev => next` (use this when you want to merge with existing values).

## Entity Page Integration

### Basic Integration

Add the plugin to an entity page:

```typescript
import { EntityScaffolderContent } from '@terasky/backstage-plugin-entity-scaffolder-content';

const entityPage = (
  <EntityLayout>
    <EntityLayout.Route
      path="/scaffolder"
      title="Templates"
    >
      <EntityScaffolderContent
        templateGroupFilters={templateGroupFilters}
        buildInitialState={buildInitialState}
      />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### With Explicit Field Extensions (Legacy)

```typescript
import { EntityScaffolderContent } from '@terasky/backstage-plugin-entity-scaffolder-content';
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { EntityPickerFieldExtension, RepoUrlPickerFieldExtension } from '@backstage/plugin-scaffolder';

const entityPage = (
  <EntityLayout>
    <EntityLayout.Route
      path="/scaffolder"
      title="Templates"
    >
      <EntityScaffolderContent
        templateGroupFilters={templateGroupFilters}
        buildInitialState={buildInitialState}
        ScaffolderFieldExtensions={
          <ScaffolderFieldExtensions>
            <RepoUrlPickerFieldExtension />
            <EntityPickerFieldExtension />
            <GitOpsManifestUpdaterExtension />
          </ScaffolderFieldExtensions>
        }
      />
    </EntityLayout.Route>
  </EntityLayout>
);
```

### Advanced Integration

Configure for multiple entity types:

```typescript
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route
      path="/scaffolder"
      title="Service Templates"
    >
      <EntityScaffolderContent
        templateGroupFilters={[
          {
            title: 'Service Templates',
            filter: (entity, template) =>
              template.metadata?.labels?.type === 'service' &&
              entity.spec?.type === 'service',
          },
        ]}
        buildInitialState={(entity, template) => ({
          serviceName: entity.metadata.name,
          owner: entity.spec?.owner,
          type: entity.spec?.type,
        })}
      />
    </EntityLayout.Route>
  </EntityLayout>
);

const systemEntityPage = (
  <EntityLayout>
    <EntityLayout.Route
      path="/scaffolder"
      title="System Templates"
    >
      <EntityScaffolderContent
        templateGroupFilters={[
          {
            title: 'System Resources',
            filter: (entity, template) =>
              template.metadata?.labels?.type === 'system' &&
              entity.spec?.type === 'system',
          },
        ]}
        buildInitialState={(entity, template) => ({
          systemName: entity.metadata.name,
          environment: entity.spec?.environment,
        })}
      />
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Best Practices

1. **Template Filtering**
    - Use clear, descriptive group titles
    - Keep filter conditions simple and maintainable
    - Consider template metadata structure
    - Handle edge cases gracefully

2. **Data Mapping**
    - Validate entity data before mapping
    - Provide sensible defaults
    - Use the `template` argument in `buildInitialState` to conditionally populate fields
    - Handle missing data gracefully

3. **Form Decorators**
    - Use decorators to collect sensitive data (tokens, credentials) that should not be stored in the task
    - Always use functional updates (`prev => ({ ...prev, key: value })`) when adding to existing state/secrets
    - Keep decorator logic focused — one concern per decorator

4. **Entity Integration**
    - Use consistent route paths
    - Group related templates logically
    - Consider user workflow
    - Maintain clear navigation

For installation instructions, refer to the [Installation Guide](./install.md).
