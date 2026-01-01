# Installing the Global Sign-In Page Module

This guide will help you install and set up the Global Sign-In Page module in your Backstage instance using the new frontend system.

## Prerequisites

Before installing the module, ensure you have:

1. A working Backstage instance (version 1.46.1 or later)
2. The new frontend system enabled
3. At least one authentication provider configured in your backend
4. Access to modify your Backstage frontend configuration

## Installation Steps

### 1. Add the Package

Install the module package using your package manager:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-app-module-global-signin-page
```

### 2. Configure Authentication Providers

Add your authentication provider configuration to `app-config.yaml`. Here's a basic example:

```yaml
signinPage:
  enableGuestProvider: false  # Set to true for development
  providers:
    github:
      enabled: true
      title: GitHub
      message: Sign in using your GitHub account
    
    google:
      enabled: true
      title: Google
      message: Sign in using your Google account
```

**Important**: Remember to also configure the backend authentication providers. This module only configures the frontend sign-in page. For backend configuration, refer to the [Backstage authentication documentation](https://backstage.io/docs/auth/).

### 4. Configure Backend Authentication

Ensure your backend is configured with the corresponding authentication providers. For example, for GitHub:

```yaml
auth:
  environment: development
  providers:
    github:
      development:
        clientId: ${GITHUB_CLIENT_ID}
        clientSecret: ${GITHUB_CLIENT_SECRET}
```

Refer to Backstage's [authentication documentation](https://backstage.io/docs/auth/) for detailed backend setup instructions for each provider.

## Troubleshooting

Common issues and solutions:

### Module Not Loading
- **Issue**: The custom sign-in page doesn't appear
- **Solution**: 
  - Verify the module is imported in your app configuration
  - Check that you're using the new frontend system
  - Ensure the module is in your package.json dependencies

### No Providers Showing
- **Issue**: The sign-in page loads but shows no authentication options
- **Solution**:
  - Check your `app-config.yaml` for the `signinPage` configuration
  - Verify at least one provider is set to `enabled: true`
  - Check browser console for configuration errors

### Authentication Fails
- **Issue**: Provider buttons appear but authentication doesn't work
- **Solution**:
  - Verify backend authentication is properly configured
  - Check that provider credentials are set correctly
  - Review backend logs for authentication errors
  - Ensure callback URLs are configured in your OAuth apps

### TypeScript Errors
- **Issue**: TypeScript compilation errors after adding the module
- **Solution**:
  - Ensure you're using compatible Backstage versions
  - Run `yarn install` to update dependencies
  - Check for version conflicts in package.json

### Configuration Not Applied
- **Issue**: Changes to `app-config.yaml` don't reflect in the sign-in page
- **Solution**:
  - Restart your Backstage application
  - Clear browser cache
  - Verify YAML syntax is correct
  - Check for configuration override files

## Next Steps

Once the module is installed, proceed to the [Configuration Guide](./configure.md) to:

- Configure specific authentication providers
- Customize titles and messages
- Set up environment-specific configuration
- Enable guest access for development

## Additional Resources

- [Backstage Authentication Documentation](https://backstage.io/docs/auth/)
- [New Frontend System Guide](https://backstage.io/docs/frontend-system/)
- [OAuth Provider Setup](https://backstage.io/docs/auth/oauth)

