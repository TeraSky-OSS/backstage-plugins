# Educates Backend Plugin

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates-backend) ![NPM Downloads](https://img.shields.io/npm/dy/@terasky/backstage-plugin-educates-backend)

## Overview

The Educates backend plugin provides the server-side functionality required to integrate Educates training portals with Backstage. It handles API communication, authentication, session management, and exposes endpoints for the frontend plugin to consume.

## Features

### API Integration
- Seamless communication with Educates training portals
- Support for multiple portal configurations
- Secure API token management
- Error handling and retries

### Authentication Management
- Token-based authentication
- Automatic token refresh
- Secure credential storage
- Session persistence

### Workshop Management
- Workshop catalog retrieval
- Workshop metadata handling
- Session creation and tracking

### Multi-Portal Support
- Multiple portal configurations out of the box

### Permission Framework
- Resource-based permission system
- Conditional permission rules
- Portal and workshop-specific access control
- Advanced permission conditions and decision making

## Permission Framework

The backend plugin provides a comprehensive permission framework with resource-based access control:

### Permission Resources

The plugin defines two main resource types:

- **Training Portal Resource (`educates-training-portal`)**
  - Controls access to specific training portals
  - Supports portal ownership and access rules

- **Workshop Resource (`educates-workshop`)**
  - Controls access to individual workshops
  - Supports workshop-specific permissions

### Permission Rules

#### Portal Permission Rules
- **`IS_PORTAL_OWNER`**: Grants access to users who own a training portal
- **`HAS_PORTAL_ACCESS`**: Grants access to users with specific portal permissions

#### Workshop Permission Rules
- **`IS_WORKSHOP_OWNER`**: Grants access to users who own a workshop
- **`HAS_WORKSHOP_ACCESS`**: Grants access to users with specific workshop permissions

### Conditional Permissions

The plugin supports conditional permission decisions through:

- **Portal Conditions**: Fine-grained portal access control
- **Workshop Conditions**: Workshop-specific permission logic
- **Decision Factories**: Programmatic permission decision creation


## Technical Details

### Integration Points
- Educates Training Portal API
- Backstage backend services
- Permission framework
- Authentication system

### Type Definitions
Utilizes shared types from the common package:

- `TrainingPortalConfig`
- `EducatesConfig`
- `Workshop`
- `WorkshopEnvironment`
- `TrainingPortalStatus`
- `WorkshopSession`

### Error Handling
- Comprehensive error types
- Detailed error messages
- Automatic retries
- Rate limiting protection

### Security
- Secure credential management
- Token-based authentication
- Resource-based permission controls with conditional rules
- Request validation

## Architecture

### Components
1. **API Router**
    - Endpoint registration
    - Request handling
    - Response formatting

2. **Portal Manager**
    - Portal configuration
    - Health monitoring
    - Connection management

3. **Session Controller**
    - Session lifecycle
    - Resource allocation

4. **Authentication Handler**
    - Token management
    - Credential storage
    - Permission checks

5. **Permission Handler**
    - Resource-based access control
    - Conditional permission evaluation
    - Permission rule enforcement

### Data Flow
1. Request received from frontend
2. Authentication and permission validation
3. Portal communication
4. Response processing
5. Result returned to client


For installation and configuration details, refer to the [Installation Guide](./install.md) and [Configuration Guide](./configure.md).
