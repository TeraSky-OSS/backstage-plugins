---
name: backstage-backend-plugin
description: "Build Backstage backend plugins with createBackendPlugin and core services: DI, httpRouter, secure-by-default auth, Knex DB, routes, testing. Use for APIs and background jobs."
version: 1.0.0
---

# Backstage Backend Plugin (New Backend System)

## About This Skill

This skill provides specialized knowledge and workflows for building Backstage backend plugins using the New Backend System. It guides the development of server-side functionality including REST/HTTP APIs, background jobs, data processing, and integrations.

### What This Skill Provides

1. **Specialized workflows** - Step-by-step procedures for creating and configuring backend plugins
2. **Best practices** - Production-ready patterns for auth, validation, error handling, and database usage
3. **Golden path templates** - Copy/paste code snippets for common backend patterns
4. **Domain expertise** - Backstage-specific knowledge about DI, core services, and secure-by-default architecture

### When to Use This Skill

Use this skill when creating server-side functionality for Backstage: REST/HTTP APIs, background jobs, data processing, or integrations.

---

# Development Workflow

## Phase 1: Planning and Research

### 1.1 Understand the Requirements

Before building a backend plugin, clearly understand:
- What endpoints or APIs are needed (REST, GraphQL, webhooks)
- What data storage requirements exist (database, cache)
- Whether background jobs or scheduled tasks are needed
- Authentication and authorization requirements
- Integration points with other services or plugins

### 1.2 Load Reference Documentation

Load reference files as needed based on the plugin requirements:

**For Core Services:**
- [⚙️ Core Services Reference](./reference/core_services.md) - Comprehensive guide to all core backend services including:
  - httpRouter, logger, database, httpAuth, userInfo
  - cache, scheduler, urlReader, discovery, permissions
  - Usage patterns and best practices for each service

**For Testing:**
- [✅ Testing Reference](./reference/testing.md) - Comprehensive testing guide for backend plugins

---

## Phase 2: Implementation

Follow the Golden Path workflow below for implementation, referring to reference files as needed.

**Important Decisions:**
- Determine which core services are needed (load [⚙️ Core Services Reference](./reference/core_services.md))
- Plan database schema and migrations if using database
- Design authentication policies (which endpoints need auth?)
- Plan error handling and validation strategies

---

## Phase 3: Testing

After implementing the plugin:

1. Load the [✅ Testing Reference](./reference/testing.md)
2. Write comprehensive tests for:
   - Router endpoints using `startTestBackend`
   - Database operations with `TestDatabases`
   - External service calls with MSW (Mock Service Worker)
   - Authentication flows
3. Run tests and achieve good coverage:
   ```bash
   yarn backstage-cli package test --coverage
   ```

---

## Phase 4: Review and Polish

Before publishing:

1. Run linting and structure checks
2. Ensure proper error handling throughout
3. Verify authentication policies are correct
4. Check database migrations are production-ready
5. Review the Common Pitfalls section below
6. Test horizontal scalability (no in-memory state)

---

## Quick Facts

- Scaffold with `yarn new` → backend‑plugin; the package lives in `plugins/<id>-backend/`.
- Define the plugin with `createBackendPlugin`, declare dependencies via `deps`, and initialize in `register(env).registerInit`.
- Attach routes through `coreServices.httpRouter`. Backstage prefixes plugin routers with `/api/<pluginId>`.
- Backends are secure by default; use `httpRouter.addAuthPolicy({ path, allow })` to allow unauthenticated endpoints like `/health`.
- Core services (logger, database, httpRouter, httpAuth, userInfo, urlReader, scheduler, etc.) are available via `coreServices`.

---

## Production Best Practices

### Request Validation

Validate inputs at the edge using a schema (e.g., zod) before hitting DBs or external services:
  
  ```ts
  import { z } from 'zod';
  const querySchema = z.object({ q: z.string().min(1) });
  router.get('/search', async (req, res, next) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'invalid query' });
    try {
      // ... perform work with parsed.data.q
      res.json({ items: [] });
    } catch (e) { next(e); }
  });
  ```

### Error Handling

Add a terminal error handler to your router and prefer structured logs with context:
  
  ```ts
  import { errorHandler } from '@backstage/backend-common';
  router.use(errorHandler());
  ```

### Auth and Identity

- Keep backends secure-by-default
- Open only explicit paths with `addAuthPolicy`
- For protected routes, extract credentials with `httpAuth`
- Derive user/entity identity via `userInfo` when required
  
  ```ts
  // Inside a route handler
  const creds = await httpAuth.credentials(req, { allow: ['user', 'service'] });
  const { userEntityRef } = await userInfo.getUserInfo(creds);
  logger.info('request', { userEntityRef });
  ```

### Database Usage

- Use `const knex = await database.getClient();` to get a database client
- Keep queries in small repo/service modules
- Write migrations in JavaScript (`.js`) and export them in package.json (see Core Services Reference for details)

### Observability & Scalability

- Avoid in-memory state
- Make handlers idempotent
- Log with `logger.child({ plugin: 'example' })` for traceability

---

## Golden Path (Copy/Paste Workflow)

### 1) Scaffold

```bash
# From the repository root (interactive)
yarn new
# Select: backend-plugin
# Plugin id (without -backend suffix), e.g. example

# Non-interactive (for AI agents/automation)
yarn new --select backend-plugin --option pluginId=example --option owner=""
```

This creates `plugins/example-backend/` using the New Backend System with `createBackendPlugin`.

([Backstage][3])

### 2) `src/plugin.ts` — plugin + DI + router

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
        database: coreServices.database,     // optional
        httpAuth: coreServices.httpAuth,     // optional
        userInfo: coreServices.userInfo,     // optional
      },
      async init({ httpRouter, logger, database, httpAuth, userInfo }) {
        const router = await createRouter({ logger, database, httpAuth, userInfo });
        httpRouter.use(router);

        // Secure-by-default: open /health only
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});

export { examplePlugin as default } from './plugin';
```

Key points: DI via `deps`, register routes with the plugin’s `httpRouter`, and export the plugin as the default. ([Backstage][3])

### 3) `src/service/router.ts` — minimal Express router

```ts
import express from 'express';
import type {
  LoggerService,
  DatabaseService,
  HttpAuthService,
  UserInfoService,
} from '@backstage/backend-plugin-api';

export interface RouterOptions {
  logger: LoggerService;
  database?: DatabaseService;
  httpAuth?: HttpAuthService;
  userInfo?: UserInfoService;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger } = options;
  const router = express.Router();

  router.get('/health', (_req, res) => {
    logger.info('health check');
    res.json({ status: 'ok' });
  });

  return router;
}
```

### 4) Add to your backend

In `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
backend.add(import('@internal/plugin-example-backend'));
backend.start();
```

Now `GET http://localhost:7007/api/example/health` returns `{ "status": "ok" }`. ([Backstage][3])

### 5) Database, auth, identity (when needed)

- Database: depend on `coreServices.database` to get a Knex client; create your own migrations and run them via your chosen process. ([Backstage][3])
- Identity: use `coreServices.httpAuth` + `coreServices.userInfo` to obtain the calling user and their entity refs when an endpoint needs identity. ([Backstage][3])
- Core services catalog: consult the Backstage Core Backend Service APIs for the full list (cache, scheduler, urlReader, etc.). ([Backstage][4])

---

## Verify in a Backstage backend

- Add the plugin to `packages/backend/src/index.ts` via `backend.add(import('@internal/plugin-<id>-backend'))`.
- Start the repo (e.g., `yarn start` at the root). Then check:
  - GET http://localhost:7007/api/example/health → `{ "status": "ok" }`
  - If 401 occurs, ensure you opened `/health` with `addAuthPolicy`.

## Testing, linting & structure checks

Use Backstage's CLI for tests and lints:

```bash
yarn backstage-cli package test
yarn backstage-cli package lint
yarn backstage-cli repo lint
```

Keep routers small (`/service/router.ts`), inject dependencies (DB, auth, clients) from `plugin.ts`, and avoid in-memory state (horizontally scalable).

---

## Common Pitfalls (and Fixes)

| Problem | Solution | Reference |
| ------- | -------- | --------- |
| **404s under `/api`** | Remember Backstage prefixes plugin routers with `/api/<pluginId>` | [Backstage][3] |
| **Auth unexpectedly required** | Backends are secure by default; open endpoints explicitly via `httpRouter.addAuthPolicy` | [Backstage][3] |
| **Tight coupling** | Never call other backend code directly; communicate over the network or through well-defined services | [Backstage][3] |

---

# Reference Files

## 📚 Documentation Library

Load these resources as needed during development:

### Core Services
- [⚙️ Core Services Reference](./reference/core_services.md) - Complete guide to all core backend services including:
  - HTTP Router Service for route registration
  - Logger Service for structured logging
  - Database Service for Knex-based data access
  - HTTP Auth Service and User Info Service for authentication
  - Cache Service for key-value storage
  - Scheduler Service for background tasks
  - Discovery Service for inter-plugin communication
  - URL Reader Service for reading external content
  - Permissions Service for authorization
  - Configuration and health check services
  - Service composition examples and best practices

### Testing
- [✅ Testing Reference](./reference/testing.md) - Comprehensive testing guide including:
  - Testing backend plugins with `startTestBackend`
  - Mock services for all core services
  - Testing routers with supertest
  - Testing authentication and permissions
  - External service mocking with MSW
  - Database testing with `TestDatabases`
  - Service factory testing
  - Integration testing patterns
  - Best practices and common patterns

---

## External References

- Backend plugins: scaffolding, DI, `httpRouter`, `/api/<pluginId>`, secure‑by‑default, DB & identity usage. ([Backstage][3])
- Core Backend Service APIs index (logger, database, httpAuth, scheduler, urlReader, etc.). ([Backstage][4])
- Anthropic Skill spec & packaging details (required metadata; ≤200 char description). ([Claude Help Center][2])

[2]: https://support.claude.com/en/articles/12512198-creating-custom-skills
[3]: https://backstage.io/docs/plugins/backend-plugin/
[4]: https://backstage.io/docs/backend-system/core-services/index/
