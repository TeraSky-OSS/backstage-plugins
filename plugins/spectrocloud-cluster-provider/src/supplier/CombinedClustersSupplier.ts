import { LoggerService } from '@backstage/backend-plugin-api';
import { BackstageCredentials } from '@backstage/backend-plugin-api';
import { ClusterDetails, KubernetesClustersSupplier } from '@backstage/plugin-kubernetes-node';

/**
 * Combines multiple cluster suppliers into one
 * This is used to merge default suppliers (config, catalog, gke) with our SpectroCloud supplier
 */
export class CombinedClustersSupplier implements KubernetesClustersSupplier {
  readonly clusterSuppliers: KubernetesClustersSupplier[];
  readonly logger: LoggerService;

  constructor(
    clusterSuppliers: KubernetesClustersSupplier[],
    logger: LoggerService,
  ) {
    this.clusterSuppliers = clusterSuppliers;
    this.logger = logger;
  }

  async getClusters(options: {
    credentials: BackstageCredentials;
  }): Promise<ClusterDetails[]> {
    this.logger.debug(`CombinedClustersSupplier: Fetching from ${this.clusterSuppliers.length} supplier(s)`);
    
    const clusters = await Promise.all(
      this.clusterSuppliers.map(supplier => supplier.getClusters(options)),
    )
      .then(res => {
        const flattened = res.flat();
        this.logger.debug(`CombinedClustersSupplier: Got ${flattened.length} total cluster(s)`);
        return flattened;
      })
      .catch(e => {
        this.logger.error(`Error fetching clusters from suppliers: ${e}`);
        throw e;
      });
    
    return this.warnDuplicates(clusters);
  }

  private warnDuplicates(clusters: ClusterDetails[]): ClusterDetails[] {
    const clusterNames = new Set<string>();
    const duplicatedNames = new Set<string>();
    
    for (const clusterName of clusters.map(c => c.name)) {
      if (clusterNames.has(clusterName)) {
        duplicatedNames.add(clusterName);
      } else {
        clusterNames.add(clusterName);
      }
    }
    
    for (const clusterName of duplicatedNames) {
      this.logger.warn(`Duplicate cluster name '${clusterName}'`);
    }
    
    return clusters;
  }
}

