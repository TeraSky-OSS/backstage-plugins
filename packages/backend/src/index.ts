/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));



// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// Kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// Custom
backend.add(import('@backstage-community/plugin-rbac-backend'));
backend.add(import('@terasky/backstage-plugin-kubernetes-ingestor'));
backend.add(import('@roadiehq/scaffolder-backend-module-utils/new-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-bitbucket'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-azure'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-microsoft-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-gitlab-provider'));
backend.add(import('@terasky/backstage-plugin-crossplane-resources-backend'));
backend.add(import('@terasky/backstage-plugin-kubernetes-resources-permissions-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-ldap'));
backend.add(import('@backstage/plugin-catalog-backend-module-msgraph'));
backend.add(import('@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils'));
backend.add(import('@terasky/backstage-plugin-kyverno-policy-reports-backend'));
backend.add(import('@terasky/backstage-plugin-vcf-automation-ingestor'));
backend.add(import('@terasky/backstage-plugin-vcf-automation-backend'));
backend.add(import('@terasky/backstage-plugin-educates-backend'));
backend.add(import('@terasky/backstage-plugin-ai-rules-backend'));
backend.add(import('@terasky/backstage-plugin-vcf-operations-backend'));
backend.add(import('@terasky/backstage-plugin-kro-resources-backend'));

//MCP
backend.add(import('@backstage/plugin-mcp-actions-backend'));

backend.add(import('@terasky/plugin-scaffolder-mcp-backend'));
backend.add(import('@terasky/plugin-rbac-mcp-backend'));
backend.add(import('@terasky/backstage-plugin-catalog-mcp-backend'));
backend.start();
