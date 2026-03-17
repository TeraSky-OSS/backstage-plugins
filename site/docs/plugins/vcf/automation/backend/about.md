# VCF Automation Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation-backend)

## Overview

The VCF Automation backend plugin provides the backend services required for the VCF Automation frontend plugin. It handles API integration with VCF services, manages permissions, and processes deployment and resource operations.

## Features

### API Integration
- Seamless integration with VCF Automation services
- API endpoint management
- Service communication

### Permission Management
- Built-in support for Backstage's permission framework
- Access control management
- Resource authorization

### Entity Processing
- Entity relationship mapping
- Entity updates
- State management

### Operation Management
- Deployment operations
- Resource management
- Operation processing

### Event Handling
- VCF events management
- Event streaming
- Notification handling

## API Endpoints

The plugin exposes the following endpoints:

```typescript
// Get deployment details
GET /api/vcf-automation/deployments/:id

// Get resource details
GET /api/vcf-automation/resources/:id

// Get project details
GET /api/vcf-automation/projects/:id

// Execute deployment operations
POST /api/vcf-automation/deployments/:id/operations

// Stream VCF events
GET /api/vcf-automation/events
```

## Links

- [Installation Guide](install.md)
- [Configuration Guide](configure.md)
