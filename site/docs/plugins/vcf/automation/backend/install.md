# Installing the VCF Automation Backend Plugin

This guide will help you install and set up the VCF Automation backend plugin in your Backstage instance.

## Prerequisites

Before installing the plugin, ensure you have:

1. A running Backstage backend instance
2. Access to a VCF Automation service
3. [VCF Ingestor Plugin](../ingestor/about.md) - Required for entity synchronization

## Installation Steps

### 1. Add the Package

Install the plugin package using yarn:

```bash
yarn --cwd packages/backend add @terasky/backstage-plugin-vcf-automation-backend
```

### 2. Add to Backend

Modify your backend in `packages/backend/src/index.ts`:

```typescript
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Add the VCF Automation backend plugin
backend.add(import('@terasky/plugin-vcf-automation-backend'));

backend.start();
```

### 3. Configure Authentication

Add authentication configuration to your `app-config.yaml`:

Single Instance:  
```yaml
vcfAutomation:
  baseUrl: 'https://your-vcf-automation-instance'
  name: demo
  majorVersion: 8
  authentication:
    username: 'your-username'
    password: 'your-password'
    domain: 'your-domain'
```
  
Multi Instance:  
```yaml
vcfAutomation:
  instances:
  - name: my-vcf-01
    baseUrl: 'https://your-vcf-automation-instance'
    majorVersion: 9
    orgName: my-org # This is needed only in VCFA 9 and above
    authentication:
      username: 'your-username'
      password: 'your-password'
  - name: my-vcf-02
    baseUrl: 'https://your-vcf-02-automation-instance'
    majorVersion: 8
    authentication:
      username: 'your-username'
      password: 'your-password'
      domain: 'your-domain'
```

## What's Next?

- [Configure the plugin](configure.md)
- [Learn about the plugin's features](about.md)

## Verification

After installation, verify that:

1. The plugin appears in your package.json dependencies
2. The backend starts without errors
3. API endpoints are accessible
4. Authentication is working
5. Permissions are enforced

## Troubleshooting

Common issues and solutions:

1. **Authentication Issues**
    - Verify credentials
    - Check environment variables
    - Test VCF service access
    - Review error logs

2. **API Connection Problems**
    - Check service URL
    - Verify network access
    - Review proxy settings
    - Test API endpoints

3. **Permission Errors**
    - Check role configuration
    - Verify user permissions
    - Review access policies
    - Test with admin account

4. **Event Streaming Issues**
    - Check WebSocket connection
    - Verify event subscription
    - Review stream configuration
    - Test event flow

For configuration options and customization, proceed to the [Configuration Guide](./configure.md).
