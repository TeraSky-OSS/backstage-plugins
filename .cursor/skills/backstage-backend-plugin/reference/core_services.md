# Core Backend Services Reference

## Overview

Backstage's backend system provides core services through dependency injection. All services are accessed via `coreServices` from `@backstage/backend-plugin-api`. Services handle common backend needs like logging, database access, HTTP routing, authentication, and more.

---

## Essential Services

### HTTP Router Service

Manages HTTP route registration for plugins.

**Import**: `coreServices.httpRouter`

**Type**: `HttpRouterService`

**Usage**:

```ts
import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const examplePlugin = createBackendPlugin({
  pluginId: 'example',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
      },
      async init({ httpRouter }) {
        const router = createRouter();
        httpRouter.use(router);

        // Open specific paths to unauthenticated access
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
```

**Key Methods**:
- `use(handler)`: Add Express middleware/router
- `addAuthPolicy(policy)`: Configure authentication requirements

**Auth Policies**:

```ts
// Allow unauthenticated access
httpRouter.addAuthPolicy({
  path: '/health',
  allow: 'unauthenticated',
});

// Require user authentication
httpRouter.addAuthPolicy({
  path: '/api/data',
  allow: 'user-cookie',
});
```

**Important**: Backstage prefixes all plugin routes with `/api/<pluginId>`. A route defined as `/data` becomes `/api/example/data`.

---

### Logger Service

Provides structured logging capabilities.

**Import**: `coreServices.logger`

**Type**: `LoggerService`

**Usage**:

```ts
env.registerInit({
  deps: {
    logger: coreServices.logger,
  },
  async init({ logger }) {
    logger.info('Plugin initialized');
    logger.error('Failed to process request', { userId: '123', error });
    logger.debug('Detailed debug info', { metadata: data });

    // Create child logger with context
    const childLogger = logger.child({ plugin: 'example', component: 'api' });
    childLogger.info('Processing request'); // Includes plugin and component in output
  },
});
```

**Log Levels**:
- `debug()`: Detailed debugging information
- `info()`: General informational messages
- `warn()`: Warning messages
- `error()`: Error messages

**Best Practices**:
- Use child loggers to add context
- Include relevant metadata in structured format
- Log errors with full context for debugging
- Avoid logging sensitive information

---

### Database Service

Provides database access through Knex.js.

**Import**: `coreServices.database`

**Type**: `DatabaseService`

**Usage**:

```ts
env.registerInit({
  deps: {
    database: coreServices.database,
    logger: coreServices.logger,
  },
  async init({ database, logger }) {
    const knex = await database.getClient();

    // Query data
    const users = await knex('users')
      .where({ active: true })
      .select('id', 'name', 'email');

    logger.info('Found users', { count: users.length });

    // Insert data
    await knex('users').insert({
      name: 'John Doe',
      email: 'john@example.com',
      created_at: knex.fn.now(),
    });

    // Update data
    await knex('users')
      .where({ id: 123 })
      .update({ last_login: knex.fn.now() });
  },
});
```

**Migration Pattern**:

> **Note**: Migrations must be written in JavaScript (`.js`), not TypeScript. Backstage runs Knex migrations at runtime inside your backend service, and the default runtime does not include TypeScript loaders. Third-party plugins ship their migrations as compiled JavaScript files (`.../migrations/*.js`). Export migration files in your `package.json` to ensure Docker containers include them. ([Backstage Knex Migrations](https://backstage.io/docs/tutorials/manual-knex-rollback/))

```js
// migrations/001_create_users_table.js
exports.up = async function(knex) {
  await knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['email']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('users');
};
```

**Exporting Migrations**:

Include migrations in your `package.json` exports:

```json
{
  "files": [
    "dist",
    "migrations/**/*.js"
  ]
}
```

**Best Practices**:
- Always write migrations for schema changes
- Use transactions for multi-step operations
- Index frequently queried columns
- Keep queries in repository/service modules
- Avoid N+1 queries - use joins or batch loading

---

### HTTP Auth Service

Handles authentication and credential extraction.

**Import**: `coreServices.httpAuth`

**Type**: `HttpAuthService`

**Usage**:

```ts
import express from 'express';

router.get('/protected', async (req, res) => {
  try {
    // Extract credentials from request
    const credentials = await httpAuth.credentials(req, {
      allow: ['user', 'service'], // Allow user or service tokens
    });

    // Credentials contain token and principal info
    logger.info('Authenticated request', {
      principal: credentials.principal,
    });

    res.json({ message: 'Success' });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

**Credential Types**:
- `user`: End-user authentication
- `service`: Service-to-service authentication
- `none`: No authentication

**Authentication Flow**:

```ts
// 1. Extract credentials
const creds = await httpAuth.credentials(req, { allow: ['user'] });

// 2. Get user info (if needed)
const { userEntityRef } = await userInfo.getUserInfo(creds);

// 3. Use in business logic
logger.info('User action', { user: userEntityRef });
```

---

### User Info Service

Retrieves user information from credentials.

**Import**: `coreServices.userInfo`

**Type**: `UserInfoService`

**Usage**:

```ts
router.post('/create', async (req, res) => {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const userInfo = await userInfoService.getUserInfo(credentials);

  logger.info('Creating resource', {
    user: userInfo.userEntityRef,
    ownershipEntityRefs: userInfo.ownershipEntityRefs,
  });

  // Create resource owned by user
  const resource = await createResource({
    ...req.body,
    owner: userInfo.userEntityRef,
  });

  res.json(resource);
});
```

**UserInfo Properties**:
- `userEntityRef`: User entity reference (e.g., `user:default/john.doe`)
- `ownershipEntityRefs`: All entity refs the user belongs to (user + groups)

---

### Discovery Service

Finds base URLs for backend plugins.

**Import**: `coreServices.discovery`

**Type**: `DiscoveryService`

**Usage**:

```ts
const baseUrl = await discovery.getBaseUrl('catalog');
// Returns: http://localhost:7007/api/catalog

// Make request to another plugin
const response = await fetch(`${baseUrl}/entities`, {
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Best Practices**:
- Use discovery instead of hardcoding URLs
- Cache base URLs if making many requests
- Use for inter-plugin communication

---

### Scheduler Service

Schedules distributed background tasks.

**Import**: `coreServices.scheduler`

**Type**: `SchedulerService`

**Usage**:

```ts
env.registerInit({
  deps: {
    scheduler: coreServices.scheduler,
    logger: coreServices.logger,
  },
  async init({ scheduler, logger }) {
    // Schedule task to run every hour
    await scheduler.scheduleTask({
      id: 'cleanup-old-data',
      frequency: { hours: 1 },
      timeout: { minutes: 15 },
      fn: async () => {
        logger.info('Running cleanup task');
        // Perform cleanup
      },
    });

    // Schedule with cron expression
    await scheduler.scheduleTask({
      id: 'daily-report',
      frequency: { cron: '0 9 * * *' }, // 9 AM daily
      timeout: { minutes: 30 },
      fn: async () => {
        logger.info('Generating daily report');
        // Generate report
      },
    });
  },
});
```

**Frequency Options**:
- `{ hours: number }`: Run every N hours
- `{ minutes: number }`: Run every N minutes
- `{ cron: string }`: Use cron expression

**Best Practices**:
- Make tasks idempotent
- Set appropriate timeouts
- Handle failures gracefully
- Log task execution for monitoring

---

### Cache Service

Provides key-value caching.

**Import**: `coreServices.cache`

**Type**: `CacheService`

**Usage**:

```ts
env.registerInit({
  deps: {
    cache: coreServices.cache,
  },
  async init({ cache }) {
    // Set with TTL (time-to-live)
    await cache.set('user:123', { name: 'John' }, { ttl: 3600000 }); // 1 hour

    // Get from cache
    const user = await cache.get('user:123');

    // Delete from cache
    await cache.delete('user:123');

    // Wrap expensive operation with cache
    async function getExpensiveData(id: string) {
      const cacheKey = `data:${id}`;
      const cached = await cache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const data = await fetchExpensiveData(id);
      await cache.set(cacheKey, data, { ttl: 600000 }); // 10 minutes
      return data;
    }
  },
});
```

**Cache Methods**:
- `get(key)`: Retrieve value
- `set(key, value, options?)`: Store value with optional TTL
- `delete(key)`: Remove value
- `withOptions(options)`: Create cache instance with default options

---

### URL Reader Service

Reads content from external systems.

**Import**: `coreServices.urlReader`

**Type**: `UrlReaderService`

**Usage**:

```ts
env.registerInit({
  deps: {
    urlReader: coreServices.urlReader,
  },
  async init({ urlReader }) {
    // Read from URL
    const response = await urlReader.readUrl('https://example.com/data.json');
    const buffer = await response.buffer();
    const text = buffer.toString('utf-8');
    const data = JSON.parse(text);

    // Read tree of files (e.g., from Git)
    const tree = await urlReader.readTree('https://github.com/org/repo/tree/main');
    const files = await tree.files();

    for (const file of files) {
      const content = await file.content();
      console.log(file.path, content.toString());
    }
  },
});
```

**Supported Protocols**:
- HTTP/HTTPS
- GitHub
- GitLab
- Bitbucket
- Azure DevOps

---

### Root Config Service

Provides access to static configuration.

**Import**: `coreServices.rootConfig`

**Type**: `RootConfigService`

**Usage**:

```ts
env.registerInit({
  deps: {
    config: coreServices.rootConfig,
  },
  async init({ config }) {
    // Read configuration values
    const apiKey = config.getString('example.apiKey');
    const timeout = config.getNumber('example.timeout');
    const enabled = config.getBoolean('example.enabled');

    // Optional values
    const optional = config.getOptionalString('example.optional');

    // Configuration objects
    const settings = config.getConfig('example.settings');
    const nestedValue = settings.getString('nested.key');
  },
});
```

**Configuration Example** (`app-config.yaml`):

```yaml
example:
  apiKey: ${EXAMPLE_API_KEY}
  timeout: 5000
  enabled: true
  settings:
    nested:
      key: value
```

---

### Permissions Service

Integrates authorization for user actions.

**Import**: `coreServices.permissions`

**Type**: `PermissionsService`

**Usage**:

```ts
import { createPermission } from '@backstage/plugin-permission-common';

// Define permission
export const exampleDeletePermission = createPermission({
  name: 'example.delete',
  attributes: { action: 'delete' },
});

// Check permission in route
router.delete('/data/:id', async (req, res) => {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });

  const decision = await permissions.authorize(
    [{ permission: exampleDeletePermission }],
    { credentials }
  );

  if (decision[0].result === 'DENY') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Proceed with deletion
  await deleteData(req.params.id);
  res.json({ success: true });
});
```

---

### Root Health Service

Provides backend health check endpoints.

**Import**: `coreServices.rootHealth`

**Type**: `RootHealthService`

**Usage**:

```ts
env.registerInit({
  deps: {
    rootHealth: coreServices.rootHealth,
  },
  async init({ rootHealth }) {
    // Register health check
    rootHealth.registerReadinessCheck({
      id: 'example-database',
      check: async () => {
        try {
          await knex.raw('SELECT 1');
          return { status: 'ok' };
        } catch (error) {
          return { status: 'error', message: error.message };
        }
      },
    });
  },
});
```

---

## Service Composition Example

Combining multiple services in a real plugin:

```ts
import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const examplePlugin = createBackendPlugin({
  pluginId: 'example',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        database: coreServices.database,
        httpAuth: coreServices.httpAuth,
        userInfo: coreServices.userInfo,
        cache: coreServices.cache,
        scheduler: coreServices.scheduler,
        config: coreServices.rootConfig,
      },
      async init({
        httpRouter,
        logger,
        database,
        httpAuth,
        userInfo,
        cache,
        scheduler,
        config,
      }) {
        // Initialize router with all services
        const router = await createRouter({
          logger,
          database,
          httpAuth,
          userInfo,
          cache,
          config,
        });

        httpRouter.use(router);
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });

        // Schedule background task
        await scheduler.scheduleTask({
          id: 'example-sync',
          frequency: { hours: 6 },
          timeout: { minutes: 30 },
          fn: async () => {
            logger.info('Running scheduled sync');
            // Sync logic
          },
        });

        logger.info('Example plugin initialized');
      },
    });
  },
});
```

---

## Best Practices

### Service Organization

Keep router creation separate:

```ts
// src/service/router.ts
export interface RouterOptions {
  logger: LoggerService;
  database: DatabaseService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, database, httpAuth, userInfo } = options;
  const router = express.Router();

  // Define routes using services
  router.get('/data', async (req, res) => {
    const creds = await httpAuth.credentials(req, { allow: ['user'] });
    const info = await userInfo.getUserInfo(creds);
    // ...
  });

  return router;
}
```

### Error Handling

Use error middleware:

```ts
import { errorHandler } from '@backstage/backend-common';

const router = express.Router();
// ... define routes
router.use(errorHandler());
```

### Horizontal Scalability

Avoid in-memory state:

```ts
// Bad - breaks with multiple instances
const cache = new Map();

// Good - use cache service
const value = await cache.get(key);
```

---

## Official Documentation

For complete service references:
- [Core Backend Services](https://backstage.io/docs/backend-system/core-services/)
- [Backend Plugin API](https://backstage.io/docs/reference/backend-plugin-api/)
