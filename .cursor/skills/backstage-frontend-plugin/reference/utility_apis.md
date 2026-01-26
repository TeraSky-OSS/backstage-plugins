# Utility APIs Reference

## Overview

Utility APIs provide shared logic and services across Backstage frontend plugins. They enable dependency injection, service abstraction, and clean separation of concerns. Utility APIs are the recommended pattern for accessing external services, managing state, and sharing functionality between components.

---

## Creating a Utility API

### Step 1: Define the API Interface

Create a TypeScript interface that defines the contract:

```tsx
// src/api.ts
export interface ExampleApi {
  /**
   * Fetch data by ID
   * @param id - The unique identifier
   * @returns Promise resolving to the data
   */
  fetchData(id: string): Promise<Data>;

  /**
   * Update data
   * @param id - The unique identifier
   * @param data - The data to update
   */
  updateData(id: string, data: Partial<Data>): Promise<void>;

  /**
   * Subscribe to data changes
   * @param callback - Function called when data changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (data: Data) => void): () => void;
}
```

### Step 2: Create the API Reference

Use `createApiRef` to create a unique reference:

```tsx
import { createApiRef } from '@backstage/frontend-plugin-api';

export const exampleApiRef = createApiRef<ExampleApi>({
  id: 'plugin.example', // Must be unique across all plugins
});
```

**Naming Convention**: Use `plugin.<pluginId>` for plugin-specific APIs.

### Step 3: Implement the API

Create a default implementation:

```tsx
import type { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export class DefaultExampleApi implements ExampleApi {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    }
  ) {}

  async fetchData(id: string): Promise<Data> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl('example');
    const response = await this.options.fetchApi.fetch(`${baseUrl}/data/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    return await response.json();
  }

  async updateData(id: string, data: Partial<Data>): Promise<void> {
    const baseUrl = await this.options.discoveryApi.getBaseUrl('example');
    const response = await this.options.fetchApi.fetch(`${baseUrl}/data/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update data: ${response.statusText}`);
    }
  }

  subscribe(callback: (data: Data) => void): () => void {
    // Implementation of subscription logic
    const intervalId = setInterval(async () => {
      // Poll for changes or use websockets
    }, 5000);

    return () => clearInterval(intervalId);
  }
}
```

### Step 4: Register with ApiBlueprint

Create an extension using `ApiBlueprint`:

```tsx
// src/plugin.ts
import { ApiBlueprint } from '@backstage/frontend-plugin-api';
import { exampleApiRef, DefaultExampleApi } from './api';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';

const exampleApi = ApiBlueprint.make({
  name: 'example',
  params: define =>
    define({
      api: exampleApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DefaultExampleApi({ discoveryApi, fetchApi }),
    }),
});

export const examplePlugin = createFrontendPlugin({
  pluginId: 'example',
  extensions: [exampleApi, /* other extensions */],
});
```

---

## Using Utility APIs

### In React Components

Use the `useApi` hook to access APIs:

```tsx
import { useApi } from '@backstage/core-plugin-api';
import { exampleApiRef } from './api';

export function DataComponent({ id }: { id: string }) {
  const exampleApi = useApi(exampleApiRef);
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    exampleApi
      .fetchData(id)
      .then(result => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exampleApi, id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}
```

### With Suspense

Use React Suspense for cleaner async handling:

```tsx
import { useApi } from '@backstage/core-plugin-api';
import { exampleApiRef } from './api';

function DataComponent({ id }: { id: string }) {
  const exampleApi = useApi(exampleApiRef);
  const data = React.use(exampleApi.fetchData(id)); // React 19+

  return <div>{data.name}</div>;
}

// Wrap with Suspense
function DataWrapper() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <DataComponent id="123" />
    </React.Suspense>
  );
}
```

### In Custom Hooks

Encapsulate API logic in custom hooks:

```tsx
import { useApi } from '@backstage/core-plugin-api';
import { useAsync } from 'react-use';
import { exampleApiRef } from './api';

export function useExampleData(id: string) {
  const exampleApi = useApi(exampleApiRef);

  const { value, loading, error } = useAsync(
    () => exampleApi.fetchData(id),
    [exampleApi, id]
  );

  return { data: value, loading, error };
}

// Usage in component
function DataComponent({ id }: { id: string }) {
  const { data, loading, error } = useExampleData(id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.name}</div>;
}
```

---

## Common API Patterns

### REST Client API

Wrap a REST API with type-safe methods:

```tsx
export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  delete(path: string): Promise<void>;
}

export class DefaultApiClient implements ApiClient {
  constructor(
    private readonly options: {
      discoveryApi: DiscoveryApi;
      fetchApi: FetchApi;
    }
  ) {}

  private async getBaseUrl(): Promise<string> {
    return this.options.discoveryApi.getBaseUrl('example');
  }

  async get<T>(path: string): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.options.fetchApi.fetch(`${baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(`GET ${path} failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.options.fetchApi.fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`POST ${path} failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Implement put and delete similarly
}
```

### Cache API

Implement caching for expensive operations:

```tsx
export interface CacheApi {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(key: string): void;
  clear(): void;
}

export class DefaultCacheApi implements CacheApi {
  private cache = new Map<string, { value: unknown; expires: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl = 60000): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### Event Bus API

Implement pub/sub patterns:

```tsx
type EventCallback<T> = (event: T) => void;

export interface EventBusApi {
  subscribe<T>(event: string, callback: EventCallback<T>): () => void;
  publish<T>(event: string, data: T): void;
}

export class DefaultEventBusApi implements EventBusApi {
  private listeners = new Map<string, Set<EventCallback<unknown>>>();

  subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  publish<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}
```

---

## Testing Utility APIs

### Mocking APIs in Tests

```tsx
import { renderInTestApp, TestApiProvider } from '@backstage/frontend-test-utils';
import { exampleApiRef } from './api';
import { DataComponent } from './DataComponent';

describe('DataComponent', () => {
  it('displays data from API', async () => {
    const mockApi = {
      fetchData: jest.fn().mockResolvedValue({
        id: '123',
        name: 'Test',
      }),
      updateData: jest.fn(),
      subscribe: jest.fn(() => () => {}),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[exampleApiRef, mockApi]]}>
        <DataComponent id="123" />
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    expect(mockApi.fetchData).toHaveBeenCalledWith('123');
  });
});
```

### Creating Test Implementations

```tsx
// src/api.test.ts
export class MockExampleApi implements ExampleApi {
  private data = new Map<string, Data>();

  async fetchData(id: string): Promise<Data> {
    const data = this.data.get(id);
    if (!data) throw new Error('Not found');
    return data;
  }

  async updateData(id: string, updates: Partial<Data>): Promise<void> {
    const existing = this.data.get(id);
    if (!existing) throw new Error('Not found');
    this.data.set(id, { ...existing, ...updates });
  }

  subscribe(callback: (data: Data) => void): () => void {
    return () => {};
  }

  // Test helpers
  setData(id: string, data: Data): void {
    this.data.set(id, data);
  }

  clear(): void {
    this.data.clear();
  }
}
```

---

## Best Practices

### Keep APIs Small and Focused

```tsx
// Good - focused API
export interface UserApi {
  getCurrentUser(): Promise<User>;
  updateProfile(updates: Partial<UserProfile>): Promise<void>;
}

// Bad - too many responsibilities
export interface EverythingApi {
  getUser(): Promise<User>;
  getEntities(): Promise<Entity[]>;
  sendEmail(): Promise<void>;
  uploadFile(): Promise<void>;
  // ... many more methods
}
```

### Use Dependency Injection

```tsx
// Good - depends on abstractions
class DefaultExampleApi implements ExampleApi {
  constructor(deps: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {}
}

// Bad - creates dependencies internally
class BadExampleApi implements ExampleApi {
  private fetch = window.fetch; // Hard-coded dependency
}
```

### Handle Errors Gracefully

```tsx
async fetchData(id: string): Promise<Data> {
  try {
    const baseUrl = await this.discoveryApi.getBaseUrl('example');
    const response = await this.fetchApi.fetch(`${baseUrl}/data/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Data with ID ${id} not found`);
      }
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Log error for debugging
    console.error('fetchData error:', error);
    throw error;
  }
}
```

### Provide Type Safety

```tsx
// Good - fully typed
export interface TypedApi {
  fetchData(id: string): Promise<Data>;
  updateData(id: string, data: Partial<Data>): Promise<void>;
}

// Bad - using any
export interface UntypedApi {
  fetchData(id: any): Promise<any>;
  updateData(data: any): Promise<void>;
}
```

### Document API Methods

```tsx
export interface ExampleApi {
  /**
   * Fetch data by unique identifier.
   *
   * @param id - The unique identifier for the data
   * @returns Promise resolving to the data object
   * @throws {Error} If the data is not found or the request fails
   *
   * @example
   * ```typescript
   * const data = await exampleApi.fetchData('abc123');
   * console.log(data.name);
   * ```
   */
  fetchData(id: string): Promise<Data>;
}
```

---

## Common Core APIs

### Discovery API

Find backend plugin base URLs:

```tsx
import { discoveryApiRef } from '@backstage/core-plugin-api';

const discoveryApi = useApi(discoveryApiRef);
const baseUrl = await discoveryApi.getBaseUrl('catalog');
// Returns: http://localhost:7007/api/catalog
```

### Fetch API

Make authenticated HTTP requests:

```tsx
import { fetchApiRef } from '@backstage/core-plugin-api';

const fetchApi = useApi(fetchApiRef);
const response = await fetchApi.fetch('https://api.example.com/data');
```

### Identity API

Get user information:

```tsx
import { identityApiRef } from '@backstage/core-plugin-api';

const identityApi = useApi(identityApiRef);
const { userEntityRef } = await identityApi.getBackstageIdentity();
// Returns: "user:default/john.doe"
```

### Storage API

Persist data locally:

```tsx
import { storageApiRef } from '@backstage/core-plugin-api';

const storageApi = useApi(storageApiRef);
const bucket = storageApi.forBucket('example');

// Set data
bucket.set('key', { value: 'data' });

// Get data
const data = await bucket.get('key');

// Subscribe to changes
bucket.observe$('key').subscribe(change => {
  console.log('Value changed:', change.value);
});
```

---

## Official Documentation

For comprehensive API documentation:
- [Utility APIs](https://backstage.io/docs/api/utility-apis/)
- [Core APIs](https://backstage.io/docs/reference/core-plugin-api/)
- [Frontend Plugin API](https://backstage.io/docs/reference/frontend-plugin-api/)
