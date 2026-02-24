import {
  createFrontendPlugin,
  ApiBlueprint,
  type ExtensionDefinition,
  type FrontendPlugin,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint, EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { Entity } from '@backstage/catalog-model';
import { vcfAutomationApiRef, VcfAutomationClient } from './api';
import { discoveryApiRef, identityApiRef } from '@backstage/core-plugin-api';

const isVCFDeployment = (entity: Entity) => {
  return entity.spec?.type === 'vcf-automation-deployment';
};

const isVCFVSphereVM = (entity: Entity) => {
  const typeValue = entity.spec?.type;

  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cloud.vsphere.machine';
  }
  return false;
};

const isVCFProject = (entity: Entity) => {
  return entity.spec?.type === 'vcf-automation-project';
};

const isVCFGenericResource = (entity: Entity) => {
  return (entity.metadata.tags?.includes('vcf-automation-resource') && entity.kind === 'Resource') || false;
};

const isVCFCCINamespace = (entity: Entity) => {
  const typeValue = entity.spec?.type;

  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cci.supervisor.namespace';
  }
  return false;
};

const isVCFCCIResource = (entity: Entity) => {
  const typeValue = entity.spec?.type;

  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'cci.supervisor.resource';
  }
  return false;
};

/** @alpha */
export const vcfAutomationApi: ExtensionDefinition = ApiBlueprint.make({
  name: 'vcfAutomationApi',
  params: defineParams => defineParams({
    api: vcfAutomationApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      identityApi: identityApiRef,
    },
    factory: ({ discoveryApi, identityApi }) => new VcfAutomationClient({ discoveryApi, identityApi }),
  }),
  disabled: false,
});

/** @alpha */
export const vcfDeploymentOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.deployment-overview',
  params: {
    filter: isVCFDeployment,
    loader: () => import('./components/VCFAutomationDeploymentOverview').then(m => <m.VCFAutomationDeploymentOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfDeploymentContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-automation.deployment-details',
  params: {
    path: '/vcf-automation-deployment',
    title: 'VCF Deployment Details',
    filter: isVCFDeployment,
    loader: () => import('./components/VCFAutomationDeploymentDetails').then(m => <m.VCFAutomationDeploymentDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfVSphereVMOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.vsphere-vm-overview',
  params: {
    filter: isVCFVSphereVM,
    loader: () => import('./components/VCFAutomationVSphereVMOverview').then(m => <m.VCFAutomationVSphereVMOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfVSphereVMContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-automation.vsphere-vm-details',
  params: {
    path: '/vcf-automation-vsphere-vm',
    title: 'VCF vSphere VM Details',
    filter: isVCFVSphereVM,
    loader: () => import('./components/VCFAutomationVSphereVMDetails').then(m => <m.VCFAutomationVSphereVMDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfProjectOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.project-overview',
  params: {
    filter: isVCFProject,
    loader: () => import('./components/VCFAutomationProjectOverview').then(m => <m.VCFAutomationProjectOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfProjectContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-automation.project-details',
  params: {
    path: '/vcf-automation-project',
    title: 'VCF Project Details',
    filter: isVCFProject,
    loader: () => import('./components/VCFAutomationProjectDetails').then(m => <m.VCFAutomationProjectDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfGenericResourceOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.generic-resource-overview',
  params: {
    filter: isVCFGenericResource,
    loader: () => import('./components/VCFAutomationGenericResourceOverview').then(m => <m.VCFAutomationGenericResourceOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfGenericResourceContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-automation.generic-resource-details',
  params: {
    path: '/vcf-automation-generic-resource',
    title: 'VCF Generic Resource Details',
    filter: isVCFGenericResource,
    loader: () => import('./components/VCFAutomationGenericResourceDetails').then(m => <m.VCFAutomationGenericResourceDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfCCINamespaceOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.cci-namespace-overview',
  params: {
    filter: isVCFCCINamespace,
    loader: () => import('./components/VCFAutomationCCINamespaceOverview').then(m => <m.VCFAutomationCCINamespaceOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfCCINamespaceContent: ExtensionDefinition =
  EntityContentBlueprint.make({
  name: 'vcf-automation.cci-namespace-details',
  params: {
    path: '/vcf-automation-cci-namespace',
    title: 'VCF CCI Namespace Details',
    filter: isVCFCCINamespace,
    loader: () => import('./components/VCFAutomationCCINamespaceDetails').then(m => <m.VCFAutomationCCINamespaceDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfCCIResourceOverviewCard: ExtensionDefinition =
  EntityCardBlueprint.make({
  name: 'vcf-automation.cci-resource-overview',
  params: {
    filter: isVCFCCIResource,
    loader: () => import('./components/VCFAutomationCCIResourceOverview').then(m => <m.VCFAutomationCCIResourceOverview />),
  },
  disabled: false,
});

/** @alpha */
export const vcfCCIResourceContent = EntityContentBlueprint.make({
  name: 'vcf-automation.cci-resource-details',
  params: {
    path: '/vcf-automation-cci-resource',
    title: 'VCF CCI Resource Details',
    filter: isVCFCCIResource,
    loader: () => import('./components/VCFAutomationCCIResourceDetails').then(m => <m.VCFAutomationCCIResourceDetails />),
  },
  disabled: false,
});

/** @alpha */
export const vcfAutomationPlugin: FrontendPlugin = createFrontendPlugin({
  pluginId: 'vcf-automation',
  extensions: [
    vcfAutomationApi,
    vcfDeploymentOverviewCard,
    vcfDeploymentContent,
    vcfVSphereVMOverviewCard,
    vcfVSphereVMContent,
    vcfProjectOverviewCard,
    vcfProjectContent,
    vcfGenericResourceOverviewCard,
    vcfGenericResourceContent,
    vcfCCINamespaceOverviewCard,
    vcfCCINamespaceContent,
    vcfCCIResourceOverviewCard,
    vcfCCIResourceContent,
  ],
});

export default vcfAutomationPlugin;