# Crossplane Resources Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-resources-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-resources-backend)

## Overview

The Crossplane Resources backend plugin provides comprehensive functionality for managing Crossplane resources within your Backstage instance. It handles API integration, resource operations, permission management, and MCP actions support, with full compatibility for both Crossplane v1.x and v2.x APIs.

## Features

### Resource Management
- Comprehensive resource data retrieval
- Support for different resource types:
  - Claims and Composite Resources (XRs)
  - Managed Resources (MRs)
  - Additional Resources (XRD, Composition, Function)
  - Full v1.x and v2.x API support

### API Integration
- Direct Kubernetes API communication
- Resource data retrieval and processing
- Event monitoring and streaming
- Resource graph generation
- Support for both API versions

### Permission Management
- Fine-grained access control
- Resource-level permissions
- Action-based permissions
- Integration with Backstage's framework

### MCP Actions
- Resource data retrieval actions
- Event monitoring actions
- Resource graph generation
- Support for both API versions

## Technical Architecture

### Integration Points
- Backstage Permission Framework
- Crossplane Resources Frontend Plugin

### Permission Model
The plugin implements a comprehensive permission model covering:

1. **Resource Types**
    - Claims
    - Composite Resources
    - Managed Resources
    - Additional Resources

2. **Action Types**
    - List resources
    - View YAML configurations
    - Show resource events
    - View resource graphs

3. **Permission Scopes**
    - Global permissions
    - Resource-specific permissions
    - Action-specific permissions

### Security Considerations
- Secure permission validation
- Token-based authentication
- Role-based access control
- Audit logging capabilities

## Integration Benefits

1. **Enhanced Security**
    - Granular access control
    - Consistent permission enforcement
    - Audit trail capabilities

2. **Improved Compliance**
    - Policy-based access control
    - Resource usage tracking
    - Access pattern monitoring

3. **Better User Experience**
    - Seamless integration with frontend
    - Consistent permission behavior
    - Clear access control feedback

## Use Cases

### Resource Access Control
- Control who can view different resource types
- Manage access to sensitive configurations
- Restrict event viewing capabilities

### Compliance Management
- Enforce organizational policies
- Track resource access patterns
- Maintain audit trails

### Team Collaboration
- Define team-specific access levels
- Share resources securely
- Manage cross-team permissions
