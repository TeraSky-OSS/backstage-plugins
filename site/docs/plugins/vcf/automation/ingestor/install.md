# Installing the VCF Automation Ingestor Plugin

This guide will help you install and set up the VCF Automation Ingestor plugin in your Backstage instance.

## Installation Steps

### 1. Install the Plugin

Install the plugin package in your Backstage backend:

```bash
yarn add --cwd packages/backend @terasky/backstage-plugin-vcf-automation-ingestor
```

### 2. Register the Plugin

Import and register the plugin in your `packages/backend/index.ts`:

```typescript
backend.add(import('@terasky/backstage-plugin-vcf-automation-ingestor'));
```

## What's Next?

- [Configure the plugin](configure.md)
- [Learn about the plugin's features](about.md)
