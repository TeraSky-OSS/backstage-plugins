# Kubernetes Resources Permissions Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-permissions-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-permissions-backend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-kubernetes-resources-permissions-backend)

## Overview

The Kubernetes Resources Permissions backend plugin provides comprehensive permission management and access control for Kubernetes resources within your Backstage instance. It integrates seamlessly with Backstage's permission framework to enforce fine-grained access policies for different types of Kubernetes resources.

## Features

### Permission Management
- Fine-grained access control for Kubernetes resources

### Access Control
- Resource-level permissions
- Action-based permissions (list, view YAML, show events)
- Integration with Backstage's permission framework

### API Endpoints
- Permission check endpoints
- Resource access validation
- Policy enforcement endpoints

## Technical Architecture

### Integration Points
- Backstage Permission Framework
- Kubernetes Resources Frontend Plugin

### Permission Model
The plugin implements a comprehensive permission model covering:

#### Permissions:
  
* List Kubernetes Resources: kubernetes-resources.resources.list
    * Controls whether a user can list and view Kubernetes resources
* List Kubernetes Secrets: kubernetes-resources.secrets.list
    * Controls whether a user can list and view Secret resources
* View Secret YAML: kubernetes-resources.secrets.view-yaml
    * Controls whether a user can view the YAML content of Secret resources
* View Resource YAML: kubernetes-resources.yaml.view
    * Controls whether a user can view the YAML content of Kubernetes resources
* View Resource Events: kubernetes-resources.events.show
    * Controls whether a user can view events related to Kubernetes resources
* View Resource Graph: kubernetes-resources.graph.show
    * Controls whether a user can view the resource dependency graph


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
