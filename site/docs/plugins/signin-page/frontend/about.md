# Global Sign-In Page Frontend Module

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-app-module-global-signin-page/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-app-module-global-signin-page)

## Overview

The Global Sign-In Page frontend module provides a completely configuration-driven sign-in page for Backstage. It eliminates the need to write TypeScript code for customizing authentication, allowing you to manage all authentication providers through your `app-config.yaml` file.

## Features

### Configuration-Driven Architecture
- Manage authentication entirely through YAML configuration
- No TypeScript code required for sign-in page customization
- Hot-reload configuration changes with a simple restart

### Comprehensive Provider Support
The module supports all core Backstage authentication providers:

- **GitHub** - GitHub OAuth authentication
- **GitLab** - GitLab OAuth authentication
- **Microsoft** - Microsoft Azure AD authentication
- **Google** - Google OAuth authentication
- **Okta** - Okta SAML/OAuth authentication
- **OneLogin** - OneLogin SAML authentication
- **OpenShift** - Red Hat OpenShift authentication
- **Atlassian** - Atlassian OAuth authentication
- **Bitbucket** - Bitbucket Cloud OAuth authentication
- **Bitbucket Server** - Bitbucket Server authentication
- **VMware Cloud** - VMware Cloud Services authentication
- **Guest** - Development-only guest access

### Per-Provider Customization
Each authentication provider can be individually configured with:

- **Enable/Disable Toggle** - Turn providers on or off without code changes
- **Custom Title** - Override the default display title
- **Custom Message** - Personalize the sign-in message
- **Auto-Discovery** - Uses Backstage's built-in auth API references

### Guest Access
Optional guest provider for development environments:

- Quick development access without full auth setup
- Disable in production through configuration
- Useful for local testing and demos

## Technical Details

### Module Architecture
This is a frontend plugin module (not a standalone plugin) that extends the core `app` plugin. It uses Backstage's new frontend system architecture:

- Uses `SignInPageBlueprint` for integration
- Implements the `createFrontendModule` pattern
- Registers as a module for `pluginId: 'app'`

### Provider Configuration
The module reads configuration at runtime and dynamically builds the provider list based on:

1. Enabled providers in configuration
2. Custom titles and messages
3. Guest provider setting
4. Default values for unconfigured options

### Built-in Defaults
Each provider has sensible defaults:

```typescript
{
  github: {
    id: 'github-auth-provider',
    title: 'GitHub',
    message: 'Sign in using GitHub',
    apiRef: githubAuthApiRef,
  },
  // ... similar defaults for all providers
}
```

### Configuration API
The module uses Backstage's `configApiRef` to:

- Read provider enablement flags
- Fetch custom titles and messages
- Check guest provider settings
- Apply runtime configuration

## Components

### ConfigurableSignInPage
The main component that:

- Reads configuration using `configApiRef`
- Builds the provider list dynamically
- Handles guest provider logic
- Renders Backstage's standard `SignInPage` with custom providers

### appModuleGlobalSigninPage
The exported module that:

- Integrates with the new frontend system
- Registers the custom sign-in page
- Provides the `SignInPageBlueprint` implementation

## Integration Points

The module integrates with:

- **Backstage Frontend Plugin API** - Uses new frontend system patterns
- **Core Components** - Leverages `@backstage/core-components` SignInPage
- **Core Plugin API** - Uses `configApiRef` and various auth API references
- **Configuration System** - Reads from `app-config.yaml` at runtime

## Development Workflow

### Local Development
1. Enable guest provider for quick access
2. Configure only the providers you need to test
3. Use custom messages to identify the environment

### Production Deployment
1. Disable guest provider
2. Enable only production auth providers
3. Customize titles/messages for your organization

## Benefits

### For Developers
- No code changes required for auth configuration
- Easy to test different auth providers
- Quick environment-specific setup

### For Platform Teams
- Centralized authentication configuration
- Consistent configuration patterns
- Easy to manage across environments

### For Organizations
- Flexible multi-provider support
- Customizable user experience
- No code deployment for auth changes

