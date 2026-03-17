# Installing the VCF SSO Authentication Frontend Plugin

This guide will help you install and set up the VCF SSO authentication frontend plugin in your Backstage instance.

## Prerequisites

Before installing the frontend plugin, ensure you have:

1. A working Backstage instance (version 1.46.1 or later) using the new frontend system
2. The VCF SSO backend auth module installed and configured (`@terasky/backstage-plugin-vcfsso-auth-backend`)
3. Access to modify your Backstage frontend package

## Installation Steps

### 1. Add the Package

Install the package in your app package:

```bash
yarn --cwd packages/app add @terasky/backstage-plugin-vcfsso-auth
```

### 2. Auto-Discovery

The plugin is automatically discovered by the new Backstage frontend system. No manual wiring in `App.tsx` is required. Once the package is installed in `packages/app`, Backstage will pick it up automatically.

### 3. Configure the Sign-In Page

The most common way to add VCF SSO to the sign-in page is via the Global Sign-In Page module. Add the following to your `app-config.yaml`:

```yaml
signinPage:
  providers:
    vcfsso:
      enabled: true
      title: VCF SSO
      message: Sign in using your VCF SSO account
```

If you are using the Global Sign-In Page module (`@terasky/backstage-plugin-app-module-global-signin-page`), this is all that is needed on the frontend side. The VCF SSO provider is already included in that module.

### 4. Verify the Installation

After restarting Backstage:

1. Navigate to your Backstage instance's sign-in page
2. Verify that the "VCF SSO" option appears
3. Click the button and verify the VCF SSO authorization popup opens

## Troubleshooting

### VCF SSO Provider Does Not Appear

- Verify the package is listed in `packages/app/package.json` dependencies
- Ensure `enabled: true` is set in `signinPage.providers.vcfsso`
- Restart Backstage and clear your browser cache
- Check the browser console for configuration errors

### Popup Opens But Authentication Fails

- Verify the backend module is running and configured
- Check the callback URL configuration in the backend module
- Review Backstage backend logs for authentication errors

### TypeScript Errors

- Ensure you are using compatible Backstage versions
- Run `yarn install` to update dependencies

## Next Steps

After installation, refer to:

- [Configure the Frontend Plugin](./configure.md)
- [Install the Backend Module](../backend/install.md)
- [Configure the Backend Module](../backend/configure.md)
