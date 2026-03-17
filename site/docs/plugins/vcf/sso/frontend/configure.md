# Configuring the VCF SSO Authentication Frontend Plugin

The VCF SSO frontend plugin has minimal configuration requirements — most settings are controlled by the backend module. This guide covers the frontend-side configuration options.

## Sign-In Page Configuration

### Using the Global Sign-In Page Module

The most common configuration is via the [Global Sign-In Page Module](../../../signin-page/overview.md). Add the following to your `app-config.yaml`:

```yaml
signinPage:
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO          # Optional — default: "VCF SSO"
      message: Sign in using VCF SSO  # Optional — default: "Sign in using VCF SSO"
```

#### Configuration Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | `false` | Whether to show the VCF SSO option on the sign-in page |
| `title` | string | No | `VCF SSO` | Display title for the sign-in button |
| `message` | string | No | `Sign in using VCF SSO` | Message shown below the sign-in button |

### Using a Custom Sign-In Page

If you maintain a custom sign-in page, reference the `vcfSsoAuthApiRef` directly:

```typescript
import { vcfSsoAuthApiRef } from '@terasky/backstage-plugin-vcfsso-auth';

const providers = [
  {
    id: 'vcf-sso-auth-provider',
    title: 'VCF SSO',
    message: 'Sign in using your VCF SSO account',
    apiRef: vcfSsoAuthApiRef,
  },
];
```

## Auth Environment

The frontend plugin reads the active auth environment from the `auth.environment` config key. Ensure it matches the environment block configured in the backend module:

```yaml
auth:
  environment: development  # Must match the block under auth.providers.vcfsso
```

## Configuration Examples

### Development Setup

```yaml
auth:
  environment: development

signinPage:
  enableGuestProvider: true   # Allow guest access during development
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO (Dev)
      message: Development — sign in with your VCF SSO account
```

### Production Setup

```yaml
auth:
  environment: production

signinPage:
  enableGuestProvider: false
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO
      message: Sign in with your corporate VCF SSO account
```

### Multiple Providers

```yaml
signinPage:
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO
      message: Sign in with VCF SSO
    github:
      enabled: true
      title: GitHub
      message: External contributors — sign in with GitHub
```

## Next Steps

- [Configure the Backend Module](../backend/configure.md)
- [Global Sign-In Page Configuration](../../../signin-page/frontend/configure.md)
