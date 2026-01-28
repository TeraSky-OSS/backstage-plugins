# Configuring the Global Sign-In Page Module

This guide covers all configuration options for the Global Sign-In Page module.

## Configuration Structure

All configuration is done in your `app-config.yaml` file under the `signinPage` key:

```yaml
signinPage:
  enableGuestProvider: boolean
  providers:
    <provider-name>:
      enabled: boolean
      title: string
      message: string
```

## Basic Configuration

### Minimal Configuration

The simplest configuration with a single provider:

```yaml
signinPage:
  providers:
    github:
      enabled: true
```

This will display GitHub authentication with default title ("GitHub") and message ("Sign in using GitHub").

### Development Configuration

For local development with guest access:

```yaml
signinPage:
  enableGuestProvider: true
  providers:
    github:
      enabled: true
      title: GitHub (Dev)
      message: Development environment - GitHub auth
```

### Production Configuration

A typical production setup with multiple providers:

```yaml
signinPage:
  enableGuestProvider: false  # Disable guest access in production
  providers:
    microsoft:
      enabled: true
      title: Microsoft SSO
      message: Sign in with your corporate Microsoft account
    
    github:
      enabled: true
      title: GitHub
      message: Sign in with your GitHub account
    
    google:
      enabled: false  # Disabled in production
```

## Configuration Options

### Guest Provider

Enable guest access for development environments:

```yaml
signinPage:
  enableGuestProvider: true
```

- **Type**: `boolean`
- **Default**: `false`
- **Recommended**: `true` for development, `false` for production
- **Note**: Guest provider bypasses authentication - **never enable in production**

### Provider Configuration

Each provider supports three configuration options:

#### enabled
Controls whether the provider appears on the sign-in page:

```yaml
signinPage:
  providers:
    github:
      enabled: true  # Provider will appear
    gitlab:
      enabled: false  # Provider will not appear
```

- **Type**: `boolean`
- **Default**: `false`
- **Required**: Yes (to show the provider)

#### title
Custom display title for the provider button:

```yaml
signinPage:
  providers:
    microsoft:
      enabled: true
      title: Corporate SSO
```

- **Type**: `string`
- **Default**: Provider-specific default (e.g., "GitHub", "Microsoft")
- **Optional**: Yes

#### message
Custom message shown below the provider button:

```yaml
signinPage:
  providers:
    okta:
      enabled: true
      title: Okta SSO
      message: Sign in using your company Okta account
```

- **Type**: `string`
- **Default**: Provider-specific default (e.g., "Sign in using GitHub")
- **Optional**: Yes

## Supported Providers

### GitHub

```yaml
signinPage:
  providers:
    github:
      enabled: true
      title: GitHub  # Default
      message: Sign in using GitHub  # Default
```

### GitLab

```yaml
signinPage:
  providers:
    gitlab:
      enabled: true
      title: GitLab  # Default
      message: Sign in using GitLab  # Default
```

### Microsoft

```yaml
signinPage:
  providers:
    microsoft:
      enabled: true
      title: Microsoft  # Default
      message: Sign in using Microsoft  # Default
```

### Google

```yaml
signinPage:
  providers:
    google:
      enabled: true
      title: Google  # Default
      message: Sign in using Google  # Default
```

### Okta

```yaml
signinPage:
  providers:
    okta:
      enabled: true
      title: Okta  # Default
      message: Sign in using Okta  # Default
```

### OneLogin

```yaml
signinPage:
  providers:
    onelogin:
      enabled: true
      title: OneLogin  # Default
      message: Sign in using OneLogin  # Default
```

### OpenShift

```yaml
signinPage:
  providers:
    openshift:
      enabled: true
      title: OpenShift  # Default
      message: Sign in using OpenShift  # Default
```

### Atlassian

```yaml
signinPage:
  providers:
    atlassian:
      enabled: true
      title: Atlassian  # Default
      message: Sign in using Atlassian  # Default
```

### Bitbucket

```yaml
signinPage:
  providers:
    bitbucket:
      enabled: true
      title: Bitbucket  # Default
      message: Sign in using Bitbucket  # Default
```

### Bitbucket Server

```yaml
signinPage:
  providers:
    bitbucketServer:
      enabled: true
      title: Bitbucket Server  # Default
      message: Sign in using Bitbucket Server  # Default
```

### VMware Cloud

```yaml
signinPage:
  providers:
    vmwareCloud:
      enabled: true
      title: VMware Cloud  # Default
      message: Sign in using VMware Cloud  # Default
```

### Spectro Cloud

```yaml
signinPage:
  providers:
    spectrocloud:
      enabled: true
      title: Spectro Cloud  # Default
      message: Sign in using Spectro Cloud  # Default
```

## Environment-Specific Configuration

### Using Configuration Files

Backstage supports environment-specific configuration files. Create separate files for each environment:

**app-config.yaml** (base configuration):
```yaml
signinPage:
  enableGuestProvider: false
  providers:
    github:
      enabled: true
```

**app-config.local.yaml** (local development):
```yaml
signinPage:
  enableGuestProvider: true
  providers:
    github:
      enabled: true
      title: GitHub (Local Dev)
```

**app-config.production.yaml** (production):
```yaml
signinPage:
  enableGuestProvider: false
  providers:
    microsoft:
      enabled: true
      title: Corporate SSO
      message: Sign in with your corporate Microsoft account
```

### Using Environment Variables

You can also use environment variables in configuration:

```yaml
signinPage:
  enableGuestProvider: ${ENABLE_GUEST_PROVIDER}
  providers:
    github:
      enabled: ${GITHUB_AUTH_ENABLED}
      title: ${GITHUB_AUTH_TITLE}
```

## Complete Example

Here's a comprehensive example showing all features:

```yaml
# app-config.yaml
signinPage:
  # Enable guest access for development (disable in production)
  enableGuestProvider: true
  
  providers:
    # Corporate primary authentication
    microsoft:
      enabled: true
      title: TeraSky SSO
      message: Sign in with your TeraSky Microsoft account
    
    # GitHub for open source contributors
    github:
      enabled: true
      title: GitHub
      message: External contributors - sign in with GitHub
    
    # GitLab for specific teams
    gitlab:
      enabled: true
      title: GitLab
      message: Engineering teams - sign in with GitLab
    
    # Google OAuth
    google:
      enabled: false  # Currently disabled
      title: Google
      message: Sign in using Google
    
    # Enterprise SSO providers
    okta:
      enabled: true
      title: Okta SSO
      message: Enterprise users - sign in with Okta
    
    # Other providers (disabled by default)
    onelogin:
      enabled: false
    
    openshift:
      enabled: false
    
    atlassian:
      enabled: false
    
    bitbucket:
      enabled: false
    
    bitbucketServer:
      enabled: false
    
    vmwareCloud:
      enabled: false

    spectrocloud:
      enabled: false
```

## Best Practices

### 1. Security

- **Never enable guest provider in production**
- **Use environment-specific configuration** to ensure proper settings per environment
- **Limit enabled providers** to only those your organization actually uses
- **Review provider access regularly**

### 2. User Experience

- **Use clear, descriptive titles** that users will recognize
- **Provide helpful messages** that guide users to the right provider
- **Order providers by usage** - put most common providers first in config
- **Test authentication flows** before deploying to production

### 3. Configuration Management

- **Use separate config files** for different environments
- **Document custom settings** in comments
- **Keep sensitive data in environment variables**, not in config files
- **Version control your configuration** (excluding secrets)

### 4. Provider Selection

- **Enable only necessary providers** to avoid overwhelming users
- **Match your organization's auth strategy**
- **Consider user personas** when choosing providers
- **Plan for future growth** but don't over-configure initially

## Troubleshooting Configuration

### Configuration Not Taking Effect

If your configuration changes don't appear:

1. Restart the Backstage application
2. Clear browser cache and cookies
3. Check for YAML syntax errors
4. Verify correct indentation (YAML is whitespace-sensitive)
5. Look for override configurations in environment-specific files

### Provider Appears But Doesn't Work

If a provider shows but authentication fails:

1. Verify the backend auth provider is configured
2. Check OAuth client credentials
3. Review backend logs for auth errors
4. Ensure callback URLs are correct
5. Verify API scopes and permissions

### Guest Provider Not Working

If guest provider doesn't appear even when enabled:

1. Check spelling: `enableGuestProvider` (camelCase)
2. Verify boolean value (not string "true")
3. Ensure Backstage is in development mode
4. Check browser console for errors

## Additional Resources

- [Backstage Authentication Docs](https://backstage.io/docs/auth/)
- [Configuration Schema](../../../plugins/app-module-global-signin-page/config.d.ts)
- [OAuth Provider Setup](https://backstage.io/docs/auth/oauth)

