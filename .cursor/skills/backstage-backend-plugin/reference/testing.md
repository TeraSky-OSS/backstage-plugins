# Backend Plugin Testing Reference

## Overview

Comprehensive testing ensures backend plugins work correctly and helps catch issues before production. Backstage provides specialized testing utilities in the `@backstage/backend-test-utils` package for creating test backends, mocking services, and simulating real-world scenarios.

---

## Testing Setup

### Install Dependencies

```json
{
  "devDependencies": {
    "@backstage/backend-test-utils": "^0.4.0",
    "@backstage/test-databases": "^0.1.0",
    "msw": "^1.0.0",
    "supertest": "^6.0.0"
  }
}
```

### Test File Structure

Organize tests alongside source files:

```
src/
├── service/
│   ├── router.ts
│   └── router.test.ts
├── database/
│   ├── repository.ts
│   └── repository.test.ts
└── plugin.test.ts
```

---

## Testing Backend Plugins

### Basic Plugin Testing

Use `startTestBackend` to create a test harness:

```ts
import { startTestBackend } from '@backstage/backend-test-utils';
import { examplePlugin } from './plugin';
import { mockServices } from '@backstage/backend-test-utils';

describe('examplePlugin', () => {
  it('initializes successfully', async () => {
    const { server } = await startTestBackend({
      features: [
        examplePlugin(),
        mockServices.rootConfig.factory({
          data: {
            example: {
              apiKey: 'test-key',
            },
          },
        }),
      ],
    });

    expect(server).toBeDefined();
  });

  it('serves endpoints correctly', async () => {
    const { server } = await startTestBackend({
      features: [examplePlugin()],
    });

    const response = await server.request('/api/example/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

---

## Mock Services

### Available Mock Services

Mock all core services for testing:

```ts
import { mockServices } from '@backstage/backend-test-utils';

const { server } = await startTestBackend({
  features: [
    examplePlugin(),
    mockServices.logger.factory(),
    mockServices.database.factory(),
    mockServices.cache.factory(),
    mockServices.rootConfig.factory({ data: config }),
  ],
});
```

**Available Mocks**:
- `mockServices.logger` - Logger service
- `mockServices.database` - Database service
- `mockServices.cache` - Cache service
- `mockServices.rootConfig` - Configuration service
- `mockServices.auth` - Auth service
- `mockServices.httpAuth` - HTTP auth service
- `mockServices.userInfo` - User info service
- `mockServices.discovery` - Discovery service
- `mockServices.permissions` - Permissions service
- `mockServices.scheduler` - Scheduler service
- `mockServices.urlReader` - URL reader service

### Mock Logger

Capture log output for assertions:

```ts
import { mockServices } from '@backstage/backend-test-utils';

describe('logging', () => {
  it('logs important events', async () => {
    const mockLogger = mockServices.logger.mock();

    const { server } = await startTestBackend({
      features: [examplePlugin(), mockLogger.factory],
    });

    await server.request('/api/example/process');

    expect(mockLogger.info).toHaveBeenCalledWith('Processing started');
  });
});
```

### Mock Configuration

Provide test configuration:

```ts
const mockConfig = mockServices.rootConfig.factory({
  data: {
    example: {
      apiUrl: 'https://test.example.com',
      timeout: 5000,
      retries: 3,
    },
  },
});

const { server } = await startTestBackend({
  features: [examplePlugin(), mockConfig],
});
```

### Mock Database

Use in-memory database for tests:

```ts
import { mockServices } from '@backstage/backend-test-utils';

describe('database operations', () => {
  it('stores and retrieves data', async () => {
    const { server } = await startTestBackend({
      features: [
        examplePlugin(),
        mockServices.database.factory(),
      ],
    });

    // Create data
    await server.request('/api/example/data').send({ name: 'Test' });

    // Retrieve data
    const response = await server.request('/api/example/data');
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Test');
  });
});
```

---

## Testing Routers

### Testing with Supertest

Test Express routers directly:

```ts
import request from 'supertest';
import express from 'express';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

describe('router', () => {
  let app: express.Express;

  beforeEach(async () => {
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      database: await mockServices.database.mock(),
      httpAuth: mockServices.httpAuth.mock(),
      userInfo: mockServices.userInfo.mock(),
    });

    app = express();
    app.use('/api/example', router);
  });

  it('returns health status', async () => {
    const response = await request(app).get('/api/example/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('validates request body', async () => {
    const response = await request(app)
      .post('/api/example/data')
      .send({ invalid: 'data' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

### Testing Authentication

Mock authenticated requests:

```ts
import { mockServices } from '@backstage/backend-test-utils';

describe('authenticated routes', () => {
  it('requires authentication', async () => {
    const mockHttpAuth = mockServices.httpAuth.mock({
      credentials: jest.fn().mockRejectedValue(new Error('Unauthorized')),
    });

    const router = await createRouter({
      logger: mockServices.logger.mock(),
      httpAuth: mockHttpAuth,
      userInfo: mockServices.userInfo.mock(),
    });

    const app = express();
    app.use(router);

    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
  });

  it('allows authenticated users', async () => {
    const mockHttpAuth = mockServices.httpAuth.mock({
      credentials: jest.fn().mockResolvedValue({
        principal: { type: 'user', userEntityRef: 'user:default/test' },
      }),
    });

    const mockUserInfo = mockServices.userInfo.mock({
      getUserInfo: jest.fn().mockResolvedValue({
        userEntityRef: 'user:default/test',
        ownershipEntityRefs: ['user:default/test'],
      }),
    });

    const router = await createRouter({
      logger: mockServices.logger.mock(),
      httpAuth: mockHttpAuth,
      userInfo: mockUserInfo,
    });

    const app = express();
    app.use(router);

    const response = await request(app).get('/protected');
    expect(response.status).toBe(200);
  });
});
```

---

## Testing External Services

### Using MSW (Mock Service Worker)

Intercept HTTP requests to external services:

```ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { registerMswTestHooks } from '@backstage/backend-test-utils';

const server = setupServer();
registerMswTestHooks(server);

describe('external API integration', () => {
  it('fetches data from external API', async () => {
    // Mock external API response
    server.use(
      rest.get('https://api.example.com/data', (req, res, ctx) => {
        return res(
          ctx.json({
            id: '123',
            name: 'Test Data',
          })
        );
      })
    );

    const { server: testServer } = await startTestBackend({
      features: [examplePlugin()],
    });

    const response = await testServer.request('/api/example/fetch/123');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Test Data');
  });

  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('https://api.example.com/data', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
      })
    );

    const { server: testServer } = await startTestBackend({
      features: [examplePlugin()],
    });

    const response = await testServer.request('/api/example/fetch/123');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
```

### MSW Setup Helpers

Use `registerMswTestHooks` for automatic cleanup:

```ts
import { setupServer } from 'msw/node';
import { registerMswTestHooks } from '@backstage/backend-test-utils';

const handlers = [
  rest.get('https://api.example.com/*', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }));
  }),
];

const server = setupServer(...handlers);

// Automatically sets up beforeAll, afterAll, and afterEach hooks
registerMswTestHooks(server);

describe('tests', () => {
  // Tests run with MSW handlers active
});
```

---

## Database Testing

### Using Test Databases

Run tests against real database engines:

```ts
import { TestDatabases } from '@backstage/backend-test-utils';

describe('database integration', () => {
  const databases = TestDatabases.create();

  it.each(databases.eachSupportedId())(
    'works with %s',
    async databaseId => {
      const knex = await databases.init(databaseId);

      // Run migrations
      await knex.schema.createTable('users', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
      });

      // Test database operations
      await knex('users').insert({ name: 'Test User' });
      const users = await knex('users').select('*');

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Test User');
    },
    60_000 // Timeout for database setup
  );
});
```

**Supported Databases**:
- PostgreSQL
- MySQL
- SQLite

### Repository Testing

Test database repositories:

```ts
import { mockServices } from '@backstage/backend-test-utils';

describe('UserRepository', () => {
  let repository: UserRepository;
  let database: DatabaseService;

  beforeEach(async () => {
    database = await mockServices.database.mock();
    repository = new UserRepository(database);

    // Setup schema
    const knex = await database.getClient();
    await knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.string('name').notNullable();
    });
  });

  it('creates users', async () => {
    const user = await repository.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('finds users by email', async () => {
    await repository.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    const user = await repository.findByEmail('test@example.com');

    expect(user).toBeDefined();
    expect(user?.name).toBe('Test User');
  });

  it('handles unique constraint violations', async () => {
    await repository.create({
      email: 'test@example.com',
      name: 'Test User',
    });

    await expect(
      repository.create({
        email: 'test@example.com',
        name: 'Another User',
      })
    ).rejects.toThrow();
  });
});
```

---

## Service Factory Testing

### Testing Custom Services

Test service factories in isolation:

```ts
import { ServiceFactoryTester } from '@backstage/backend-test-utils';
import { myServiceRef, myServiceFactory } from './service';

describe('myServiceFactory', () => {
  it('creates service instance', async () => {
    const tester = ServiceFactoryTester.from(myServiceFactory);

    const service = await tester.get();

    expect(service).toBeDefined();
    expect(service.doSomething).toBeInstanceOf(Function);
  });

  it('uses dependencies correctly', async () => {
    const tester = ServiceFactoryTester.from(myServiceFactory, {
      dependencies: [
        mockServices.logger.factory(),
        mockServices.database.factory(),
      ],
    });

    const service = await tester.get();
    const result = await service.doSomething();

    expect(result).toBeDefined();
  });
});
```

---

## Integration Testing

### Full Backend Testing

Test entire backend with multiple plugins:

```ts
import { startTestBackend } from '@backstage/backend-test-utils';
import { examplePlugin } from './plugin';
import { catalogPlugin } from '@backstage/plugin-catalog-backend';

describe('integration tests', () => {
  it('integrates with catalog', async () => {
    const { server } = await startTestBackend({
      features: [
        examplePlugin(),
        catalogPlugin(),
      ],
    });

    // Create entity in catalog
    await server.request('/api/catalog/entities')
      .post({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: { name: 'test' },
        },
      });

    // Use example plugin with catalog data
    const response = await server.request('/api/example/component/test');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('test');
  });
});
```

---

## Best Practices

### Test Organization

```ts
describe('PluginName', () => {
  describe('initialization', () => {
    it('starts successfully', () => { /* ... */ });
    it('loads configuration', () => { /* ... */ });
  });

  describe('endpoints', () => {
    describe('GET /data', () => {
      it('returns data', () => { /* ... */ });
      it('validates query parameters', () => { /* ... */ });
      it('handles errors', () => { /* ... */ });
    });

    describe('POST /data', () => {
      it('creates data', () => { /* ... */ });
      it('validates request body', () => { /* ... */ });
      it('requires authentication', () => { /* ... */ });
    });
  });

  describe('database', () => {
    it('stores data correctly', () => { /* ... */ });
    it('enforces constraints', () => { /* ... */ });
  });
});
```

### Async Cleanup

Always clean up async operations:

```ts
describe('async operations', () => {
  let cleanup: () => Promise<void>;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  it('performs async work', async () => {
    const { server, stop } = await startTestBackend({
      features: [examplePlugin()],
    });

    cleanup = stop;

    // Perform tests
  });
});
```

### Mock Reset

Reset mocks between tests:

```ts
describe('tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Tests...
});
```

### Error Testing

Test error scenarios:

```ts
describe('error handling', () => {
  it('returns 404 for missing data', async () => {
    const response = await request(app).get('/api/example/data/nonexistent');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('returns 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/example/data')
      .send({ invalid: 'schema' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('validation');
  });

  it('handles database errors', async () => {
    const mockDb = mockServices.database.mock();
    jest.spyOn(mockDb, 'getClient').mockRejectedValue(new Error('DB Error'));

    const router = await createRouter({ database: mockDb });

    const response = await request(app).get('/api/example/data');

    expect(response.status).toBe(500);
  });
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
yarn backstage-cli package test router.test.ts

# Run tests matching pattern
yarn backstage-cli package test --testNamePattern="authentication"
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Backend Plugin
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: yarn install --frozen-lockfile
      - run: yarn backstage-cli package test --coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/clover.xml
```

---

## Common Testing Patterns

### Testing Pagination

```ts
describe('pagination', () => {
  it('returns first page', async () => {
    // Create test data
    for (let i = 0; i < 50; i++) {
      await createData({ name: `Item ${i}` });
    }

    const response = await request(app)
      .get('/api/example/data')
      .query({ limit: 10, offset: 0 });

    expect(response.body.items).toHaveLength(10);
    expect(response.body.total).toBe(50);
  });

  it('returns subsequent pages', async () => {
    const response = await request(app)
      .get('/api/example/data')
      .query({ limit: 10, offset: 10 });

    expect(response.body.items).toHaveLength(10);
    expect(response.body.items[0].name).toBe('Item 10');
  });
});
```

### Testing Scheduled Tasks

```ts
describe('scheduled tasks', () => {
  it('runs task on schedule', async () => {
    jest.useFakeTimers();

    const mockScheduler = mockServices.scheduler.mock();
    let taskFn: () => Promise<void>;

    mockScheduler.scheduleTask.mockImplementation(async ({ fn }) => {
      taskFn = fn;
    });

    await startTestBackend({
      features: [examplePlugin(), mockScheduler.factory],
    });

    // Manually trigger task
    await taskFn!();

    // Verify task executed
    expect(mockLogger.info).toHaveBeenCalledWith('Task executed');

    jest.useRealTimers();
  });
});
```

---

## Official Documentation

For comprehensive testing guidance:
- [Testing Backend Plugins](https://backstage.io/docs/backend-system/building-plugins-and-modules/testing/)
- [Backend Test Utils](https://backstage.io/docs/reference/backend-test-utils/)
- [Testing with Jest](https://backstage.io/docs/plugins/testing/)
