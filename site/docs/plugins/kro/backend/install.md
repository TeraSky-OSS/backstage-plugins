# Installing the KRO Permissions Backend Plugin

## Prerequisites

- Backstage backend
- Permission framework enabled
- Kubernetes plugin

## Installation Steps

1. Install the plugin package:

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @terasky/backstage-plugin-kro-permissions-backend
```

2. Create a new file for the plugin:

```ts
// packages/backend/src/plugins/kro.ts
import { createRouter } from '@terasky/backstage-plugin-kro-permissions-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    discovery: env.discovery,
    permissions: env.permissions,
  });
}
```

3. Add the plugin to your backend:

```ts
// In your backend initialization
backend.add(import('@terasky/backstage-plugin-kro-permissions-backend'));
```
