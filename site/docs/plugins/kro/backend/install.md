# Installing the KRO Resources Backend Plugin

## Prerequisites

- Backstage backend
- Permission framework enabled
- Kubernetes plugin

## Installation Steps

1. Install the required packages:

```bash
# From your Backstage root directory
yarn --cwd packages/backend add @terasky/backstage-plugin-kro-resources-backend 
```
2. Add the plugin to your backend:

```ts
// In your backend initialization
backend.add(import('@terasky/backstage-plugin-kro-resources-backend'));
```

## Troubleshooting

Common issues and solutions:

1. **Permission Errors**: Ensure the service account has necessary RBAC permissions
2. **Connection Issues**: Verify Kubernetes cluster configuration
3. **Missing Dependencies**: Check all required packages are installed
4. **MCP Action Errors**: Verify MCP configuration in app-config.yaml
