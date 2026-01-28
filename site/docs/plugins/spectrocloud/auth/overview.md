# SpectroCloud Authentication Plugin

The SpectroCloud Authentication plugin integrates SpectroCloud OIDC authentication into your Backstage instance, enabling seamless single sign-on and user-level Kubernetes cluster access.

## Plugin Components

### Backend Plugin Module (Required)
The backend plugin module provides:
- SpectroCloud OIDC authentication integration
- Proper token exchange with authorization code flow
- ID token retrieval for Kubernetes authentication
- User profile information from SpectroCloud
- Sign-in resolver support

[Learn more about the backend module](./backend/about.md)

### Frontend Plugin
The frontend plugin provides:
- OAuth2 client for SpectroCloud authentication
- Sign-in page integration
- User profile and identity APIs
- Session management

[Learn more about the frontend plugin](./frontend/about.md)

### Kubernetes Authentication Module (Optional)
The Kubernetes authentication module enables:
- User-level OIDC authentication for Kubernetes clusters
- SpectroCloud token provider for Kubernetes API access
- Seamless integration with SpectroCloud-managed clusters

[Learn more about the Kubernetes auth module](./kubernetes-module/about.md)

## Features

### User Authentication
- OIDC-compliant authentication flow
- Secure token exchange with client secret
- Long-lived ID tokens from SpectroCloud
- User profile extraction from JWT claims

### Kubernetes Integration
- User-level authentication to Kubernetes clusters
- No service account creation needed
- Audit trail based on user identity
- Compatible with SpectroCloud cluster provider

### Configuration-Driven
- Simple YAML configuration
- Environment variable support for secrets
- Flexible sign-in resolver options
- Multiple authentication strategies

## Documentation Structure

### Backend Module
- [About](./backend/about.md)
- [Installation](./backend/install.md)
- [Configuration](./backend/configure.md)

### Frontend Plugin
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

### Kubernetes Module
- [About](./kubernetes-module/about.md)
- [Installation](./kubernetes-module/install.md)
- [Configuration](./kubernetes-module/configure.md)

## Getting Started

To get started with SpectroCloud authentication:

1. **Install the backend module** (required)
   - Handles OIDC authentication
   - Performs token exchange
   - Extracts user identity
2. **Install the frontend plugin** (auto-discovered)
   - Provides OAuth2 client
   - Enables sign-in functionality
3. **Configure authentication**
   - Set SpectroCloud URLs and credentials
   - Configure sign-in resolvers
4. **Optional: Install Kubernetes module**
   - Enable user-level cluster access
   - Configure cluster provider for OIDC

For detailed installation and configuration instructions, refer to the component documentation linked above.

## Use Cases

### Single Sign-On
Enable users to authenticate to Backstage using their existing SpectroCloud credentials, providing a seamless experience across platforms.

### Kubernetes Access
Allow users to access Kubernetes clusters using their SpectroCloud identity, enabling audit trails and user-level access control without managing service accounts.

### Multi-Cluster Environments
Integrate with SpectroCloud cluster provider to automatically discover and authenticate to all managed clusters using user credentials.
