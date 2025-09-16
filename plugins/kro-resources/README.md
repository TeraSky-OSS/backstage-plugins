# kro-resources

Welcome to the kro-resources plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kro-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kro-resources-frontend)

The `kro-resources` frontend plugin for Backstage provides visibility into the KRO RGDs, Instances, and managed resources associated with a component. This relies heavily on system-generated annotations from the Kubernetes Ingestor but technically does not require it if you add all the needed annotations manually. The plugin exposes general data, provides a YAML viewer for each resource including the ability to copy to clipboard the content or download the YAML file. It also supports viewing the events related to a specific resource. It also includes a graph view of the resources related to a Instance.

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/kro/overview

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.