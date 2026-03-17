import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { ClusterDetails, KubernetesClustersSupplier } from '@backstage/plugin-kubernetes-node';
import * as k8s from '@kubernetes/client-node';
import { VcfaVksClient } from '../client/VcfaVksClient';

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

export interface VcfaVksConfig {
  baseUrl: string;
  orgName: string;
  username: string;
  password: string;
  name?: string;
  skipMetricsLookup: boolean;
  refreshIntervalSeconds: number;
  clusterTimeoutSeconds: number;
  rbac: RBACConfig;
}

export class VcfaVksClusterSupplier implements KubernetesClustersSupplier {
  private clusterDetails: ClusterDetails[] = [];
  private readonly client: VcfaVksClient;
  private readonly config: VcfaVksConfig;
  private readonly logger: LoggerService;

  constructor(config: VcfaVksConfig, logger: LoggerService) {
    this.config = config;
    this.logger = logger;
    this.client = new VcfaVksClient(
      {
        baseUrl: config.baseUrl,
        orgName: config.orgName,
        username: config.username,
        password: config.password,
      },
      logger,
    );
  }

  static fromConfig(instanceConfig: Config, logger: LoggerService): VcfaVksClusterSupplier {
    const clusterProviderConfig = instanceConfig.getOptionalConfig('clusterProvider');
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

    const vcfaConfig: VcfaVksConfig = {
      baseUrl: instanceConfig.getString('baseUrl'),
      orgName: instanceConfig.getString('orgName'),
      username: instanceConfig.getString('authentication.username'),
      password: instanceConfig.getString('authentication.password'),
      name: instanceConfig.getOptionalString('name'),
      skipMetricsLookup: clusterProviderConfig?.getOptionalBoolean('skipMetricsLookup') ?? true,
      refreshIntervalSeconds: clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600,
      clusterTimeoutSeconds: clusterProviderConfig?.getOptionalNumber('clusterTimeoutSeconds') ?? 15,
      rbac: {
        namespace: rbacConfig?.getOptionalString('namespace') ?? 'backstage-system',
        serviceAccountName: rbacConfig?.getOptionalString('serviceAccountName') ?? 'backstage-sa',
        secretName: rbacConfig?.getOptionalString('secretName') ?? 'backstage-sa-token',
        clusterRoleName: rbacConfig?.getOptionalString('clusterRoleName') ?? 'backstage-read-only',
        clusterRoleBindingName: rbacConfig?.getOptionalString('clusterRoleBindingName') ?? 'backstage-read-only-binding',
        clusterRoleRules,
      },
    };

    return new VcfaVksClusterSupplier(vcfaConfig, logger);
  }

  async getClusters(_options: { credentials: any }): Promise<ClusterDetails[]> {
    return this.clusterDetails;
  }

  async refreshClusters(): Promise<void> {
    try {
      this.logger.info('Starting VKS cluster refresh from VCFA');

      const namespaceMap = await this.client.fetchSupervisorNamespaceMap();
      this.logger.debug(`Loaded ${namespaceMap.size} supervisor namespace(s) from VCFA`);

      const clusters = await this.client.fetchVksClusters();
      this.logger.info(`Found ${clusters.length} VKS cluster(s) in VCFA`);

      const newClusterDetails: ClusterDetails[] = [];

      for (const cluster of clusters) {
        const clusterName = cluster.metadata?.name;
        const namespaceName = cluster.metadata?.namespace;

        if (!clusterName) {
          this.logger.warn('Encountered a cluster resource with no metadata.name, skipping');
          continue;
        }

        if (!namespaceName) {
          this.logger.warn(`Cluster ${clusterName} has no metadata.namespace, skipping`);
          continue;
        }

        const namespaceId = namespaceMap.get(namespaceName);
        if (!namespaceId) {
          this.logger.warn(
            `Cluster ${clusterName}: could not find namespace ID for supervisor namespace '${namespaceName}', skipping`,
          );
          continue;
        }

        const displayName = this.config.name
          ? `${this.config.name}-${clusterName}`
          : clusterName;

        try {
          const adminKubeconfigYaml = await this.client.getAdminKubeConfig(
            namespaceId,
            namespaceName,
            clusterName,
          );

          if (!adminKubeconfigYaml) {
            this.logger.warn(`Failed to fetch admin kubeconfig for cluster ${displayName}`);
            continue;
          }

          const setupPromise = this.setupServiceAccountAccess(displayName, adminKubeconfigYaml);
          const timeoutPromise = new Promise<ClusterDetails | undefined>(resolve => {
            setTimeout(() => {
              this.logger.warn(
                `Timeout: ${displayName} unreachable after ${this.config.clusterTimeoutSeconds}s`,
              );
              resolve(undefined);
            }, this.config.clusterTimeoutSeconds * 1000);
          });

          const clusterDetail = await Promise.race([setupPromise, timeoutPromise]);
          if (clusterDetail) {
            newClusterDetails.push(clusterDetail);
          }
        } catch (error) {
          this.logger.error(
            `Error processing cluster ${displayName}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      this.clusterDetails = newClusterDetails;
      this.logger.info(
        `VKS cluster refresh complete: ${newClusterDetails.length}/${clusters.length} cluster(s) configured`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh VKS clusters from VCFA: ${error instanceof Error ? error.message : error}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack: ${error.stack}`);
      }
    }
  }

  private async setupServiceAccountAccess(
    clusterName: string,
    adminKubeconfigYaml: string,
  ): Promise<ClusterDetails | undefined> {
    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromString(adminKubeconfigYaml);

      const kcCluster = kc.clusters[0];
      if (kcCluster) {
        // @ts-ignore
        kcCluster.timeout = 10000;
        // @ts-ignore
        kcCluster.skipTLSVerify = true;
      }

      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      const rbacApi = kc.makeApiClient(k8s.RbacAuthorizationV1Api);

      const {
        namespace,
        serviceAccountName,
        secretName,
        clusterRoleName,
        clusterRoleBindingName,
        clusterRoleRules,
      } = this.config.rbac;

      // Ensure namespace exists
      try {
        await k8sApi.readNamespace({ name: namespace });
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 404) {
          await k8sApi.createNamespace({ body: { metadata: { name: namespace } } });
        } else if (
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'EHOSTUNREACH'
        ) {
          throw new Error(`Cannot reach cluster ${clusterName}: ${error.code}`);
        } else {
          throw error;
        }
      }

      // Ensure service account exists
      try {
        await k8sApi.readNamespacedServiceAccount({ name: serviceAccountName, namespace });
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 404) {
          await k8sApi.createNamespacedServiceAccount({
            namespace,
            body: { metadata: { name: serviceAccountName } },
          });
        } else {
          throw error;
        }
      }

      // Ensure token secret exists
      try {
        await k8sApi.readNamespacedSecret({ name: secretName, namespace });
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 404) {
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

      // Ensure ClusterRole exists
      try {
        await rbacApi.readClusterRole({ name: clusterRoleName });
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 404) {
          let rules = clusterRoleRules ?? [
            { apiGroups: ['*'], resources: ['*'], verbs: ['get', 'list', 'watch'] },
          ];
          rules = rules.map(rule => ({
            ...rule,
            apiGroups: rule.apiGroups.map(g => (g === 'core' ? '' : g)),
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

      // Ensure ClusterRoleBinding exists
      try {
        await rbacApi.readClusterRoleBinding({ name: clusterRoleBindingName });
      } catch (error: any) {
        if (error.statusCode === 404 || error.code === 404) {
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
                  namespace,
                },
              ],
            },
          });
        } else {
          throw error;
        }
      }

      // Wait for the token to be populated into the secret
      await new Promise(resolve => setTimeout(resolve, 2000));

      const secretResponse = await k8sApi.readNamespacedSecret({ name: secretName, namespace });
      const rawToken = secretResponse.data?.token;
      const rawCaCert = secretResponse.data?.['ca.crt'];

      if (!rawToken) {
        throw new Error(`Service account token not found in secret ${secretName}`);
      }

      const serviceAccountToken = Buffer.from(rawToken, 'base64').toString('utf-8');
      const cluster = kc.clusters[0];
      const caData = rawCaCert
        ? Buffer.from(rawCaCert, 'base64').toString('utf-8')
        : cluster.caData;

      this.logger.info(`✓ ${clusterName} (Service Account)`);

      return {
        name: clusterName,
        url: cluster.server,
        authMetadata: {
          'kubernetes.io/auth-provider': 'serviceAccount',
          serviceAccountToken,
        },
        caData,
        skipTLSVerify: true,
        skipMetricsLookup: this.config.skipMetricsLookup,
      };
    } catch (error: any) {
      if (
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'ENETUNREACH'
      ) {
        this.logger.warn(`Network error for ${clusterName}: ${error.code}`);
      } else {
        this.logger.error(
          `Failed to setup service account for ${clusterName}: ${error.message || error}`,
        );
      }
      return undefined;
    }
  }
}
