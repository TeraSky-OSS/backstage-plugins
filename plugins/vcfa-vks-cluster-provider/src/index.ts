/**
 * VCF Automation VKS Kubernetes cluster supplier plugin for Backstage
 *
 * @packageDocumentation
 */

export { kubernetesModuleVcfaVksClusterSupplier as default } from './module';
export { kubernetesModuleVcfaVksClusterSupplier } from './module';
export { VcfaVksClusterSupplier } from './supplier/VcfaVksClusterSupplier';
export { VcfaVksClient } from './client/VcfaVksClient';
export type {
  VcfaVksClientOptions,
  VcfaVksCluster,
  VcfaSupervisorNamespace,
} from './client/VcfaVksClient';
export type { VcfaVksConfig, RBACConfig, RBACRule } from './supplier/VcfaVksClusterSupplier';
