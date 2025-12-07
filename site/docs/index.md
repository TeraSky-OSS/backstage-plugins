# Welcome to TeraSky's Backstage Plugin Collection! 🚀

Welcome to our comprehensive collection of Backstage plugins! We've created these plugins to enhance your Backstage experience and make your development workflow more efficient and enjoyable. All our plugins are thoroughly tested and compatible with Backstage version 1.44.1.

## 🔧 Our Plugin Categories

### Kubernetes
1. [Kubernetes Ingestor](./plugins/kubernetes-ingestor/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-ingestor/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-ingestor) - Automatically create catalog entities from Kubernetes resources, with support for custom GVKs, Crossplane claims, and KRO resources. It also create GitOps friendly Software Templates for Crossplane Claims/Composites, CRDs, and KRO Instances.
2. [Crossplane Suite](./plugins/crossplane/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-crossplane-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-crossplane-resources-frontend) - Complete Crossplane integration for cloud resource management.
3. [KRO Suite](./plugins/kro/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kro-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kro-resources-frontend) - Complete KRO integration for Kubernetes resource orchestration.
4. [Kyverno Policy Reports](./plugins/kyverno/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kyverno-policy-reports/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kyverno-policy-reports) - Policy compliance monitoring for Kubernetes.
5. [Kubernetes Resources](./plugins/kubernetes/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-kubernetes-resources-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-kubernetes-resources-frontend) - Visual graph representation of Kubernetes resources and their dependencies with simple Backstage permission and RBAC management.

### Infrastructure As Code
1. [GitOps Manifest Updater](./plugins/gitops-manifest-updater/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-gitops-manifest-updater/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-gitops-manifest-updater) - Update GitOps manifests and create PRs with ease.
2. [Terraform Scaffolder](./plugins/terraform-scaffolder/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-terraform-scaffolder/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-terraform-scaffolder) - Generate Input forms in software templates for terraform module variables.

### Training & Education
1. [Educates Platform](./plugins/educates/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-educates/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-educates) - Complete training platform with workshop management.

### Development Tools
1. [DevPod Plugin](./plugins/devpod/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-devpod/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-devpod) - Quick development environment setup with IDE integration.

### Resource And Cost Optimization
1. [ScaleOps Frontend](./plugins/scaleops/frontend/about.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaleops-frontend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaleops-frontend) - Cost optimization insights and recommendations.

### Cloud Infrastructure
1. [VCF Automation Suite](./plugins/vcf-automation/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-automation/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-automation) - Comprehensive VMware Cloud Foundation Automation integration.
2. [VCF Operations Suite](./plugins/vcf-operations/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcf-operations/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcf-operations) - Comprehensive VMware Cloud Foundation Operations observability integration.

### AI
1. [AI Coding Rules](./plugins/ai-rules-plugin/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-ai-rules/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-ai-rules) - Comprehensive visualization and management of AI coding rules from Cursor, GitHub Copilot, and Cline.
2. [Scaffolder MCP Backend](./plugins/scaffolder-mcp/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/plugin-scaffolder-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/plugin-scaffolder-mcp-backend) - MCP actions for AI agents to discover, inspect, and execute software templates programmatically.
3. [RBAC MCP Backend](./plugins/rbac-mcp/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/plugin-rbac-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/plugin-rbac-mcp-backend) - MCP actions for AI agents to manage roles, permissions, and access policies programmatically.
4. [Catalog MCP Backend](./plugins/catalog-mcp/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-catalog-mcp-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-catalog-mcp-backend) - MCP actions for AI agents to query and discover catalog entities programmatically.

### General Utilities
1. [Scaffolder Actions](./plugins/scaffolder-actions/overview.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils) - Powerful actions for automation:  
    * Crossplane claim template creation  
    * CRD template creation  
    * Catalog info cleaning  
2. [Entity Scaffolder Plugin](./plugins/entity-scaffolder/frontend/about.md) [![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-entity-scaffolder-content/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-entity-scaffolder-content) - Embbed scaffolder templates in component pages.







## 💡 Getting Started

Each plugin includes comprehensive documentation with:
- Detailed installation instructions
- Configuration examples
- Best practices
- Troubleshooting guides

## 🔍 Need Help?

- Check each plugin's documentation for specific guides
- Look for examples in the installation guides
- Review the troubleshooting sections
- Contact our support team for assistance

## 📦 Latest Releases

All our plugins are actively maintained and regularly updated. Check the npm badge on each plugin for the latest version information.

---

*Built with ❤️ by TeraSky for the Backstage Community*
