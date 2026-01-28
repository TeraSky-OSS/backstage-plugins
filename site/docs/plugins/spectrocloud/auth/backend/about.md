# SpectroCloud Authentication Backend Module

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-auth-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-auth-backend)

## Overview

The SpectroCloud authentication backend module provides OIDC (OpenID Connect) authentication integration with SpectroCloud Palette for Backstage. It implements the standard OAuth2 authorization code flow with proper token exchange to obtain ID tokens that can be used for Kubernetes cluster authentication.

## Features

### OIDC Authentication
- Standard OAuth2 authorization code flow
- Proper token exchange with client secret
- ID token retrieval for Kubernetes authentication
- Refresh token support (using long-lived ID tokens)

### Token Management
- RS256-signed ID tokens from SpectroCloud
- Automatic token expiration handling
- Session token storage
- Nonce support for OIDC security

### User Profile
- JWT-based user profile extraction
- Email, name, and group information
- Sub (subject) identifier for user resolution
- Custom claims support

### Sign-In Resolvers
Compatible with all standard Backstage sign-in resolvers:
- Email matching user entity profile email
- Email local part matching user entity name
- Custom resolvers via configuration

## Technical Architecture

### Authentication Flow
1. User initiates sign-in with SpectroCloud
2. Backend redirects to SpectroCloud authorization endpoint
3. User authenticates with SpectroCloud
4. SpectroCloud redirects back with authorization code
5. Backend exchanges code for access_token, id_token, and refresh_token
6. Backend decodes ID token to extract user profile
7. Sign-in resolver matches user to Backstage entity
8. Session created with tokens for future requests

### Token Types
SpectroCloud returns multiple tokens:
- **ID Token (RS256)**: Used for Backstage session and Kubernetes auth
- **Access Token**: Standard OAuth2 access token
- **Refresh Token (HS256)**: Internal session token (not used)

**Note:** The module uses the ID token for both authentication and refresh since SpectroCloud's refresh token is an internal session token rather than a proper OIDC token.

### Integration Points
- Backstage Auth Backend Plugin
- Auth Providers Extension Point
- Sign-In Resolvers
- Configuration Service

## Security Features

### OIDC Compliance
- Authorization code flow with PKCE-ready
- Nonce parameter for replay attack prevention
- State parameter for CSRF protection
- Secure token exchange with client secret

### Token Security
- RS256 signature verification support
- JWT claim validation
- Expiration checking
- Secure session storage

## Use Cases

### Enterprise SSO
Integrate with SpectroCloud as your organization's identity provider for Backstage authentication.

### Kubernetes Authentication
Use SpectroCloud ID tokens for user-level authentication to Kubernetes clusters managed by SpectroCloud.

### Audit and Compliance
Track user actions in Kubernetes with proper identity attribution based on SpectroCloud authentication.

### Multi-Tenant Support
Support multiple SpectroCloud tenants with different client configurations per environment.
