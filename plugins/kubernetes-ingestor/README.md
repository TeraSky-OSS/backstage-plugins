# backstage-plugin-kubernetes-ingestor

Welcome to the backstage-plugin-kubernetes-ingestor backend plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor)


The `@terasky/backstage-plugin-kubernetes-ingestor` backend plugin for Backstage is a catalog entity provider that 
creates catalog entities directly from Kubernetes resources. It has the ability to ingest by default all standard 
Kubernetes workload types, allows supplying custom GVKs, and has the ability to auto-ingest all Crossplane claims 
automatically as components. There are numerous annotations which can be put on the Kubernetes workloads to influence 
the creation of the component in Backstage. It also supports creating Backstage templates and registers them in the 
catalog for every XRD in your cluster for the Claim resource type. Currently, this supports adding via a PR to a 
GitHub/GitLab/Bitbucket/BitbucketCloud repo or providing a download link to the generated YAML without pushing to git. The plugin also 
generates API entities for all XRDs and defines the dependencies and relationships between all claims and the relevant 
APIs for easy discoverability within the portal.

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/kubernetes-ingestor/overview

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.