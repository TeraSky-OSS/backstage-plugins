import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { kubernetesClusterSupplierExtensionPoint } from '@backstage/plugin-kubernetes-node';
import { Duration } from 'luxon';
import { VcfaVksClusterSupplier } from './supplier/VcfaVksClusterSupplier';

/**
 * Backend module for VCF Automation VKS Kubernetes cluster discovery.
 *
 * Extends the default Kubernetes cluster supplier to add VKS clusters discovered
 * via the VCFA supervisor resources API. Auth uses the vCloud Director session API
 * (POST /cloudapi/1.0.0/sessions) and clusters are accessed using service account tokens
 * created in each cluster.
 *
 * Configuration lives under `vcfaVks.instances[]` and is separate from
 * `kubernetes.clusterLocatorMethods` to avoid conflicts with the default Kubernetes plugin.
 *
 * @public
 */
export const kubernetesModuleVcfaVksClusterSupplier = createBackendModule({
  pluginId: 'kubernetes',
  moduleId: 'vcfa-vks-cluster-supplier',
  register(reg) {
    reg.registerInit({
      deps: {
        clusterSupplier: kubernetesClusterSupplierExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ clusterSupplier: clusterSupplierExtPoint, logger, config }) {
        const vcfaVksConfig = config.getOptionalConfig('vcfaVks');

        if (!vcfaVksConfig) {
          logger.info('No vcfaVks configuration found, using only default Kubernetes suppliers');
          return;
        }

        const instanceConfigs = vcfaVksConfig.getOptionalConfigArray('instances');

        if (!instanceConfigs || instanceConfigs.length === 0) {
          logger.info('No vcfaVks instances configured, using only default Kubernetes suppliers');
          return;
        }

        logger.info(`Found ${instanceConfigs.length} vcfaVks instance(s) configured`);

        clusterSupplierExtPoint.addClusterSupplier(async ({ getDefault }) => {
          try {
            const defaultSupplier = await getDefault();
            logger.info('Loaded default Kubernetes cluster suppliers');

            const vcfaSuppliers: Array<{ supplier: VcfaVksClusterSupplier; name: string }> = [];

            for (const instanceConfig of instanceConfigs) {
              const baseUrl = instanceConfig.getString('baseUrl');
              const configuredName = instanceConfig.getOptionalString('name');
              const instanceName = configuredName ?? new URL(baseUrl).hostname.split('.')[0];

              try {
                logger.info(`Creating VKS cluster supplier for VCFA instance: ${instanceName}`);
                const supplier = VcfaVksClusterSupplier.fromConfig(instanceConfig, logger);
                vcfaSuppliers.push({ supplier, name: instanceName });
                logger.info(`Created VKS cluster supplier for ${instanceName}`);

                const clusterProviderConfig = instanceConfig.getOptionalConfig('clusterProvider');
                const refreshIntervalSeconds =
                  clusterProviderConfig?.getOptionalNumber('refreshIntervalSeconds') ?? 600;
                const refreshInterval = Duration.fromObject({ seconds: refreshIntervalSeconds });

                supplier.refreshClusters().then(() => {
                  logger.info(`Initial VKS cluster refresh complete for ${instanceName}`);
                }).catch(err => {
                  logger.error(`Initial VKS cluster refresh failed for ${instanceName}: ${err}`);
                });

                setInterval(() => {
                  supplier.refreshClusters().catch(err => {
                    logger.error(`Periodic VKS cluster refresh failed for ${instanceName}: ${err}`);
                  });
                }, refreshInterval.toMillis());
              } catch (error) {
                logger.error(
                  `Failed to initialize VKS cluster supplier for ${instanceName}: ${error}`,
                );
              }
            }

            if (vcfaSuppliers.length === 0) {
              logger.warn('No VKS cluster suppliers were successfully created');
              return defaultSupplier;
            }

            logger.info(`Successfully created ${vcfaSuppliers.length} VKS cluster supplier(s)`);

            return {
              async getClusters(options) {
                const allResults = await Promise.all([
                  defaultSupplier.getClusters(options),
                  ...vcfaSuppliers.map(s => s.supplier.getClusters(options)),
                ]);

                const defaultClusters = allResults[0];
                const vcfaClusters = allResults.slice(1).flat();
                const allClusters = [...defaultClusters, ...vcfaClusters];

                const clusterNames = new Set<string>();
                const duplicatedNames = new Set<string>();
                for (const { name } of allClusters) {
                  if (clusterNames.has(name)) {
                    duplicatedNames.add(name);
                  } else {
                    clusterNames.add(name);
                  }
                }
                for (const name of duplicatedNames) {
                  logger.warn(`Duplicate cluster name detected: '${name}'`);
                }

                logger.debug(
                  `Combined supplier returning ${allClusters.length} cluster(s) ` +
                  `(${defaultClusters.length} default + ${vcfaClusters.length} VKS)`,
                );

                return allClusters;
              },
            };
          } catch (error) {
            logger.error(`Failed to initialize VKS cluster supplier: ${error}`);
            return getDefault();
          }
        });
      },
    });
  },
});
