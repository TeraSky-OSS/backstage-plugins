# Module Federation CDN Backend

Welcome to the module-federation-cdn-backend plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-module-federation-cdn-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-module-federation-cdn-backend)

## Description

The `module-federation-cdn-backend` plugin for Backstage enables dynamic frontend plugins to be loaded directly from a CDN using Module Federation, without requiring any files in the `dynamic-plugins-root` directory on the backend server. At startup it fetches each plugin's `mf-manifest.json` from the configured CDN URL, patches the public path so all JavaScript chunks are served from the CDN, and injects virtual plugin entries into the dynamic features service so the Backstage frontend discovers and loads them automatically.

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/module-federation-cdn/overview

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
