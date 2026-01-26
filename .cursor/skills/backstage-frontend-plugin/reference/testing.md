# Frontend Plugin Testing Reference

## Overview

Comprehensive testing ensures frontend plugins work correctly and helps catch issues before production. Backstage provides specialized testing utilities in the `@backstage/frontend-test-utils` package.

---

## Testing Setup

### Install Dependencies

```json
{
  "devDependencies": {
    "@backstage/frontend-test-utils": "^0.1.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0"
  }
}
```

### Test File Structure

Organize tests alongside source files:

```
src/
├── components/
│   ├── ExamplePage.tsx
│   └── ExamplePage.test.tsx
├── api/
│   ├── ExampleApi.ts
│   └── ExampleApi.test.ts
└── plugin.test.ts
```

---

## Testing React Components

### Basic Component Testing

Use `renderInTestApp` to render components with proper Backstage context:

```tsx
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { screen } from '@testing-library/react';
import { ExampleComponent } from './ExampleComponent';

describe('ExampleComponent', () => {
  it('renders content correctly', async () => {
    await renderInTestApp(<ExampleComponent />);

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### Mocking Utility APIs

Use `TestApiProvider` to mock API dependencies:

```tsx
import { renderInTestApp, TestApiProvider } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { EntityDetails } from './EntityDetails';

describe('EntityDetails', () => {
  it('displays entity data', async () => {
    const mockCatalogApi = {
      getEntityByRef: jest.fn().mockResolvedValue({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'test-component' },
      }),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <EntityDetails entityRef="component:default/test-component" />
      </TestApiProvider>
    );

    expect(screen.getByText('test-component')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

Use `@testing-library/user-event` for realistic user interactions:

```tsx
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from './SearchForm';

describe('SearchForm', () => {
  it('handles form submission', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    await renderInTestApp(<SearchForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Search');
    await user.type(input, 'test query');

    const button = screen.getByRole('button', { name: 'Search' });
    await user.click(button);

    expect(onSubmit).toHaveBeenCalledWith('test query');
  });
});
```

---

## Testing Extensions

### Single Extension Testing

Use `createExtensionTester` to test extensions in isolation:

```tsx
import { createExtensionTester } from '@backstage/frontend-test-utils';
import { screen } from '@testing-library/react';
import { examplePage } from './plugin';

describe('examplePage extension', () => {
  it('renders the page content', async () => {
    const tester = createExtensionTester(examplePage);

    const { reactElement } = await tester.render();

    expect(screen.getByText('Example Page')).toBeInTheDocument();
  });
});
```

### Multiple Extension Testing

Test interactions between multiple extensions:

```tsx
import { createExtensionTester } from '@backstage/frontend-test-utils';
import { examplePlugin } from './plugin';
import { additionalExtension } from './extensions';

describe('plugin with multiple extensions', () => {
  it('loads all extensions correctly', async () => {
    const tester = createExtensionTester(examplePlugin)
      .add(additionalExtension);

    const pageOutput = await tester.query(examplePlugin.extensions[0]);
    const navOutput = await tester.query(examplePlugin.extensions[1]);

    expect(pageOutput).toBeDefined();
    expect(navOutput).toBeDefined();
  });
});
```

---

## Testing Configuration

### Extension Configuration

Test extensions with different configurations:

```tsx
import { createExtensionTester } from '@backstage/frontend-test-utils';
import { configurableExtension } from './extensions';

describe('configurableExtension', () => {
  it('respects custom configuration', async () => {
    const tester = createExtensionTester(configurableExtension, {
      config: {
        title: 'Custom Title',
        showAdvanced: true,
      },
    });

    const { reactElement } = await tester.render();

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });
});
```

### App-Level Configuration

Test with app-level configuration:

```tsx
import { createExtensionTester } from '@backstage/frontend-test-utils';
import { exampleExtension } from './extensions';

describe('exampleExtension with app config', () => {
  it('uses app configuration', async () => {
    const tester = createExtensionTester(exampleExtension, {
      appConfig: {
        app: {
          title: 'Test App',
        },
        example: {
          apiUrl: 'https://test.example.com',
        },
      },
    });

    // Test that extension uses the configuration
  });
});
```

---

## Testing Utility APIs

### API Implementation Testing

Test custom API implementations:

```tsx
import { DefaultExampleApi } from './ExampleApi';

describe('DefaultExampleApi', () => {
  let api: DefaultExampleApi;
  let mockDiscoveryApi: jest.Mocked<DiscoveryApi>;

  beforeEach(() => {
    mockDiscoveryApi = {
      getBaseUrl: jest.fn().mockResolvedValue('https://api.example.com'),
    };

    api = new DefaultExampleApi({
      discoveryApi: mockDiscoveryApi,
    });
  });

  it('fetches data correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '123', name: 'Test' }),
    });

    const result = await api.fetchData('123');

    expect(result).toEqual({ id: '123', name: 'Test' });
    expect(mockDiscoveryApi.getBaseUrl).toHaveBeenCalledWith('example');
  });

  it('handles errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(api.fetchData('invalid')).rejects.toThrow('Not found');
  });
});
```

### API Integration Testing

Test components using APIs:

```tsx
import { renderInTestApp, TestApiProvider } from '@backstage/frontend-test-utils';
import { exampleApiRef } from './api';
import { DataDisplay } from './DataDisplay';

describe('DataDisplay with API', () => {
  it('displays data from API', async () => {
    const mockApi = {
      fetchData: jest.fn().mockResolvedValue({
        id: '123',
        name: 'Test Data',
      }),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[exampleApiRef, mockApi]]}>
        <DataDisplay id="123" />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Data')).toBeInTheDocument();
    });

    expect(mockApi.fetchData).toHaveBeenCalledWith('123');
  });
});
```

---

## Testing Entity Components

### Entity Context Mocking

Test components that use entity context:

```tsx
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { EntityComponent } from './EntityComponent';

describe('EntityComponent', () => {
  it('renders entity information', async () => {
    const mockEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'my-component',
        namespace: 'default',
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
    };

    await renderInTestApp(
      <EntityProvider entity={mockEntity}>
        <EntityComponent />
      </EntityProvider>
    );

    expect(screen.getByText('my-component')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
  });
});
```

---

## Testing Permissions

### Permission Checks

Test components with permission-based visibility:

```tsx
import { renderInTestApp, TestApiProvider } from '@backstage/frontend-test-utils';
import { permissionApiRef } from '@backstage/plugin-permission-react';
import { ProtectedComponent } from './ProtectedComponent';

describe('ProtectedComponent', () => {
  it('shows content when permission is granted', async () => {
    const mockPermissionApi = {
      authorize: jest.fn().mockResolvedValue({
        result: 'ALLOW',
      }),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[permissionApiRef, mockPermissionApi]]}>
        <ProtectedComponent />
      </TestApiProvider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('hides content when permission is denied', async () => {
    const mockPermissionApi = {
      authorize: jest.fn().mockResolvedValue({
        result: 'DENY',
      }),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[permissionApiRef, mockPermissionApi]]}>
        <ProtectedComponent />
      </TestApiProvider>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

---

## Testing Routes and Navigation

### Route Testing

Test navigation and routing:

```tsx
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { useRouteRef } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

const NavigationComponent = () => {
  const routeRef = useRouteRef(rootRouteRef);
  return <a href={routeRef()}>Go to Example</a>;
};

describe('NavigationComponent', () => {
  it('generates correct route', async () => {
    await renderInTestApp(<NavigationComponent />, {
      mountedRoutes: {
        '/example': rootRouteRef,
      },
    });

    const link = screen.getByText('Go to Example');
    expect(link).toHaveAttribute('href', '/example');
  });
});
```

---

## Best Practices

### Test Organization

```tsx
describe('ComponentName', () => {
  describe('rendering', () => {
    it('renders basic content', () => { /* ... */ });
    it('handles loading state', () => { /* ... */ });
    it('handles error state', () => { /* ... */ });
  });

  describe('interactions', () => {
    it('handles button click', () => { /* ... */ });
    it('submits form data', () => { /* ... */ });
  });

  describe('edge cases', () => {
    it('handles empty data', () => { /* ... */ });
    it('handles network errors', () => { /* ... */ });
  });
});
```

### Async Testing

Always await async operations:

```tsx
// Good
await renderInTestApp(<Component />);
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());

// Bad
renderInTestApp(<Component />); // Missing await
expect(screen.getByText('Loaded')).toBeInTheDocument(); // May fail due to timing
```

### Mock Cleanup

Clean up mocks between tests:

```tsx
describe('Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Tests...
});
```

---

## Running Tests

### Command Line

```bash
# Run all tests
yarn backstage-cli package test

# Run tests in watch mode
yarn backstage-cli package test --watch

# Run with coverage
yarn backstage-cli package test --coverage

# Run specific test file
yarn backstage-cli package test ExampleComponent.test.tsx
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install --frozen-lockfile
      - run: yarn backstage-cli package test --coverage
```

---

## Common Testing Patterns

### Loading States

```tsx
it('shows loading spinner', async () => {
  const { rerender } = await renderInTestApp(<DataComponent loading={true} />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  rerender(<DataComponent loading={false} data={mockData} />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

### Error Handling

```tsx
it('displays error message', async () => {
  const mockApi = {
    fetchData: jest.fn().mockRejectedValue(new Error('Network error')),
  };

  await renderInTestApp(
    <TestApiProvider apis={[[exampleApiRef, mockApi]]}>
      <DataComponent />
    </TestApiProvider>
  );

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Snapshot Testing

```tsx
it('matches snapshot', async () => {
  const { container } = await renderInTestApp(<Component data={mockData} />);
  expect(container.firstChild).toMatchSnapshot();
});
```

---

## Official Documentation

For the latest testing guidance:
- [Frontend System Testing](https://backstage.io/docs/frontend-system/building-plugins/testing/)
- [Testing with Jest](https://backstage.io/docs/plugins/testing/)
