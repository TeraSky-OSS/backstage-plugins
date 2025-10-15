# TeraSky's Backstage Plugins
These plugins are built and tested against Backstage version 1.44.1

## Plugin overviews
There are 31 plugins currently:
1. [Kubernetes Ingestor](./plugins/kubernetes-ingestor) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor) - this plugin is a catalog entity provider which creates catalog entities directly from kubernetes resources. It has the ability to ingest by default all standard k8s workload types, allows supplying custom GVKs, and has the ability to auto-ingest all crossplane claims and KRO instances automatically as components. There are numerous annotations which can be put on the kubernetes workloads to influence the creation of the component in backstage. It also supports creating backstage templates and registers them in the catalog for every XRD in your cluster for the Claim resource type.

2. [Crossplane Resources Frontend](./plugins/crossplane-resources) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-resources-frontend) - this is a frontend plugin which provides visibility into the crossplane claim, composite resource and managed resources associated with a component. This relies heavily on system generated annotations from the Kubernetes Ingestor but technically does not require it if you add all the needed annotations manually. The plugin exposes general data, provides a YAML viewer for each resource including the ability to copy to clipboard the content or download the yaml file. It also supports viewing the events related to a specific resource and includes a graph view of the resources related to a claim.

3. [Crossplane Resources Backend](./plugins/crossplane-resources-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-resources-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-resources-backend) - This plugin implements the permission framework elements for the crossplane frontend plugin and provides necessary backend services.

4. [Crossplane Common](./plugins/crossplane-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-common) - This is a shared common library between the frontend and backend crossplane plugins where the permission definitions reside. This is not added into a backstage instance directly, rather it is a dependency of both of the other plugins.

5. [ScaleOps Frontend](./plugins/scaleops-frontend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaleops-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaleops-frontend) - this is a frontend plugin which displays basic data from scaleops regarding kubernetes entities on your component. It shows potential and realized savings, and can provide a link to the scaleops dashboard for more specific and broader data points.

6. [Entity Scaffolder Content](./plugins/entity-scaffolder-content) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-entity-scaffolder-content/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-entity-scaffolder-content) - This allows embedding a tab with scaffolder templates on a component. This can also populate the list of templates and data in the templates based on the context from which it is run.

7. [Devpod Plugin](./plugins/devpod-plugin) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-devpod/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-devpod) - this plugin adds a grid item on the overview tab of components allowing for a "Open in Devpod" button. It supports allowing the user to choose the IDE it should open with, and also provides the CLI command the user could run to open it up from the command line.

8. [Scaffolder Actions](./plugins/scaffolder-backend-module-terasky-utils) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils) - this is a package of multiple scaffolder actions:
  * **terasky:claim-template** - This action converts input parameters into a kubernetes yaml manifest for the crossplane claim and writes it to the filesystem of the action based on the format "\<cluster\>/\<namespace\>/\<kind\>/\<name\>.yaml"
  * **terasky:crd-template** - This action converts input parameters into a kubernetes yaml manifest for the Kubernetes Custom Resource and writes it to the filesystem of the action based on the format "\<cluster\>/\<namespace\>/\<kind\>/\<name\>.yaml"
  * **terasky:catalog-info-cleaner** - This action takes a backstage entity and cleans up runtime information and then outputs as a catalog-info.yaml file on the filesystem of the action the cleaned up manifest.

9. [Kyverno Policy Reports Frontend](./plugins/kyverno-policy-reports) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-policy-reports/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-policy-reports) - this is a frontend plugin which displays policy report results for kubernetes workloads related to a catalog entity.

10. [Kyverno Policy Reports Backend](./plugins/kyverno-policy-reports-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-policy-reports-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-policy-reports-backend) - this is a backend for the kyverno policy reports plugin.

11. [Kyverno Common](./plugins/kyverno-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-common) - this is a common library between the frontend and backend kyverno plugins where the permission definitions reside.

12. [GitOps Manifest Updater](./plugins/gitops-manifest-updater) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-gitops-manifest-updater/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-gitops-manifest-updater) - this is a frontend plugin which allows for updating the gitops manifest of a component residing in a git repository. It supports updating the manifest in the repository and creating a PR with the update. The manifest can be provided in an entity annotations (terasky.backstage.io/source-manifest-url) or by providing a URL to the manifest in the repository within the form.

13. [Kubernetes Resources Frontend](./plugins/kubernetes-resources) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-frontend) - this plugin provides a visual graph representation of Kubernetes resources and their dependencies within your clusters.

14. [Kubernetes Resources Backend](./plugins/kubernetes-resources-permissions-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-permissions-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-permissions-backend) - this is a backend plugin which implements the permission framework elements for the kubernetes resources frontend plugin.

15. [Kubernetes Resources Common](./plugins/kubernetes-resources-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-common) - this is a shared library between the frontend and backend kubernetes resources plugins.

16. [VCF Automation Frontend](./plugins/vcf-automation) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation) - this plugin provides visibility into VCF deployments, resources, and projects.

17. [VCF Automation Backend](./plugins/vcf-automation-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation-backend) - this backend plugin provides the API integration with VCF services and manages permissions.

18. [VCF Automation Common](./plugins/vcf-automation-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation-common) - this is a shared library between the frontend and backend VCF Automation plugins.

19. [VCF Automation Ingestor](./plugins/vcf-automation-ingestor) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation-ingestor) - this plugin ingests VCF Automation deployments into the Backstage catalog.

20. [Educates Frontend](./plugins/educates) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates) - this plugin provides a user interface for browsing and accessing Educates training workshops.

21. [Educates Backend](./plugins/educates-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates-backend) - this backend plugin handles the integration with Educates training portals.

22. [Educates Common](./plugins/educates-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates-common) - this is a shared library between the frontend and backend Educates plugins.

23. [AI Rules Frontend](./plugins/ai-rules-plugin) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-ai-rules/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-ai-rules) - this frontend plugin provides comprehensive visualization and management of AI coding rules from various sources.

24. [AI Rules Backend](./plugins/ai-rules-plugin-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-ai-rules-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-ai-rules-backend) - this backend plugin provides server-side functionality for the AI Rules frontend plugin.

25. [VCF Operations Frontend](./plugins/vcf-operations) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-operations/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-operations) - this plugin provides visibility into VCF Operations metrics.

26. [VCF Operations Backend](./plugins/vcf-operations-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-operations-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-operations-backend) - this backend plugin provides the API integration with VCF operations.

27. [VCF Operations Common](./plugins/vcf-operations-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-operations-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-operations-common) - this is a shared library between the frontend and backend VCF operations plugins.

28. [Terraform Scaffolder](./plugins/terraform-scaffolder) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-terraform-scaffolder/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-terraform-scaffolder) - this frontend plugin provides a custom field type for Software Templates that enables discovering and configuring Terraform modules.

29. [KRO Resources Frontend](./plugins/kro-resources) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kro-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kro-resources-frontend) - this plugin provides visibility into KRO RGDs, instances, and managed resources associated with a component.

30. [KRO Resources Backend](./plugins/kro-resources-backend) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kro-resources-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kro-resources-backend) - this plugin implements the backend elements for the KRO frontend plugin.

31. [KRO Common](./plugins/kro-common) - [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kro-common/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kro-common) - this is a shared library between the frontend and backend KRO plugins.