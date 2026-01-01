# app-module-global-signin-page

Welcome to the app-module-global-signin-page plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-app-module-global-signin-page/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-app-module-global-signin-page)

## Description

The `app-module-global-signin-page` plugin for Backstage provides a configurable sign-in page that supports all core Backstage authentication providers through simple YAML configuration. This module eliminates the need to write TypeScript code for sign-in page customization, allowing teams to configure authentication providers, customize titles and messages, and enable/disable providers entirely through the `app-config.yaml` file.

### Features

- **Configuration-driven**: Configure authentication providers purely through `app-config.yaml`
- **Multiple Provider Support**: Supports all core Backstage authentication providers including:
  - GitHub, GitLab, Bitbucket, Bitbucket Server
  - Microsoft, Google, Okta, OneLogin
  - OpenShift, Atlassian
  - VMware Cloud
- **Guest Access**: Optional guest provider for development environments
- **Customizable**: Set custom titles and messages for each authentication provider
- **Zero Code**: No TypeScript code required for sign-in page configuration

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/signin-page/overview

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
