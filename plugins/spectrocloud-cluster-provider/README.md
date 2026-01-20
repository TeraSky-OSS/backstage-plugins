# backstage-plugin-spectrocloud-cluster-provider

Welcome to the backstage-plugin-spectrocloud-cluster-provider backend plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-spectrocloud-cluster-provider/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-spectrocloud-cluster-provider)

The `@terasky/backstage-plugin-spectrocloud-cluster-provider` backend plugin for Backstage is a Kubernetes cluster supplier that automatically discovers and configures clusters from SpectroCloud Palette. It works seamlessly alongside existing cluster suppliers (config, catalog, gke, localKubectlProxy) and automatically sets up secure read-only access using service accounts with minimal RBAC permissions. The plugin creates a `backstage-system` namespace in each cluster with a `backstage-sa` service account that has only get, list, and watch permissions across the cluster.

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/spectrocloud-cluster-provider/overview

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
