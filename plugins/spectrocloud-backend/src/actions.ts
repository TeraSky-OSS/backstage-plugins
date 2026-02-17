import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { PermissionsService, AuthService } from '@backstage/backend-plugin-api';
import { CatalogApi } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { InputError, NotAllowedError } from '@backstage/errors';
import { SpectroCloudClient } from './client/SpectroCloudClient';
import { Config } from '@backstage/config';
import {
  viewClusterInfoPermission,
  downloadKubeconfigPermission,
  viewPackValuesPermission,
  viewProfileClustersPermission,
} from '@terasky/backstage-plugin-spectrocloud-common';
import { z as zod } from 'zod';

// Type for credentials
type BackstageCredentials = Parameters<AuthService['getPluginRequestToken']>[0]['onBehalfOf'];

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  config: Config,
  catalogApi: CatalogApi,
  auth: AuthService,
  permissions?: PermissionsService,
) {
  // Get global SpectroCloud config
  const spectroCloudConfig = config.getOptionalConfig('spectrocloud');
  const enablePermissions = spectroCloudConfig?.getOptionalBoolean('enablePermissions') ?? false;

  // Helper to check permission
  async function checkPermission(
    permission: typeof viewClusterInfoPermission,
  ): Promise<void> {
    if (!enablePermissions || !permissions) {
      return; // Permissions not enabled or service not available
    }
    
    try {
      const credentials = await auth.getOwnServiceCredentials();
      const authorized = await permissions.authorize(
        [{ permission }],
        { credentials }
      );
      
      if (authorized.some(a => a.result !== 'ALLOW')) {
        throw new NotAllowedError(`Permission denied: ${permission.name}`);
      }
    } catch (error) {
      if (error instanceof NotAllowedError) {
        throw error;
      }
      // Log but don't block on permission check failures when service is unavailable
      console.warn(`Permission check failed: ${error}`);
    }
  }

  // Helper to find entity by title and type
  async function findEntityByTitle(title: string, entityType: string, token: string): Promise<Entity> {
    const { items } = await catalogApi.getEntities({
      filter: {
        kind: 'Resource',
        'spec.type': entityType,
        'metadata.title': title,
      },
    }, { token });

    if (items.length === 0) {
      throw new InputError(`No ${entityType} found with title: ${title}`);
    }

    if (items.length > 1) {
      throw new InputError(`Multiple ${entityType} entities found with title: ${title}. Please be more specific.`);
    }

    return items[0];
  }

  // Helper to get SpectroCloud client for an entity
  async function getClientForEntity(entity: Entity): Promise<{ client: SpectroCloudClient; instanceName?: string; annotationPrefix: string }> {
    // Get the SpectroCloud instance from entity annotations
    const annotations = entity.metadata.annotations || {};
    const instanceAnnotation = Object.keys(annotations).find(key => key.endsWith('/instance'));
    const instanceName = instanceAnnotation ? annotations[instanceAnnotation] : undefined;
    
    // Find annotation prefix
    const clusterIdAnnotation = Object.keys(annotations).find(key => key.endsWith('/cluster-id'));
    const annotationPrefix = clusterIdAnnotation ? clusterIdAnnotation.replace('/cluster-id', '') : 'terasky.backstage.io';

    // Get SpectroCloud configuration (object with environments array)
    const spectroCloudConfigObj = config.getOptionalConfig('spectrocloud');
    const spectroCloudEnvironments = spectroCloudConfigObj?.getOptionalConfigArray('environments');
    if (!spectroCloudEnvironments || spectroCloudEnvironments.length === 0) {
      throw new InputError('No SpectroCloud environments configured');
    }

    // Find matching config by instance name or use first one
    let matchingConfig = spectroCloudEnvironments[0];
    if (instanceName) {
      const found = spectroCloudEnvironments.find(cfg => cfg.getOptionalString('name') === instanceName);
      if (found) {
        matchingConfig = found;
      }
    }

    const client = new SpectroCloudClient({
      url: matchingConfig.getString('url'),
      tenant: matchingConfig.getString('tenant'),
      apiToken: matchingConfig.getString('apiToken'),
      instanceName: matchingConfig.getOptionalString('name'),
    }, {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child: () => ({} as any),
    } as any);

    return { client, instanceName: matchingConfig.getOptionalString('name'), annotationPrefix };
  }

  // 1. Get Cluster Health Details
  actionsRegistry.register({
    name: 'get_spectrocloud_health_for_cluster',
    title: 'Get SpectroCloud Cluster Health Details',
    description: 'Get real-time health status, detailed cluster state, node health, and any issues for a SpectroCloud cluster',
    schema: {
      input: (z: typeof zod) => z.object({
        clusterName: z.string().describe('The cluster name (title) as shown in SpectroCloud'),
      }),
      output: (z: typeof zod) => z.object({
        cluster: z.object({
          name: z.string(),
          uid: z.string(),
          state: z.string(),
          entityRef: z.string().describe('Backstage entity reference'),
        }),
        health: z.object({
          overallStatus: z.string().describe('Overall cluster health status'),
          conditions: z.array(z.object({
            type: z.string(),
            status: z.string(),
            message: z.string().optional(),
          })).describe('Detailed health conditions'),
        }),
      }),
    },
    action: async ({ input, credentials }: { input: { clusterName: string }; credentials?: BackstageCredentials }) => {
      // Check permission to view cluster info
      await checkPermission(viewClusterInfoPermission);

      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });

        const entity = await findEntityByTitle(input.clusterName, 'spectrocloud-cluster', token);
        const { client, annotationPrefix } = await getClientForEntity(entity);
        
        const clusterUid = entity.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        const projectUid = entity.metadata.annotations?.[`${annotationPrefix}/project-id`];
        
        if (!clusterUid) {
          throw new InputError('Cluster UID not found in annotations');
        }

        const cluster = await client.getCluster(clusterUid, projectUid);
        
        if (!cluster) {
          throw new InputError(`Cluster not found: ${clusterUid}`);
        }

        return {
          output: {
            cluster: {
              name: cluster.metadata.name,
              uid: cluster.metadata.uid,
              state: cluster.status?.state || 'unknown',
              entityRef: `resource:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
            },
            health: {
              overallStatus: cluster.status?.state || 'unknown',
              conditions: [],
            },
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) {
          throw error;
        }
        throw new InputError(`Failed to get cluster health: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 2. Download Cluster Kubeconfig (Client/OIDC)
  actionsRegistry.register({
    name: 'get_spectrocloud_kubeconfig_for_cluster',
    title: 'Download SpectroCloud Cluster Kubeconfig',
    description: 'Generate and download a kubeconfig file for the SpectroCloud cluster (client/OIDC access, not admin)',
    schema: {
      input: (z: typeof zod) => z.object({
        clusterName: z.string().describe('The cluster name (title) as shown in SpectroCloud'),
        frp: z.boolean().optional().default(true).describe('Use FRP (reverse-proxy) based kube config if available (default: true)'),
      }),
      output: (z: typeof zod) => z.object({
        cluster: z.object({
          name: z.string(),
          uid: z.string(),
          entityRef: z.string().describe('Backstage entity reference'),
        }),
        kubeconfig: z.string().describe('The kubeconfig file content (YAML) with client/OIDC access'),
        accessType: z.string().describe('Type of access: "client-oidc"'),
      }),
    },
    action: async ({ input, credentials }: { input: { clusterName: string; frp?: boolean }; credentials?: BackstageCredentials }) => {
      // Check permission to download kubeconfig
      await checkPermission(downloadKubeconfigPermission);

      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });

        const entity = await findEntityByTitle(input.clusterName, 'spectrocloud-cluster', token);
        const { client, annotationPrefix } = await getClientForEntity(entity);
        
        const clusterUid = entity.metadata.annotations?.[`${annotationPrefix}/cluster-id`];
        const projectUid = entity.metadata.annotations?.[`${annotationPrefix}/project-id`];
        
        if (!clusterUid) {
          throw new InputError('Cluster UID not found in annotations');
        }

        const kubeconfig = await client.getClientKubeConfig(clusterUid, projectUid, input.frp ?? true);
        
        if (!kubeconfig) {
          throw new InputError('Failed to retrieve kubeconfig');
        }

        return {
          output: {
            cluster: {
              name: entity.metadata.name,
              uid: clusterUid,
              entityRef: `resource:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
            },
            kubeconfig,
            accessType: 'client-oidc',
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) {
          throw error;
        }
        throw new InputError(`Failed to get kubeconfig: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });


  // 3. Get Profile Pack Details
  actionsRegistry.register({
    name: 'get_spectrocloud_pack_details_for_profile',
    title: 'Get SpectroCloud Cluster Profile Pack Details',
    description: 'Show what packs and versions are in a cluster profile',
    schema: {
      input: (z: typeof zod) => z.object({
        profileName: z.string().describe('The cluster profile name (title) as shown in SpectroCloud'),
      }),
      output: (z: typeof zod) => z.object({
        profile: z.object({
          name: z.string(),
          uid: z.string(),
          type: z.string().optional(),
          cloudType: z.string().optional(),
          status: z.string().optional(),
          entityRef: z.string().describe('Backstage entity reference'),
        }),
        packs: z.array(z.object({
          name: z.string(),
          version: z.string().optional(),
          layer: z.string().optional(),
        })).describe('List of packs in this profile'),
      }),
    },
    action: async ({ input, credentials }: { input: { profileName: string }; credentials?: BackstageCredentials }) => {
      // Check permission to view pack values
      await checkPermission(viewPackValuesPermission);

      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });

        const entity = await findEntityByTitle(input.profileName, 'spectrocloud-cluster-profile', token);
        const { client, annotationPrefix } = await getClientForEntity(entity);
        
        const profileUid = entity.metadata.annotations?.[`${annotationPrefix}/profile-id`];
        const profileType = entity.metadata.annotations?.[`${annotationPrefix}/profile-type`];
        const cloudType = entity.metadata.annotations?.[`${annotationPrefix}/cloud-type`];
        const status = entity.metadata.annotations?.[`${annotationPrefix}/profile-status`];
        const projectUid = entity.metadata.annotations?.[`${annotationPrefix}/project-id`];
        
        if (!profileUid) {
          throw new InputError('Profile UID not found in annotations');
        }

        // Fetch full profile details including packs
        const profile = await client.getClusterProfile(profileUid, projectUid);
        
        const packs = profile?.spec?.published?.packs?.map(pack => ({
          name: pack.name || 'unknown',
          version: pack.tag,
          layer: pack.layer,
        })) || [];

        return {
          output: {
            profile: {
              name: entity.metadata.title || entity.metadata.name || 'unknown',
              uid: profileUid,
              type: profileType,
              cloudType: cloudType,
              status: status,
              entityRef: `resource:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
            },
            packs,
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) {
          throw error;
        }
        throw new InputError(`Failed to get profile pack details: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 4. Find Clusters Using Profile
  actionsRegistry.register({
    name: 'find_spectrocloud_clusters_for_profile',
    title: 'Find Clusters Using SpectroCloud Profile',
    description: 'List all clusters using this cluster profile (reverse lookup)',
    schema: {
      input: (z: typeof zod) => z.object({
        profileName: z.string().describe('The cluster profile name (title) as shown in SpectroCloud'),
      }),
      output: (z: typeof zod) => z.object({
        profile: z.object({
          name: z.string(),
          uid: z.string(),
          entityRef: z.string().describe('Backstage entity reference'),
        }),
        clusters: z.array(z.object({
          name: z.string(),
          uid: z.string(),
          entityRef: z.string().describe('Backstage entity reference'),
          state: z.string().optional(),
          projectId: z.string().optional(),
        })).describe('List of clusters using this profile'),
      }),
    },
    action: async ({ input, credentials }: { input: { profileName: string }; credentials?: BackstageCredentials }) => {
      // Check permission to view profile clusters
      await checkPermission(viewProfileClustersPermission);

      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });

        const entity = await findEntityByTitle(input.profileName, 'spectrocloud-cluster-profile', token);
        const { annotationPrefix } = await getClientForEntity(entity);
        
        const profileUid = entity.metadata.annotations?.[`${annotationPrefix}/profile-id`];
        
        if (!profileUid) {
          throw new InputError('Profile UID not found in annotations');
        }

        // Query catalog for clusters with this profile in dependsOn
        const { items } = await catalogApi.getEntities({
          filter: {
            kind: 'Resource',
            'spec.type': 'spectrocloud-cluster',
          },
        }, { token });

        // Filter clusters that have this profile in their cluster-profile-refs annotation
        const clustersUsingProfile = items.filter(cluster => {
          const profilesAnnotation = cluster.metadata.annotations?.[`${annotationPrefix}/cluster-profile-refs`];
          if (!profilesAnnotation) return false;
          
          try {
            const profiles = JSON.parse(profilesAnnotation);
            return profiles.some((p: any) => 
              p.name === entity.metadata.name || 
              p.uid === profileUid
            );
          } catch {
            return false;
          }
        });

        const clusters = clustersUsingProfile.map(cluster => ({
          name: cluster.metadata.title || cluster.metadata.name || 'unknown',
          uid: cluster.metadata.annotations?.[`${annotationPrefix}/cluster-id`] || '',
          entityRef: `resource:${cluster.metadata.namespace || 'default'}/${cluster.metadata.name}`,
          state: cluster.metadata.annotations?.[`${annotationPrefix}/state`],
          projectId: cluster.metadata.annotations?.[`${annotationPrefix}/project-id`],
        }));

        return {
          output: {
            profile: {
              name: entity.metadata.title || entity.metadata.name || 'unknown',
              uid: profileUid,
              entityRef: `resource:${entity.metadata.namespace || 'default'}/${entity.metadata.name}`,
            },
            clusters,
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) {
          throw error;
        }
        throw new InputError(`Failed to find clusters using profile: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}
