# Global Sign-In Page Module

The Global Sign-In Page module for Backstage provides a configuration-driven approach to customizing your Backstage authentication experience. Instead of writing TypeScript code to configure authentication providers, you can now manage everything through your `app-config.yaml` file.

## Plugin Components

### Frontend Plugin Module
The frontend plugin module replaces the default sign-in page with a configurable version that supports:

- All core Backstage authentication providers
- Guest access for development environments
- Custom titles and messages per provider
- Pure YAML configuration - no code required

[Learn more about the frontend module](./frontend/about.md)

## Documentation Structure
- [About](./frontend/about.md)
- [Installation](./frontend/install.md)
- [Configuration](./frontend/configure.md)

## Key Features

### Zero-Code Configuration
Configure your entire sign-in page through `app-config.yaml` without touching TypeScript code. Enable or disable providers, customize messages, and manage authentication options entirely through configuration.

### Comprehensive Provider Support
Out-of-the-box support for all major authentication providers:

- **Source Control**: GitHub, GitLab, Bitbucket, Bitbucket Server
- **Enterprise Identity**: Microsoft, Google, Okta, OneLogin, Atlassian
- **Platform Specific**: OpenShift, VMware Cloud
- **Development**: Guest access

### Flexible Customization
Each authentication provider can be customized with:

- Custom display titles
- Personalized sign-in messages
- Enable/disable toggles
- Provider-specific branding

### Development-Friendly
The optional guest provider makes development and testing easier by allowing quick access without full authentication setup.

## Use Cases

### Multi-Provider Authentication
Organizations using multiple identity providers can easily configure all options in one place, allowing users to choose their preferred authentication method.

### Environment-Specific Configuration
Different environments (development, staging, production) can have different authentication configurations using standard Backstage configuration mechanisms.

### Dynamic Provider Management
Add, remove, or modify authentication providers without code changes or redeployment - just update your configuration and restart.

## Getting Started

To get started with the Global Sign-In Page module:

1. Install the module in your Backstage instance
2. Configure your authentication providers in `app-config.yaml`
3. Customize titles and messages as needed
4. Enable guest access for development (optional)

For detailed installation and configuration instructions, refer to:

- [About the module](./frontend/about.md)
- [Installation Guide](./frontend/install.md)
- [Configuration Guide](./frontend/configure.md)

## Architecture

This is a frontend plugin module that integrates with Backstage's new frontend system. It extends the core `app` plugin by providing a custom sign-in page implementation that reads configuration at runtime and dynamically builds the provider list.

The module uses the `SignInPageBlueprint` to replace the default sign-in page with a configuration-aware version that leverages Backstage's built-in authentication API references for each provider.

