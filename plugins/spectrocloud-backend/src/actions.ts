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
  viewPackManifestsPermission,
  viewProfileInfoPermission,
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

  // Helper to get SpectroCloud client from config when no entity is present (list actions, UID-based calls).
  // Uses backend API token; no user token available in MCP context.
  function getClientFromConfig(instanceName?: string): SpectroCloudClient {
    const spectroCloudConfigObj = config.getOptionalConfig('spectrocloud');
    const spectroCloudEnvironments = spectroCloudConfigObj?.getOptionalConfigArray('environments');
    if (!spectroCloudEnvironments || spectroCloudEnvironments.length === 0) {
      throw new InputError('No SpectroCloud environments configured');
    }
    let matchingConfig = spectroCloudEnvironments[0];
    if (instanceName) {
      const found = spectroCloudEnvironments.find((cfg: Config) => cfg.getOptionalString('name') === instanceName);
      if (found) {
        matchingConfig = found;
      }
    }
    return new SpectroCloudClient(
      {
        url: matchingConfig.getString('url'),
        tenant: matchingConfig.getString('tenant'),
        apiToken: matchingConfig.getString('apiToken'),
        instanceName: matchingConfig.getOptionalString('name'),
      },
      {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
        child: () => ({} as any),
      } as any,
    );
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

  // 5. List all clusters
  actionsRegistry.register({
    name: 'list_spectrocloud_clusters',
    title: 'List SpectroCloud Clusters',
    description: 'List all SpectroCloud clusters (optionally by project). Uses backend API token.',
    schema: {
      input: (z: typeof zod) => z.object({
        instanceName: z.string().optional().describe('SpectroCloud instance name when multiple are configured'),
        projectUid: z.string().optional().describe('Filter by project UID'),
      }),
      output: (z: typeof zod) => z.object({
        clusters: z.array(z.object({
          uid: z.string(),
          name: z.string(),
          state: z.string().optional(),
          cloudType: z.string().optional(),
        })).describe('List of clusters'),
      }),
    },
    action: async ({ input }: { input: { instanceName?: string; projectUid?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const clusters = await client.getAllClusters();
        const list = (input.projectUid
          ? clusters.filter(c => c.metadata?.annotations?.projectUid === input.projectUid)
          : clusters
        ).map(c => ({
          uid: c.metadata?.uid ?? '',
          name: c.metadata?.name ?? '',
          state: c.status?.state,
          cloudType: c.spec?.cloudType ?? c.spec?.cloudConfig?.cloudType,
        }));
        return { output: { clusters: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list clusters: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 6. List all virtual clusters
  actionsRegistry.register({
    name: 'list_spectrocloud_virtual_clusters',
    title: 'List SpectroCloud Virtual Clusters',
    description: 'List all SpectroCloud virtual clusters.',
    schema: {
      input: (z: typeof zod) => z.object({
        instanceName: z.string().optional().describe('SpectroCloud instance name when multiple are configured'),
      }),
      output: (z: typeof zod) => z.object({
        virtualClusters: z.array(z.object({
          uid: z.string(),
          name: z.string(),
          state: z.string().optional(),
        })).describe('List of virtual clusters'),
      }),
    },
    action: async ({ input }: { input: { instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const virtualClusters = await client.getAllVirtualClusters();
        const list = virtualClusters.map(c => ({
          uid: c.metadata?.uid ?? '',
          name: c.metadata?.name ?? '',
          state: c.status?.state,
        }));
        return { output: { virtualClusters: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list virtual clusters: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 7. List all projects
  actionsRegistry.register({
    name: 'list_spectrocloud_projects',
    title: 'List SpectroCloud Projects',
    description: 'List all SpectroCloud projects.',
    schema: {
      input: (z: typeof zod) => z.object({
        instanceName: z.string().optional().describe('SpectroCloud instance name when multiple are configured'),
      }),
      output: (z: typeof zod) => z.object({
        projects: z.array(z.object({
          uid: z.string(),
          name: z.string(),
        })).describe('List of projects'),
      }),
    },
    action: async ({ input }: { input: { instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const projects = await client.getAllProjects();
        const list = projects.map(p => ({
          uid: p.metadata?.uid ?? '',
          name: p.metadata?.name ?? '',
        }));
        return { output: { projects: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list projects: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 8. List cluster groups
  actionsRegistry.register({
    name: 'list_spectrocloud_cluster_groups',
    title: 'List SpectroCloud Cluster Groups',
    description: 'List cluster groups (optionally by project).',
    schema: {
      input: (z: typeof zod) => z.object({
        instanceName: z.string().optional().describe('SpectroCloud instance name when multiple are configured'),
        projectUid: z.string().optional().describe('Filter by project UID'),
      }),
      output: (z: typeof zod) => z.object({
        clusterGroups: z.array(z.record(z.unknown())).describe('List of cluster group summaries'),
      }),
    },
    action: async ({ input }: { input: { instanceName?: string; projectUid?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const result = await client.getClusterGroups(input.projectUid);
        const items = (result?.items ?? result?.summaries ?? []) as Record<string, unknown>[];
        return { output: { clusterGroups: items } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list cluster groups: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 9. Search profiles by names
  actionsRegistry.register({
    name: 'search_spectrocloud_profiles_by_names',
    title: 'Search SpectroCloud Profiles by Names',
    description: 'Resolve profile UIDs and details by profile names.',
    schema: {
      input: (z: typeof zod) => z.object({
        names: z.array(z.string()).min(1).describe('Profile names to search for'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        profiles: z.array(z.object({
          uid: z.string(),
          name: z.string(),
          cloudType: z.string().optional(),
          type: z.string().optional(),
        })).describe('Matching profiles'),
      }),
    },
    action: async ({ input }: { input: { names: string[]; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewProfileInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const profiles = await client.searchClusterProfilesByName(input.names, input.projectUid);
        const list = profiles.map(p => ({
          uid: p.metadata?.uid ?? '',
          name: p.metadata?.name ?? '',
          cloudType: p.specSummary?.published?.cloudType ?? p.spec?.published?.cloudType,
          type: p.specSummary?.published?.type ?? p.spec?.published?.type,
        }));
        return { output: { profiles: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to search profiles: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 10. Get profile variables (by profileName entity or profileUid)
  actionsRegistry.register({
    name: 'get_spectrocloud_profile_variables',
    title: 'Get SpectroCloud Profile Variables',
    description: 'Get variable definitions for a cluster profile. Identify by profile name (catalog) or by profile UID.',
    schema: {
      input: (z: typeof zod) => z.object({
        profileName: z.string().optional().describe('Profile name (title) in Backstage catalog'),
        profileUid: z.string().optional().describe('Profile UID when not using catalog'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        profileUid: z.string(),
        variables: z.any().describe('Variable definitions from SpectroCloud'),
      }),
    },
    action: async ({ input, credentials }: { input: { profileName?: string; profileUid?: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewProfileInfoPermission);
      try {
        let profileUid: string;
        let projectUid: string | undefined = input.projectUid;
        let client: SpectroCloudClient;

        if (input.profileName) {
          const creds = credentials || await auth.getOwnServiceCredentials();
          const { token } = await auth.getPluginRequestToken({ onBehalfOf: creds, targetPluginId: 'catalog' });
          const entity = await findEntityByTitle(input.profileName, 'spectrocloud-cluster-profile', token);
          const resolved = await getClientForEntity(entity);
          client = resolved.client;
          const prefix = resolved.annotationPrefix;
          profileUid = entity.metadata.annotations?.[`${prefix}/profile-id`] ?? '';
          projectUid = projectUid ?? entity.metadata.annotations?.[`${prefix}/project-id`];
          if (!profileUid) throw new InputError('Profile UID not found in annotations');
        } else if (input.profileUid) {
          profileUid = input.profileUid;
          client = getClientFromConfig(input.instanceName);
        } else {
          throw new InputError('Provide either profileName or profileUid');
        }

        const variables = await client.getProfileVariables(profileUid, projectUid);
        return { output: { profileUid, variables } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get profile variables: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 11. List profiles for project
  actionsRegistry.register({
    name: 'list_spectrocloud_profiles_for_project',
    title: 'List SpectroCloud Profiles for Project',
    description: 'List cluster profiles in a project with optional cloud/type filter.',
    schema: {
      input: (z: typeof zod) => z.object({
        projectUid: z.string().describe('Project UID'),
        cloudType: z.string().optional(),
        profileType: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        profiles: z.array(z.object({
          uid: z.string(),
          name: z.string(),
          cloudType: z.string().optional(),
          type: z.string().optional(),
        })).describe('Profiles in the project'),
      }),
    },
    action: async ({ input }: { input: { projectUid: string; cloudType?: string; profileType?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewProfileInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const profiles = await client.getProjectClusterProfiles(input.projectUid, input.cloudType, input.profileType);
        const list = profiles.map(p => ({
          uid: p.metadata?.uid ?? '',
          name: p.metadata?.name ?? '',
          cloudType: p.specSummary?.published?.cloudType ?? p.spec?.published?.cloudType,
          type: p.specSummary?.published?.type ?? p.spec?.published?.type,
        }));
        return { output: { profiles: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list profiles for project: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 12. Get pack manifest for cluster (clusterName + manifestUid, or clusterUid + projectUid + manifestUid)
  actionsRegistry.register({
    name: 'get_spectrocloud_pack_manifest_for_cluster',
    title: 'Get SpectroCloud Pack Manifest for Cluster',
    description: 'Get manifest content for a pack on a cluster. Identify cluster by name (catalog) or by cluster UID.',
    schema: {
      input: (z: typeof zod) => z.object({
        clusterName: z.string().optional().describe('Cluster name (title) in Backstage catalog'),
        clusterUid: z.string().optional().describe('Cluster UID when not using catalog'),
        manifestUid: z.string().describe('Pack manifest UID'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        clusterUid: z.string(),
        manifestUid: z.string(),
        manifest: z.any().describe('Pack manifest content'),
      }),
    },
    action: async ({ input, credentials }: { input: { clusterName?: string; clusterUid?: string; manifestUid: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewPackManifestsPermission);
      try {
        let clusterUid: string;
        let projectUid: string | undefined = input.projectUid;
        let client: SpectroCloudClient;

        if (input.clusterName) {
          const creds = credentials || await auth.getOwnServiceCredentials();
          const { token } = await auth.getPluginRequestToken({ onBehalfOf: creds, targetPluginId: 'catalog' });
          const entity = await findEntityByTitle(input.clusterName, 'spectrocloud-cluster', token);
          const resolved = await getClientForEntity(entity);
          client = resolved.client;
          const prefix = resolved.annotationPrefix;
          clusterUid = entity.metadata.annotations?.[`${prefix}/cluster-id`] ?? '';
          projectUid = projectUid ?? entity.metadata.annotations?.[`${prefix}/project-id`];
          if (!clusterUid) throw new InputError('Cluster UID not found in annotations');
        } else if (input.clusterUid) {
          clusterUid = input.clusterUid;
          client = getClientFromConfig(input.instanceName);
        } else {
          throw new InputError('Provide either clusterName or clusterUid');
        }

        const manifest = await client.getPackManifest(clusterUid, input.manifestUid, projectUid);
        if (manifest == null) throw new InputError(`Manifest not found: ${input.manifestUid}`);
        return { output: { clusterUid, manifestUid: input.manifestUid, manifest } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get pack manifest: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 13. Get cluster profiles (pack metadata) for a cluster
  actionsRegistry.register({
    name: 'get_spectrocloud_cluster_profiles',
    title: 'Get SpectroCloud Cluster Profiles',
    description: 'Get profiles and pack metadata attached to a cluster. Identify by cluster name (catalog) or cluster UID.',
    schema: {
      input: (z: typeof zod) => z.object({
        clusterName: z.string().optional().describe('Cluster name (title) in Backstage catalog'),
        clusterUid: z.string().optional().describe('Cluster UID when not using catalog'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        clusterUid: z.string(),
        profiles: z.any().describe('Cluster profiles with pack metadata'),
      }),
    },
    action: async ({ input, credentials }: { input: { clusterName?: string; clusterUid?: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewPackValuesPermission);
      try {
        let clusterUid: string;
        let projectUid: string | undefined = input.projectUid;
        let client: SpectroCloudClient;

        if (input.clusterName) {
          const creds = credentials || await auth.getOwnServiceCredentials();
          const { token } = await auth.getPluginRequestToken({ onBehalfOf: creds, targetPluginId: 'catalog' });
          const entity = await findEntityByTitle(input.clusterName, 'spectrocloud-cluster', token);
          const resolved = await getClientForEntity(entity);
          client = resolved.client;
          const prefix = resolved.annotationPrefix;
          clusterUid = entity.metadata.annotations?.[`${prefix}/cluster-id`] ?? '';
          projectUid = projectUid ?? entity.metadata.annotations?.[`${prefix}/project-id`];
          if (!clusterUid) throw new InputError('Cluster UID not found in annotations');
        } else if (input.clusterUid) {
          clusterUid = input.clusterUid;
          client = getClientFromConfig(input.instanceName);
        } else {
          throw new InputError('Provide either clusterName or clusterUid');
        }

        const profiles = await client.getClusterProfiles(clusterUid, projectUid);
        return { output: { clusterUid, profiles } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get cluster profiles: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 14. Get virtual cluster details (UID-based; catalog entity for virtual clusters optional if ingestor supports it)
  actionsRegistry.register({
    name: 'get_spectrocloud_virtual_cluster_details',
    title: 'Get SpectroCloud Virtual Cluster Details',
    description: 'Get health and details for a virtual cluster. Provide virtualClusterUid (and optionally projectUid).',
    schema: {
      input: (z: typeof zod) => z.object({
        virtualClusterUid: z.string().describe('Virtual cluster UID'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        cluster: z.object({
          name: z.string(),
          uid: z.string(),
          state: z.string(),
        }),
      }),
    },
    action: async ({ input }: { input: { virtualClusterUid: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const virtualCluster = await client.getVirtualCluster(input.virtualClusterUid, input.projectUid);
        if (!virtualCluster) throw new InputError(`Virtual cluster not found: ${input.virtualClusterUid}`);
        return {
          output: {
            cluster: {
              name: virtualCluster.metadata?.name ?? '',
              uid: virtualCluster.metadata?.uid ?? input.virtualClusterUid,
              state: virtualCluster.status?.state ?? 'unknown',
            },
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get virtual cluster details: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 15. Get kubeconfig for virtual cluster
  actionsRegistry.register({
    name: 'get_spectrocloud_kubeconfig_for_virtual_cluster',
    title: 'Download SpectroCloud Virtual Cluster Kubeconfig',
    description: 'Generate and download a kubeconfig for a SpectroCloud virtual cluster (client/OIDC access).',
    schema: {
      input: (z: typeof zod) => z.object({
        virtualClusterUid: z.string().describe('Virtual cluster UID'),
        projectUid: z.string().optional(),
        frp: z.boolean().optional().default(true).describe('Use FRP-based kube config if available'),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        cluster: z.object({
          uid: z.string(),
          name: z.string().optional(),
        }),
        kubeconfig: z.string().describe('Kubeconfig YAML content'),
        accessType: z.string(),
      }),
    },
    action: async ({ input }: { input: { virtualClusterUid: string; projectUid?: string; frp?: boolean; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(downloadKubeconfigPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const kubeconfig = await client.getClientKubeConfig(input.virtualClusterUid, input.projectUid, input.frp ?? true);
        if (!kubeconfig) throw new InputError('Failed to retrieve kubeconfig for virtual cluster');
        const vc = await client.getVirtualCluster(input.virtualClusterUid, input.projectUid);
        return {
          output: {
            cluster: { uid: input.virtualClusterUid, name: vc?.metadata?.name },
            kubeconfig,
            accessType: 'client-oidc',
          },
        };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get virtual cluster kubeconfig: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 16. Get cluster group details
  actionsRegistry.register({
    name: 'get_spectrocloud_cluster_group',
    title: 'Get SpectroCloud Cluster Group',
    description: 'Get cluster group details by UID.',
    schema: {
      input: (z: typeof zod) => z.object({
        clusterGroupUid: z.string().describe('Cluster group UID'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        clusterGroup: z.record(z.unknown()).describe('Cluster group object from SpectroCloud'),
      }),
    },
    action: async ({ input }: { input: { clusterGroupUid: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const clusterGroup = await client.getClusterGroup(input.clusterGroupUid, input.projectUid);
        return { output: { clusterGroup: clusterGroup ?? {} } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to get cluster group: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // 17. List cloud accounts by type
  actionsRegistry.register({
    name: 'list_spectrocloud_cloud_accounts',
    title: 'List SpectroCloud Cloud Accounts',
    description: 'List cloud accounts for a cloud type (e.g. aws, azure, vsphere).',
    schema: {
      input: (z: typeof zod) => z.object({
        cloudType: z.string().describe('Cloud type: aws, azure, vsphere, etc.'),
        projectUid: z.string().optional(),
        instanceName: z.string().optional(),
      }),
      output: (z: typeof zod) => z.object({
        accounts: z.array(z.object({
          uid: z.string(),
          name: z.string(),
        })).describe('List of cloud accounts'),
      }),
    },
    action: async ({ input }: { input: { cloudType: string; projectUid?: string; instanceName?: string }; credentials?: BackstageCredentials }) => {
      await checkPermission(viewClusterInfoPermission);
      try {
        const client = getClientFromConfig(input.instanceName);
        const accounts = await client.getCloudAccounts(input.cloudType, input.projectUid);
        const list = accounts.map(a => ({
          uid: a.metadata?.uid ?? '',
          name: a.metadata?.name ?? '',
        }));
        return { output: { accounts: list } };
      } catch (error) {
        if (error instanceof InputError || error instanceof NotAllowedError) throw error;
        throw new InputError(`Failed to list cloud accounts: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}
