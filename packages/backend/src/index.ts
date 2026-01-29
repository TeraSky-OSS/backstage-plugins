/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
import { createBackendFeatureLoader } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';

const backend = createBackend();
backend.add( 
  createBackendFeatureLoader({
  deps: {
    config: coreServices.rootConfig,
  },
  // The `*` in front of the function name makes it a generator function
  *loader({ config }) {
    if (config.getOptionalBoolean('signinPage.enableGuestProvider') ?? true) {
      yield import('@backstage/plugin-auth-backend-module-guest-provider');
    }
    if (config.getOptionalBoolean('signinPage.providers.github.enabled') ?? true) {
      yield import('@backstage/plugin-auth-backend-module-github-provider');
    }
    if (config.getOptionalBoolean('signinPage.providers.gitlab.enabled') ?? true) {
      yield import('@backstage/plugin-auth-backend-module-gitlab-provider');
    }
    if (config.getOptionalBoolean('signinPage.providers.microsoft.enabled') ?? true) {
      yield import('@backstage/plugin-auth-backend-module-microsoft-provider');
    }
    if (config.getOptionalBoolean('spectrocloud.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-spectrocloud-auth-backend');
      yield import('@terasky/backstage-plugin-spectrocloud-backend');
      yield import('@terasky/backstage-plugin-spectrocloud-cluster-provider');
      yield import('@terasky/backstage-plugin-spectrocloud-ingestor');
    }
    if (config.getOptionalBoolean('vcfAutomation.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-vcf-automation-backend');
      yield import('@terasky/backstage-plugin-vcf-automation-ingestor');
    }
    if (config.getOptionalBoolean('vcfOperations.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-vcf-operations-backend');
    }
    if (config.getOptionalBoolean('kubernetesIngestor.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-kubernetes-ingestor');
      yield import('@roadiehq/scaffolder-backend-module-utils/new-backend');
      yield import('@terasky/backstage-plugin-scaffolder-backend-module-terasky-utils');
    }
    if (config.getOptionalBoolean('kubernetesResources.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-kubernetes-resources-permissions-backend');
    }
    if (config.getOptionalBoolean('rbac.enabled') ?? true) {
      yield import('@backstage-community/plugin-rbac-backend');
    }
    if (config.getOptionalBoolean('kyverno.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-kyverno-policy-reports-backend');
    }
    if (config.getOptionalBoolean('educates.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-educates-backend');
    }
    if (config.getOptionalBoolean('aiRules.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-ai-rules-backend');
    }
    if (config.getOptionalBoolean('kro.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-kro-resources-backend');
    }
    if (config.getOptionalBoolean('scaleops.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-scaleops-backend');
    }
    if (config.getOptionalBoolean('crossplane.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-crossplane-resources-backend');
    }
    if (config.getOptionalBoolean('catalogMcp.enabled') ?? true) {
      yield import('@terasky/backstage-plugin-catalog-mcp-backend');
    }
    if (config.getOptionalBoolean('scaffolderMcp.enabled') ?? true) {
      yield import('@terasky/plugin-scaffolder-mcp-backend');
    }
    if (config.getOptionalBoolean('rbacMcp.enabled') ?? true) {
      yield import('@terasky/plugin-rbac-mcp-backend');
    }
  },
}));
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-techdocs-backend'));
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));
backend.add(import('@backstage/plugin-kubernetes-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-bitbucket'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-azure'));
backend.add(import('@backstage/plugin-catalog-backend-module-ldap'));
backend.add(import('@backstage/plugin-catalog-backend-module-msgraph'));
backend.add(import('@backstage/plugin-mcp-actions-backend'));

backend.start();
