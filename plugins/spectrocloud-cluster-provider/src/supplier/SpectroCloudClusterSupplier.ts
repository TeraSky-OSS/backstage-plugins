import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { ClusterDetails, KubernetesClustersSupplier } from '@backstage/plugin-kubernetes-node';
import * as k8s from '@kubernetes/client-node';
import { SpectroCloudClient } from '../client/SpectroCloudClient';

export interface RBACRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface RBACConfig {
  namespace: string;
  serviceAccountName: string;
  secretName: string;
  clusterRoleName: string;
  clusterRoleBindingName: string;
  clusterRoleRules?: RBACRule[];
}

export interface SpectroCloudConfig {
  url: string;
  tenant: string;
  apiToken: string;
  name?: string; // Optional instance name for cluster name prefixing
  includeProjects: string[];
  excludeProjects: string[];
  skipMetricsLookup: boolean;
  excludeTenantScopedClusters: boolean;
  refreshIntervalSeconds: number;
  clusterTimeoutSeconds: number;
  rbac: RBACConfig;
}

export class SpectroCloudClusterSupplier implements KubernetesClustersSupplier {
  private clusterDetails: ClusterDetails[] = [];
  private readonly client: SpectroCloudClient;
  private readonly config: SpectroCloudConfig;
  private readonly logger: LoggerService;

  constructor(config: SpectroCloudConfig, logger: LoggerService) {
    this.logger = logger;
    this.config = config;
    this.client = new SpectroCloudClient(
      {
        url: config.url,
        tenant: config.tenant,
        apiToken: config.apiToken,
      },
      logger,
    );
  }

  static fromConfig(methodConfig: Config, logger: LoggerService): SpectroCloudClusterSupplier {
    // Read cluster provider configuration (if present)
    const clusterProviderConfig = methodConfig.getOptionalConfig('clusterProvider');
    
    // Read RBAC configuration with defaults (from clusterProvider section)
    const rbacConfig = clusterProviderConfig?.getOptionalConfig('rbac');
    const rbacRulesConfig = rbacConfig?.getOptionalConfigArray('clusterRoleRules');
    let clusterRoleRules: RBACRule[] | undefined;
    
    if (rbacRulesConfig) {
      clusterRoleRules = rbacRulesConfig.map(rule => ({
        apiGroups: rule.getStringArray('apiGroups'),
        resources: rule.getStringArray('resources'),
        verbs: rule.getStringArray('verbs'),
      }));
    }

    const spectroConfig: SpectroCloudConfig = {
      // Generic SpectroCloud fields (top-level)
      url: methodConfig.getString('url'),
      tenant: methodConfig.getString('tenant'),
      apiToken: methodConfig.getString('apiToken'),
      name: methodConfig.getOptionalString('name'),
      
      // Cluster provider-specific fields (from clusterProvider section)
      excludeProjects: clusterProviderConfig?.getOptionalStringArray('excludeProjects') ?? [],
      includeProjects: clusterProviderConfig?.getOptionalStringArray('includeProjects') ?? [],
      skipMetricsLookup: clusterProviderConfig?.getOptionalBoolean('skipMetricsLookup') ?? true,
      excludeTenantScopedClusters: clusterProviderConfig?.getOptionalBoolean('excludeTenantScopedClusters') ?? false,
      refreshIntervalSeconds: clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600,
      clusterTimeoutSeconds: clusterProviderConfig?.getOptionalNumber('clusterTimeoutSeconds') ?? 15,
      rbac: {
        namespace: rbacConfig?.getOptionalString('namespace') ?? 'backstage-system',
        serviceAccountName: rbacConfig?.getOptionalString('serviceAccountName') ?? 'backstage-sa',
        secretName: rbacConfig?.getOptionalString('secretName') ?? 'backstage-sa-token',
        clusterRoleName: rbacConfig?.getOptionalString('clusterRoleName') ?? 'backstage-read-only',
        clusterRoleBindingName: rbacConfig?.getOptionalString('clusterRoleBindingName') ?? 'backstage-read-only-binding',
        clusterRoleRules: clusterRoleRules,
      },
    };

    return new SpectroCloudClusterSupplier(spectroConfig, logger);
  }

  async refreshClusters(): Promise<void> {

    try {
      const clusters = await this.client.getAllClusters();
      
      if (!Array.isArray(clusters)) {
        this.logger.error(`getAllClusters() did not return an array: ${typeof clusters}`);
        return;
      }

      const newClusterDetails: ClusterDetails[] = [];

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        try {
          if (!cluster.metadata?.name) {
            this.logger.warn(`Cluster ${i} has no name, skipping`);
            continue;
          }

          if (!cluster.metadata?.uid) {
            this.logger.warn(`Cluster ${cluster.metadata.name} has no UID, skipping`);
            continue;
          }
          
          const projectUid = cluster.metadata.annotations?.projectUid;
          const isProjectScoped = cluster.metadata.annotations?.scope === 'project';
          const isTenantScoped = cluster.metadata.annotations?.scope === 'tenant';

          // Check if we should exclude tenant-scoped clusters
          if (isTenantScoped && this.config.excludeTenantScopedClusters) {
            this.logger.info(`Skipping cluster ${cluster.metadata.name} (tenant-scoped clusters excluded)`);
            continue;
          }

          // Check if cluster should be included based on project filters
          if (isProjectScoped && projectUid) {
            const project = await this.client.getProject(projectUid);
            const projectName = project?.metadata.name;

            if (projectName) {
              // Check excludeProjects
              if (this.config.excludeProjects.length > 0 && this.config.excludeProjects.includes(projectName)) {
                this.logger.info(`Skipping cluster ${cluster.metadata.name} (project ${projectName} is excluded)`);
                continue;
              }

              // Check includeProjects
              if (this.config.includeProjects.length > 0 && !this.config.includeProjects.includes(projectName)) {
                this.logger.info(`Skipping cluster ${cluster.metadata.name} (project ${projectName} not in includeProjects)`);
                continue;
              }
            }
          }

          // Fetch admin kubeconfig and create service account
          const adminKubeconfigText = await this.client.getAdminKubeConfig(
            cluster.metadata.uid,
            isProjectScoped ? projectUid : undefined,
          );

          if (!adminKubeconfigText) {
            this.logger.warn(`Failed to fetch admin kubeconfig for ${cluster.metadata.name}`);
            continue;
          }

          // Apply instance name prefix if configured
          const prefixedClusterName = this.prefixClusterName(cluster.metadata.name);

          const setupPromise = this.setupServiceAccountAccess(
            prefixedClusterName,
            adminKubeconfigText,
          );

          const timeoutPromise = new Promise<ClusterDetails | undefined>((resolve) => {
            setTimeout(() => {
              this.logger.warn(`Timeout: ${prefixedClusterName} unreachable (${this.config.clusterTimeoutSeconds}s)`);
              resolve(undefined);
            }, this.config.clusterTimeoutSeconds * 1000);
          });

          const clusterDetail = await Promise.race([setupPromise, timeoutPromise]);

          if (clusterDetail) {
            newClusterDetails.push(clusterDetail);
          }
          
        } catch (error) {
          const clusterName = cluster?.metadata?.name || `cluster ${i}`;
          this.logger.error(`Error processing ${clusterName}: ${error}`);
        }
      }

      this.logger.info(`Finished processing ${clusters.length} cluster(s), ${newClusterDetails.length} successful`);
      this.clusterDetails = newClusterDetails;
      this.logger.info(`=== SpectroCloud Refresh Complete: ${newClusterDetails.length}/${clusters.length} cluster(s) configured ===`);
    } catch (error) {
      this.logger.error(`FATAL: Failed to refresh SpectroCloud clusters: ${error}`);
      if (error instanceof Error) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
    }
  }

  async getClusters(_options: { credentials: any }): Promise<ClusterDetails[]> {
    return this.clusterDetails;
  }

  /**
   * Apply instance name prefix to cluster name if configured
   */
  private prefixClusterName(clusterName: string): string {
    if (this.config.name) {
      return `${this.config.name}-${clusterName}`;
    }
    return clusterName;
  }

  /**
   * Setup service account token access - creates SA in cluster and extracts token
   */
  private async setupServiceAccountAccess(
    clusterName: string,
    adminKubeconfigYaml: string,
  ): Promise<ClusterDetails | undefined> {
    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromString(adminKubeconfigYaml);

      // Set timeout and skip TLS verification for setup
      const kcCluster = kc.clusters[0];
      if (kcCluster) {
        // @ts-ignore - setting timeout on cluster
        kcCluster.timeout = 10000; // 10 second timeout for each K8s API call
        // @ts-ignore - skip TLS verification for self-signed certs
        kcCluster.skipTLSVerify = true;
      }

      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      const rbacApi = kc.makeApiClient(k8s.RbacAuthorizationV1Api);

      const { namespace, serviceAccountName, secretName, clusterRoleName, clusterRoleBindingName, clusterRoleRules } = this.config.rbac;

      // Create namespace
      try {
        await k8sApi.readNamespace({ name: namespace });
      } catch (error: any) {
        if (error.statusCode === 404) {
          await k8sApi.createNamespace({ body: { metadata: { name: namespace } } });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
          throw new Error(`Cannot reach cluster ${clusterName}: ${error.code}`);
        } else {
          throw error;
        }
      }

      // Create service account
      try {
        await k8sApi.readNamespacedServiceAccount({ name: serviceAccountName, namespace });
      } catch (error: any) {
        if (error.statusCode === 404) {
          await k8sApi.createNamespacedServiceAccount({
            namespace,
            body: { metadata: { name: serviceAccountName } },
          });
        } else {
          throw error;
        }
      }

      // Create secret for SA token
      try {
        await k8sApi.readNamespacedSecret({ name: secretName, namespace });
      } catch (error: any) {
        if (error.statusCode === 404) {
          await k8sApi.createNamespacedSecret({
            namespace,
            body: {
              metadata: {
                name: secretName,
                annotations: {
                  'kubernetes.io/service-account.name': serviceAccountName,
                },
              },
              type: 'kubernetes.io/service-account-token',
            },
          });
        } else {
          throw error;
        }
      }

      // Create ClusterRole
      try {
        await rbacApi.readClusterRole({ name: clusterRoleName });
      } catch (error: any) {
        if (error.statusCode === 404) {
          // Use custom rules if provided, otherwise use default read-only rules
          let rules = clusterRoleRules || [
            {
              apiGroups: ['*'],
              resources: ['*'],
              verbs: ['get', 'list', 'watch'],
            },
          ];
          
          // Convert 'core' to empty string for Kubernetes core API group
          rules = rules.map(rule => ({
            ...rule,
            apiGroups: rule.apiGroups.map(group => group === 'core' ? '' : group),
          }));
          
          await rbacApi.createClusterRole({
            body: {
              metadata: { name: clusterRoleName },
              rules,
            },
          });
        } else {
          throw error;
        }
      }

      // Create ClusterRoleBinding
      try {
        await rbacApi.readClusterRoleBinding({ name: clusterRoleBindingName });
      } catch (error: any) {
        if (error.statusCode === 404) {
          await rbacApi.createClusterRoleBinding({
            body: {
              metadata: { name: clusterRoleBindingName },
              roleRef: {
                apiGroup: 'rbac.authorization.k8s.io',
                kind: 'ClusterRole',
                name: clusterRoleName,
              },
              subjects: [
                {
                  kind: 'ServiceAccount',
                  name: serviceAccountName,
                  namespace: namespace,
                },
              ],
            },
          });
        } else {
          throw error;
        }
      }

      // Wait for secret to be populated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the service account token
      const secretResponse = await k8sApi.readNamespacedSecret({ name: secretName, namespace });
      const token = secretResponse.data?.token;
      const caCert = secretResponse.data?.['ca.crt'];

      if (!token) {
        throw new Error('Service account token not found in secret');
      }

      const serviceAccountToken = Buffer.from(token, 'base64').toString('utf-8');
      const cluster = kc.clusters[0];
      const server = cluster.server;
      const caData = caCert ? Buffer.from(caCert, 'base64').toString('utf-8') : cluster.caData;

      this.logger.info(`✓ ${clusterName} (Service Account)`);

      return {
        name: clusterName,
        url: server,
        authMetadata: {
          'kubernetes.io/auth-provider': 'serviceAccount',
          serviceAccountToken,
        },
        caData,
        skipTLSVerify: true, // SpectroCloud clusters typically use self-signed certs
        skipMetricsLookup: this.config.skipMetricsLookup,
      };
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH') {
        this.logger.warn(`Network error for ${clusterName}: ${error.code}`);
      } else {
        this.logger.error(`Failed to setup ${clusterName}: ${error.message || error}`);
      }
      return undefined;
    }
  }
}

