# Extension Blueprints Reference

## Overview

Extension blueprints provide a `make` method to create new extensions and are the recommended approach for creating extensions in Backstage's frontend system. Blueprints replaced the older "extension creator" pattern, providing a more consistent and powerful API surface for both plugin builders and integrators.

---

## Core Blueprint Types

### PageBlueprint

Creates page extensions that render at specific routes.

**Package**: `@backstage/frontend-plugin-api`

**Key Features**:
- Default path configuration
- Always dynamically loaded using `React.lazy()`
- Integration with route references

**Usage Pattern**:

```tsx
import { PageBlueprint } from '@backstage/frontend-plugin-api';
import { rootRouteRef } from './routes';

const examplePage = PageBlueprint.make({
  params: {
    routeRef: rootRouteRef,
    path: '/example',
    loader: () => import('./components/ExamplePage').then(m => <m.ExamplePage />),
  },
});
```

**Parameters**:
- `routeRef`: Route reference for navigation
- `path`: URL path for the page
- `loader`: Async component loader function

---

### NavItemBlueprint

Creates navigation items, typically rendered in the sidebar.

**Package**: `@backstage/frontend-plugin-api`

**Key Features**:
- Integrates with `app.nav` extension
- Default sidebar rendering
- Route-aware navigation

**Usage Pattern**:

```tsx
import { NavItemBlueprint } from '@backstage/frontend-plugin-api';
import { rootRouteRef } from './routes';
import ExampleIcon from '@material-ui/icons/Extension';

const exampleNavItem = NavItemBlueprint.make({
  params: {
    routeRef: rootRouteRef,
    title: 'Example',
    icon: ExampleIcon,
  },
});
```

**Parameters**:
- `routeRef`: Route reference to navigate to
- `title`: Display text for navigation item
- `icon`: MUI icon component or custom SVG icon

---

### EntityContentBlueprint

Creates content tabs for entity pages in the catalog plugin.

**Package**: `@backstage/plugin-catalog-react/alpha`

**Key Features**:
- Renders on entity pages
- Tab-based navigation
- Entity-aware context

**Usage Pattern**:

```tsx
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';

const exampleEntityContent = EntityContentBlueprint.make({
  params: {
    path: 'example',
    title: 'Example',
    loader: () =>
      import('./components/ExampleEntityContent').then(m => <m.ExampleEntityContent />),
  },
});
```

**Parameters**:
- `path`: Tab path segment
- `title`: Tab display name
- `loader`: Async component loader function

**Best Practices**:
- Keep entity content extensions small and focused
- Avoid heavy logic in loaders
- Use permissions to control visibility
- Handle missing entity data gracefully

---

### ApiBlueprint

Creates Utility API extensions for shared logic across plugins.

**Package**: `@backstage/frontend-plugin-api`

**Key Features**:
- Advanced parameter types
- Dependency injection support
- Factory pattern for API instantiation

**Usage Pattern**:

```tsx
import { ApiBlueprint } from '@backstage/frontend-plugin-api';
import { exampleApiRef, DefaultExampleApi } from './api';

const exampleApi = ApiBlueprint.make({
  name: 'example',
  params: define =>
    define({
      api: exampleApiRef,
      deps: {
        // Optional dependencies on other APIs
        discoveryApi: discoveryApiRef,
      },
      factory: ({ discoveryApi }) => new DefaultExampleApi({ discoveryApi }),
    }),
});
```

**Parameters**:
- `name`: Unique identifier for the API extension
- `params`: Define callback for advanced configuration
  - `api`: API reference created with `createApiRef`
  - `deps`: Dependencies on other APIs
  - `factory`: Function to instantiate the API implementation

**API Reference Pattern**:

```tsx
import { createApiRef } from '@backstage/frontend-plugin-api';

export interface ExampleApi {
  fetchData(id: string): Promise<Data>;
  updateData(id: string, data: Data): Promise<void>;
}

export const exampleApiRef = createApiRef<ExampleApi>({
  id: 'plugin.example',
});

export class DefaultExampleApi implements ExampleApi {
  constructor(private options: { discoveryApi: DiscoveryApi }) {}

  async fetchData(id: string): Promise<Data> {
    // Implementation
  }

  async updateData(id: string, data: Data): Promise<void> {
    // Implementation
  }
}
```

---

## Advanced Features

### makeWithOverrides

Every extension blueprint provides a `makeWithOverrides` method for creating extensions with additional integration points.

**Usage**:

```tsx
const customPage = PageBlueprint.makeWithOverrides({
  params: {
    routeRef: rootRouteRef,
    path: '/custom',
    loader: () => import('./components/CustomPage').then(m => <m.CustomPage />),
  },
  config: {
    // Additional configuration schema
  },
});
```

**When to Use**:
- Need custom configuration options
- Require additional extension points
- Building reusable extension templates

---

## Extension Registration

All extensions created with blueprints must be registered in the plugin definition:

```tsx
import { createFrontendPlugin } from '@backstage/frontend-plugin-api';

export const examplePlugin = createFrontendPlugin({
  pluginId: 'example',
  extensions: [
    examplePage,
    exampleNavItem,
    exampleEntityContent,
    exampleApi,
  ],
  routes: {
    root: rootRouteRef,
  },
});
```

---

## Best Practices

### Lazy Loading

Always use dynamic imports in loader functions to enable code splitting:

```tsx
// Good
loader: () => import('./components/Page').then(m => <m.Page />)

// Bad - defeats code splitting
import { Page } from './components/Page';
loader: () => <Page />
```

### Error Boundaries

Wrap lazy-loaded components in error boundaries:

```tsx
import { ErrorBoundary } from '@backstage/core-components';
import React from 'react';

const LazyComponent = React.lazy(() => import('./components/Component'));

function SafeComponent() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </React.Suspense>
    </ErrorBoundary>
  );
}
```

### Route Organization

Keep all route references in a dedicated `src/routes.ts` file:

```tsx
// src/routes.ts
import { createRouteRef, createSubRouteRef } from '@backstage/frontend-plugin-api';

export const rootRouteRef = createRouteRef();
export const detailsRouteRef = createSubRouteRef({
  parent: rootRouteRef,
  path: '/details/:id',
});
```

### Extension Naming

Use descriptive names that reflect the extension's purpose:

```tsx
// Good
const userDashboardPage = PageBlueprint.make({ ... });
const settingsNavItem = NavItemBlueprint.make({ ... });

// Bad
const page1 = PageBlueprint.make({ ... });
const nav = NavItemBlueprint.make({ ... });
```

---

## Common Patterns

### Conditional Entity Content

Show entity content only when appropriate:

```tsx
import { useEntity } from '@backstage/plugin-catalog-react';

export function ConditionalEntityContent() {
  const { entity } = useEntity();

  if (entity.kind !== 'Component') {
    return null;
  }

  return <div>Component-specific content</div>;
}
```

### Permission-Based Visibility

Control access using permissions:

```tsx
import { usePermission } from '@backstage/plugin-permission-react';
import { examplePermission } from './permissions';

export function PermissionGatedContent() {
  const { loading, allowed } = usePermission({
    permission: examplePermission,
  });

  if (loading) return null;
  if (!allowed) return <div>Access denied</div>;

  return <div>Protected content</div>;
}
```

### API Consumption

Use Utility APIs in components:

```tsx
import { useApi } from '@backstage/core-plugin-api';
import { exampleApiRef } from './api';

export function DataComponent() {
  const exampleApi = useApi(exampleApiRef);
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    exampleApi.fetchData('123').then(setData);
  }, [exampleApi]);

  return <div>{data?.name}</div>;
}
```

---

## Official Documentation

For the latest information, consult:
- [Frontend Extension Blueprints](https://backstage.io/docs/frontend-system/architecture/extension-blueprints/)
- [Common Extension Blueprints](https://backstage.io/docs/frontend-system/building-plugins/common-extension-blueprints/)
- [Building Frontend Plugins](https://backstage.io/docs/frontend-system/building-plugins/index/)
