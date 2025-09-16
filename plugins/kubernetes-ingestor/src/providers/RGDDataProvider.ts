import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';
import { Logger } from 'winston';

export class RGDDataProvider {
  private readonly logger: Logger;

  constructor(
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
    private readonly config: Config,
    logger: LoggerService,
  ) {
    this.logger = {
      silent: true,
      format: undefined,
      levels: { error: 0, warn: 1, info: 2, debug: 3 },
      level: 'warn',
      error: logger.error.bind(logger),
      warn: logger.warn.bind(logger),
      info: logger.info.bind(logger),
      debug: logger.debug.bind(logger),
      transports: [],
      exceptions: { handle() {} },
      rejections: { handle() {} },
      profilers: {},
      exitOnError: false,
      log: (level: string, msg: string) => {
        switch (level) {
          case 'error': logger.error(msg); break;
          case 'warn': logger.warn(msg); break;
          case 'info': logger.info(msg); break;
          case 'debug': logger.debug(msg); break;
          default: logger.info(msg);
        }
      },
    } as unknown as Logger;
  }


  async fetchRGDObjects(): Promise<any[]> {
    try {
      // Check if KRO is enabled
      const isKROEnabled = this.config.getOptionalBoolean('kubernetesIngestor.kro.enabled') ?? false;
      if (!isKROEnabled) {
        this.logger.debug('KRO integration is disabled');
        return [];
      }

      // Get allowed clusters from config or discover them
      const allowedClusters = this.config.getOptionalStringArray('kubernetesIngestor.allowedClusterNames');
      let clusters: string[] = [];
      
      if (allowedClusters) {
        clusters = allowedClusters;
      } else {
        try {
          clusters = await this.resourceFetcher.getClusters();
        } catch (error) {
          this.logger.error('Failed to discover clusters:', error instanceof Error ? error : { error: String(error) });
          return [];
        }
      }

      if (clusters.length === 0) {
        this.logger.warn('No clusters found.');
        return [];
      }

      const allRGDs: any[] = [];

      for (const clusterName of clusters) {
        try {
          // Fetch RGDs from the cluster
          const rgds = await this.resourceFetcher.fetchResources({
            clusterName,
            resourcePath: 'kro.run/v1alpha1/resourcegraphdefinitions',
          });

          // Process each RGD
          for (const rgd of rgds as any[]) {
            if (rgd.status?.state !== 'Active') {
              this.logger.debug(`Skipping inactive RGD ${rgd.metadata.name}`);
              continue;
            }

            // Fetch the CRD for this RGD
            const crds = await this.resourceFetcher.fetchResources({
              clusterName,
              resourcePath: 'apiextensions.k8s.io/v1/customresourcedefinitions',
              query: {
                labelSelector: `kro.run/resource-graph-definition-id=${rgd.metadata.uid}`,
              },
            });

            if (crds.length === 0) {
              this.logger.warn(`No CRD found for RGD ${rgd.metadata.name}`);
              continue;
            }

            // Add cluster info and CRD to the RGD object
            const enrichedRGD = {
              ...rgd as Record<string, unknown>,
              clusterName,
              clusterEndpoint: clusterName,
              generatedCRD: crds[0],
              clusterDetails: [{
                name: clusterName,
                url: clusterName,
              }],
            };

            allRGDs.push(enrichedRGD);
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch RGDs for cluster ${clusterName}: ${error}`,
          );
        }
      }

      return allRGDs;
    } catch (error) {
      this.logger.error('Error fetching RGD objects:', error as Error);
      return [];
    }
  }

  async buildRGDLookup(): Promise<Record<string, any>> {
    const rgds = await this.fetchRGDObjects();
    const lookup: Record<string, any> = {};

    rgds.forEach(rgd => {
      if (rgd.generatedCRD) {
        const crd = rgd.generatedCRD;
        const kind = crd.spec.names.kind;
        const group = crd.spec.group;
        crd.spec.versions.forEach((version: any) => {
          const key = `${kind}|${group}|${version.name}`;
          lookup[key] = {
            rgd,
            scope: crd.spec.scope,
            spec: crd.spec,
          };
        });
      }
    });

    return lookup;
  }
}
