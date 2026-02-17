import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { SpectroCloudClient, SpectroCloudCluster, SpectroCloudProject, SpectroCloudClusterProfile, ClusterProfileVersion, SpectroCloudClusterGroup, SpectroCloudVirtualCluster } from '../client/SpectroCloudClient';

interface SpectroCloudConfig {
  url: string;
  tenant: string;
  apiToken: string;
  name?: string;
  catalogProvider?: {
    enabled?: boolean;
    refreshIntervalSeconds?: number;
    defaultOwner?: string;
    ownerNamespace?: string;
    includeProjects?: string[];
    excludeProjects?: string[];
    excludeTenantScopedResources?: boolean;
    resources?: {
      projects?: boolean;
      clusterProfiles?: boolean;
      clusters?: boolean;
      clusterGroups?: boolean;
      virtualClusters?: boolean;
    };
  };
}

export class SpectroCloudEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly clients: Map<string, SpectroCloudClient> = new Map();
  private readonly configs: SpectroCloudConfig[];
  private readonly annotationPrefix: string;

  constructor(
    private readonly taskRunner: SchedulerServiceTaskRunner,
    private readonly logger: LoggerService,
    private readonly config: Config,
  ) {
    // Global annotation prefix from spectrocloud.annotationPrefix
    const spectroCloudConfig = this.config.getOptionalConfig('spectrocloud');
    this.annotationPrefix = spectroCloudConfig?.getOptionalString('annotationPrefix') ?? 'terasky.backstage.io';
    
    this.configs = this.loadConfigs();
    this.initializeClients();
  }

  private loadConfigs(): SpectroCloudConfig[] {
    const spectroCloudConfig = this.config.getOptionalConfig('spectrocloud');
    if (!spectroCloudConfig) {
      this.logger.warn('No SpectroCloud configuration found');
      return [];
    }

    const spectroCloudEnvironments = spectroCloudConfig.getOptionalConfigArray('environments');
    if (!spectroCloudEnvironments || spectroCloudEnvironments.length === 0) {
      this.logger.warn('No SpectroCloud environments configured');
      return [];
    }

    const configs: SpectroCloudConfig[] = [];
    
    for (let index = 0; index < spectroCloudEnvironments.length; index++) {
      const cfg = spectroCloudEnvironments[index];
      const enabled = cfg.getOptionalBoolean('catalogProvider.enabled') ?? true;
      if (!enabled) {
        this.logger.info(`SpectroCloud catalog provider disabled for instance ${index}`);
        continue;
      }

      configs.push({
        url: cfg.getString('url'),
        tenant: cfg.getString('tenant'),
        apiToken: cfg.getString('apiToken'),
        name: cfg.getOptionalString('name'),
        catalogProvider: {
          enabled,
          refreshIntervalSeconds: cfg.getOptionalNumber('catalogProvider.refreshIntervalSeconds') ?? 600,
          defaultOwner: cfg.getOptionalString('catalogProvider.defaultOwner') ?? 'spectrocloud-auto-ingested',
          ownerNamespace: cfg.getOptionalString('catalogProvider.ownerNamespace') ?? 'group',
          includeProjects: cfg.getOptionalStringArray('catalogProvider.includeProjects'),
          excludeProjects: cfg.getOptionalStringArray('catalogProvider.excludeProjects'),
          excludeTenantScopedResources: cfg.getOptionalBoolean('catalogProvider.excludeTenantScopedResources') ?? false,
          resources: {
            projects: cfg.getOptionalBoolean('catalogProvider.resources.projects') ?? true,
            clusterProfiles: cfg.getOptionalBoolean('catalogProvider.resources.clusterProfiles') ?? true,
            clusters: cfg.getOptionalBoolean('catalogProvider.resources.clusters') ?? true,
            clusterGroups: cfg.getOptionalBoolean('catalogProvider.resources.clusterGroups') ?? true,
            virtualClusters: cfg.getOptionalBoolean('catalogProvider.resources.virtualClusters') ?? true,
          },
        },
      });
    }

    return configs;
  }

  private initializeClients(): void {
    for (const cfg of this.configs) {
      const instanceKey = cfg.name || cfg.url;
      const client = new SpectroCloudClient(
        {
          url: cfg.url,
          tenant: cfg.tenant,
          apiToken: cfg.apiToken,
          instanceName: cfg.name,
        },
        this.logger,
      );
      this.clients.set(instanceKey, client);
    }
  }

  getProviderName(): string {
    return 'SpectroCloudEntityProvider';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
  }

  async run(): Promise<void> {
    if (!this.connection) {
      this.logger.error('SpectroCloud EntityProvider: No connection available');
      throw new Error('Connection not initialized');
    }

    this.logger.info(`SpectroCloud Ingestor: Starting ingestion for ${this.configs.length} instance(s)`);
    const allEntities: Entity[] = [];

    for (const cfg of this.configs) {
      const instanceKey = cfg.name || cfg.url;
      const client = this.clients.get(instanceKey);
      if (!client) {
        this.logger.warn(`No client found for instance ${instanceKey}`);
        continue;
      }

      try {
        this.logger.info(`Fetching entities for SpectroCloud instance: ${instanceKey}`);
        const entities = await this.fetchEntitiesForInstance(client, cfg);
        allEntities.push(...entities);
        this.logger.info(`Instance ${instanceKey}: Added ${entities.length} entities`);
      } catch (error) {
        this.logger.error(`Failed to fetch entities for instance ${instanceKey}: ${error}`);
      }
    }

    this.logger.info(`SpectroCloud Ingestor: Applying ${allEntities.length} total entities`);

    await this.connection.applyMutation({
      type: 'full',
      entities: allEntities.map(entity => ({
        entity,
        locationKey: `provider:${this.getProviderName()}`,
      })),
    });

    this.logger.info('SpectroCloud Ingestor: Ingestion complete');
  }

  private async fetchEntitiesForInstance(
    client: SpectroCloudClient,
    cfg: SpectroCloudConfig,
  ): Promise<Entity[]> {
    const entities: Entity[] = [];
    const annotationPrefix = this.annotationPrefix;
    const instanceName = cfg.name;

    const shouldFetchProjects = cfg.catalogProvider?.resources?.projects !== false;
    const shouldFetchProfiles = cfg.catalogProvider?.resources?.clusterProfiles !== false;
    const shouldFetchClusters = cfg.catalogProvider?.resources?.clusters !== false;
    const shouldFetchClusterGroups = cfg.catalogProvider?.resources?.clusterGroups !== false;
    const shouldFetchVirtualClusters = cfg.catalogProvider?.resources?.virtualClusters !== false;

    const [projects, tenantProfiles, clustersMeta, tenantClusterGroups, virtualClustersMeta] = await Promise.all([
      shouldFetchProjects ? client.getAllProjects() : Promise.resolve([]),
      shouldFetchProfiles ? client.getAllClusterProfiles() : Promise.resolve([]),
      shouldFetchClusters ? client.getAllClusters() : Promise.resolve([]),
      shouldFetchClusterGroups ? client.getAllClusterGroups() : Promise.resolve([]),
      shouldFetchVirtualClusters ? client.getAllVirtualClusters() : Promise.resolve([]),
    ]);

    const filteredProjects = this.filterProjects(projects, cfg);

    // Fetch project-scoped cluster profiles
    const projectProfiles: SpectroCloudClusterProfile[] = [];
    if (shouldFetchProfiles && filteredProjects.length > 0) {
      for (const project of filteredProjects) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
          );
          const profiles = await Promise.race([
            client.getProjectClusterProfiles(project.metadata.uid),
            timeoutPromise
          ]);
          projectProfiles.push(...profiles);
        } catch (error) {
          this.logger.warn(`Failed to fetch profiles for project ${project.metadata.name}: ${error}`);
        }
      }
    }

    const clusterProfiles = [...tenantProfiles, ...projectProfiles];

    // Fetch project-scoped cluster groups
    const projectClusterGroups: SpectroCloudClusterGroup[] = [];
    if (shouldFetchClusterGroups && filteredProjects.length > 0) {
      for (const project of filteredProjects) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 30s')), 30000)
          );
          const groups = await Promise.race([
            client.getProjectClusterGroups(project.metadata.uid),
            timeoutPromise
          ]);
          projectClusterGroups.push(...groups);
        } catch (error) {
          this.logger.warn(`Failed to fetch cluster groups for project ${project.metadata.name}: ${error}`);
        }
      }
    }

    const clusterGroupsMeta = [...tenantClusterGroups, ...projectClusterGroups];
    this.logger.info(`[INGESTOR] Fetched ${tenantClusterGroups.length} tenant cluster groups and ${projectClusterGroups.length} project cluster groups`);

    // Fetch full cluster group details (summaries don't include clusterRefs)
    const clusterGroups: SpectroCloudClusterGroup[] = [];
    if (shouldFetchClusterGroups && clusterGroupsMeta.length > 0) {
      this.logger.info(`[INGESTOR] Fetching full details for ${clusterGroupsMeta.length} cluster groups...`);
      for (const clusterGroupMeta of clusterGroupsMeta) {
        try {
          const projectUid = clusterGroupMeta.metadata.annotations?.projectUid;
          const fullClusterGroup = await client.getClusterGroup(clusterGroupMeta.metadata.uid, projectUid);
          if (fullClusterGroup) {
            this.logger.debug(`[INGESTOR] Cluster group ${fullClusterGroup.metadata.name} - has ${fullClusterGroup.spec?.clusterRefs?.length || 0} cluster refs`);
          }
          clusterGroups.push(fullClusterGroup || clusterGroupMeta);
        } catch (error) {
          this.logger.warn(`[INGESTOR] Failed to fetch details for cluster group ${clusterGroupMeta.metadata.name}: ${error}`);
          clusterGroups.push(clusterGroupMeta);
        }
      }
      this.logger.info(`[INGESTOR] Fetched full details for ${clusterGroups.length} cluster groups`);
    }

    // Virtual clusters: getAllVirtualClusters already returns ALL virtual clusters (tenant + project scoped)
    // So we don't need to fetch them per-project to avoid duplicates
    // Just use the already fetched virtual clusters and deduplicate by UID
    const virtualClustersMap = new Map<string, SpectroCloudVirtualCluster>();
    for (const vc of virtualClustersMeta) {
      virtualClustersMap.set(vc.metadata.uid, vc);
    }
    const virtualClusters = Array.from(virtualClustersMap.values());
    this.logger.info(`[INGESTOR] Fetched ${virtualClusters.length} virtual clusters (deduplicated)`);

    // Fetch full cluster details
    const clusters: SpectroCloudCluster[] = [];
    if (shouldFetchClusters && clustersMeta.length > 0) {
      this.logger.info(`[INGESTOR] Fetching full details for ${clustersMeta.length} clusters...`);
      for (const clusterMeta of clustersMeta) {
        try {
          const projectUid = clusterMeta.metadata.annotations?.projectUid;
          const fullCluster = await client.getCluster(clusterMeta.metadata.uid, projectUid);
          if (fullCluster) {
            this.logger.info(`[INGESTOR] Cluster ${fullCluster.metadata.name} - cloudType from spec: ${fullCluster.spec?.cloudType}, from cloudConfig: ${(fullCluster.spec as any)?.cloudConfig?.cloudType}, projectUid: ${fullCluster.metadata.annotations?.projectUid}`);
          }
          clusters.push(fullCluster || clusterMeta);
        } catch (error) {
          this.logger.warn(`[INGESTOR] Failed to fetch details for cluster ${clusterMeta.metadata.name}: ${error}`);
          clusters.push(clusterMeta);
        }
      }
      this.logger.info(`[INGESTOR] Fetched full details for ${clusters.length} clusters`);
    }

    // Create entities in order (to enable dependency resolution)
    // 1. Projects (systems)
    if (shouldFetchProjects) {
      for (const project of filteredProjects) {
        const entity = this.createProjectEntity(project, cfg, annotationPrefix, instanceName);
        if (entity) entities.push(entity);
      }
    }

    // 2. Cluster profiles
    if (shouldFetchProfiles) {
      for (const profile of clusterProfiles) {
        if (!this.shouldIncludeResource(profile, filteredProjects, cfg)) continue;
        const entity = this.createClusterProfileEntity(profile, cfg, annotationPrefix, instanceName, filteredProjects);
        if (entity) entities.push(entity);
      }
    }

    // 3. Regular clusters (excluding virtual clusters)
    if (shouldFetchClusters) {
      for (const cluster of clusters) {
        if (!this.shouldIncludeResource(cluster, filteredProjects, cfg)) continue;
        // Skip virtual clusters - they will be created separately
        const cloudType = (cluster.spec as any)?.cloudConfig?.cloudType || cluster.spec?.cloudType;
        if (cloudType === 'nested') continue;
        
        const entity = this.createClusterEntity(cluster, cfg, annotationPrefix, instanceName, filteredProjects, clusterProfiles);
        if (entity) entities.push(entity);
      }
    }

    // 4. Cluster groups (depend on clusters and cluster profiles)
    if (shouldFetchClusterGroups) {
      this.logger.info(`[INGESTOR] Processing ${clusterGroups.length} cluster groups`);
      let clusterGroupCount = 0;
      for (const clusterGroup of clusterGroups) {
        this.logger.debug(`[INGESTOR] Cluster group: ${clusterGroup.metadata.name} (${clusterGroup.metadata.uid}), scope: ${clusterGroup.metadata.annotations?.scope}`);
        if (!this.shouldIncludeResource(clusterGroup, filteredProjects, cfg)) {
          this.logger.debug(`[INGESTOR] Cluster group ${clusterGroup.metadata.name} filtered out`);
          continue;
        }
        const entity = this.createClusterGroupEntity(clusterGroup, cfg, annotationPrefix, instanceName, filteredProjects, clusters, clusterProfiles);
        if (entity) {
          entities.push(entity);
          clusterGroupCount++;
        } else {
          this.logger.warn(`[INGESTOR] Failed to create entity for cluster group ${clusterGroup.metadata.name}`);
        }
      }
      this.logger.info(`[INGESTOR] Created ${clusterGroupCount} cluster group entities`);
    }

    // 5. Virtual clusters (depend on host clusters, cluster groups, and cluster profiles)
    if (shouldFetchVirtualClusters) {
      this.logger.info(`[INGESTOR] Processing ${virtualClusters.length} virtual clusters`);
      let virtualClusterCount = 0;
      for (const virtualCluster of virtualClusters) {
        this.logger.debug(`[INGESTOR] Virtual cluster: ${virtualCluster.metadata.name} (${virtualCluster.metadata.uid}), scope: ${virtualCluster.metadata.annotations?.scope}`);
        if (!this.shouldIncludeResource(virtualCluster, filteredProjects, cfg)) {
          this.logger.debug(`[INGESTOR] Virtual cluster ${virtualCluster.metadata.name} filtered out`);
          continue;
        }
        const entity = this.createVirtualClusterEntity(virtualCluster, cfg, annotationPrefix, instanceName, filteredProjects, clusters, clusterGroups, clusterProfiles);
        if (entity) {
          entities.push(entity);
          virtualClusterCount++;
        } else {
          this.logger.warn(`[INGESTOR] Failed to create entity for virtual cluster ${virtualCluster.metadata.name}`);
        }
      }
      this.logger.info(`[INGESTOR] Created ${virtualClusterCount} virtual cluster entities`);
    }

    return entities;
  }

  private filterProjects(projects: SpectroCloudProject[], cfg: SpectroCloudConfig): SpectroCloudProject[] {
    const includeProjects = cfg.catalogProvider?.includeProjects;
    const excludeProjects = cfg.catalogProvider?.excludeProjects;
    const excludeTenantScoped = cfg.catalogProvider?.excludeTenantScopedResources;

    return projects.filter(project => {
      if (excludeTenantScoped && project.metadata.annotations?.scope === 'tenant') return false;
      if (includeProjects?.length && !includeProjects.includes(project.metadata.name)) return false;
      if (excludeProjects?.length && excludeProjects.includes(project.metadata.name)) return false;
      return true;
    });
  }

  private shouldIncludeResource(
    resource: SpectroCloudCluster | SpectroCloudClusterProfile | SpectroCloudClusterGroup | SpectroCloudVirtualCluster,
    filteredProjects: SpectroCloudProject[],
    cfg: SpectroCloudConfig,
  ): boolean {
    const excludeTenantScoped = cfg.catalogProvider?.excludeTenantScopedResources;
    if (excludeTenantScoped && resource.metadata.annotations?.scope === 'tenant') return false;

    const includeProjects = cfg.catalogProvider?.includeProjects;
    const excludeProjects = cfg.catalogProvider?.excludeProjects;
    
    if ((includeProjects?.length || excludeProjects?.length)) {
      const resourceProjectUid = resource.metadata.annotations?.projectUid;
      if (resourceProjectUid && !filteredProjects.some(p => p.metadata.uid === resourceProjectUid)) {
        return false;
      }
    }

    return true;
  }

  private createProjectEntity(
    project: SpectroCloudProject,
    cfg: SpectroCloudConfig,
    annotationPrefix: string,
    instanceName?: string,
  ): Entity | null {
    if (!project.metadata?.uid || !project.metadata?.name) return null;

    const entityName = this.getEntityName(project.metadata.name, instanceName);
    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        name: entityName,
        title: project.metadata.name,
        description: project.spec?.description || `SpectroCloud Project: ${project.metadata.name}`,
        annotations: {
          'backstage.io/managed-by-location': `spectrocloud:${cfg.url}`,
          'backstage.io/managed-by-origin-location': `spectrocloud:${cfg.url}`,
          [`${annotationPrefix}/project-id`]: project.metadata.uid,
          [`${annotationPrefix}/scope`]: project.metadata.annotations?.scope || 'project',
          [`${annotationPrefix}/tenant-id`]: project.metadata.annotations?.tenantUid || '',
        },
        tags: ['spectrocloud', 'project'],
      },
      spec: {
        type: 'spectrocloud-project',
        lifecycle: 'production',
        owner: `${ownerNamespace}:default/${defaultOwner}`,
      },
    };

    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    return entity;
  }

  private createClusterProfileEntity(
    profile: SpectroCloudClusterProfile,
    cfg: SpectroCloudConfig,
    annotationPrefix: string,
    instanceName?: string,
    projects?: SpectroCloudProject[],
  ): Entity | null {
    if (!profile.metadata?.uid || !profile.metadata?.name) return null;

    const scope = profile.metadata.annotations?.scope || 'tenant';
    const profileProjectUid = profile.metadata.annotations?.projectUid;
    let entityName: string;
    
    if (scope === 'project' && profileProjectUid && projects) {
      const project = projects.find(p => p.metadata.uid === profileProjectUid);
      const projectName = project ? project.metadata.name : profileProjectUid;
      entityName = this.getEntityName(`${projectName}-${profile.metadata.name}`, instanceName);
    } else {
      entityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';
    const profileTemplate = profile.specSummary?.published || profile.specSummary?.draft;

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Resource',
      metadata: {
        name: entityName,
        title: profile.metadata.name,
        description: `SpectroCloud Cluster Profile: ${profile.metadata.name}`,
        annotations: {
          'backstage.io/managed-by-location': `spectrocloud:${cfg.url}`,
          'backstage.io/managed-by-origin-location': `spectrocloud:${cfg.url}`,
          [`${annotationPrefix}/profile-id`]: profile.metadata.uid,
          [`${annotationPrefix}/scope`]: profile.metadata.annotations?.scope || 'project',
          [`${annotationPrefix}/project-id`]: profile.metadata.annotations?.projectUid || '',
          [`${annotationPrefix}/overlord-id`]: profile.metadata.annotations?.overlordUid || '',
        },
        tags: ['spectrocloud', 'cluster-profile'],
      },
      spec: {
        type: 'spectrocloud-cluster-profile',
        lifecycle: 'production',
        owner: `${ownerNamespace}:default/${defaultOwner}`,
      },
    };

    if (profileTemplate?.type) {
      entity.metadata.annotations![`${annotationPrefix}/profile-type`] = profileTemplate.type;
    }
    if (profileTemplate?.cloudType) {
      entity.metadata.annotations![`${annotationPrefix}/cloud-type`] = profileTemplate.cloudType;
    }
    if (profileTemplate?.version) {
      entity.metadata.annotations![`${annotationPrefix}/version`] = profileTemplate.version;
    }
    if (profile.specSummary?.published) {
      entity.metadata.annotations![`${annotationPrefix}/profile-status`] = 'published';
    } else if (profile.specSummary?.draft) {
      entity.metadata.annotations![`${annotationPrefix}/profile-status`] = 'draft';
    }
    if (profile.specSummary?.versions?.length) {
      const versionsData: ClusterProfileVersion[] = profile.specSummary.versions.map(v => ({
        uid: v.uid,
        version: v.version,
      }));
      entity.metadata.annotations![`${annotationPrefix}/profile-versions`] = JSON.stringify(versionsData);
    }
    if (profile.specSummary?.version) {
      entity.metadata.annotations![`${annotationPrefix}/latest-version`] = profile.specSummary.version;
    }
    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    const projectUid = profile.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        entity.spec.system = `system:default/${this.getEntityName(project.metadata.name, instanceName)}`;
      }
    }

    return entity;
  }

  private createClusterEntity(
    cluster: SpectroCloudCluster,
    cfg: SpectroCloudConfig,
    annotationPrefix: string,
    instanceName?: string,
    projects?: SpectroCloudProject[],
    clusterProfiles?: SpectroCloudClusterProfile[],
  ): Entity | null {
    if (!cluster.metadata?.uid || !cluster.metadata?.name) return null;

    const scope = cluster.metadata.annotations?.scope || 'tenant';
    const clusterProjectUid = cluster.metadata.annotations?.projectUid;
    let entityName: string;
    let projectName = 'tenant';
    
    if (scope === 'project' && clusterProjectUid && projects) {
      const project = projects.find(p => p.metadata.uid === clusterProjectUid);
      projectName = project ? project.metadata.name : clusterProjectUid;
      entityName = this.getEntityName(`${projectName}-${cluster.metadata.name}`, instanceName);
    } else {
      entityName = this.getEntityName(`tenant-${cluster.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

    // Extract cloud type - check cloudConfig.cloudType first as that's where the API usually returns it
    const cloudType = (cluster.spec as any)?.cloudConfig?.cloudType || cluster.spec?.cloudType || 'unknown';
    
    this.logger.info(`Creating entity for cluster ${cluster.metadata.name}: projectName=${projectName}, cloudType=${cloudType}, spec.cloudType=${cluster.spec?.cloudType}, spec.cloudConfig.cloudType=${(cluster.spec as any)?.cloudConfig?.cloudType}`);

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Resource',
      metadata: {
        name: entityName,
        title: cluster.metadata.name,
        description: `SpectroCloud Cluster: ${cluster.metadata.name}`,
        annotations: {
          'backstage.io/managed-by-location': `spectrocloud:${cfg.url}`,
          'backstage.io/managed-by-origin-location': `spectrocloud:${cfg.url}`,
          [`${annotationPrefix}/cluster-id`]: cluster.metadata.uid,
          [`${annotationPrefix}/scope`]: cluster.metadata.annotations?.scope || 'project',
          [`${annotationPrefix}/project-id`]: cluster.metadata.annotations?.projectUid || '',
          [`${annotationPrefix}/project-name`]: projectName,
          [`${annotationPrefix}/overlord-id`]: cluster.metadata.annotations?.overlordUid || '',
          [`${annotationPrefix}/tenant-id`]: cluster.metadata.annotations?.tenantUid || '',
          [`${annotationPrefix}/cloud-type`]: cloudType,
          [`${annotationPrefix}/state`]: cluster.status?.state || 'unknown',
          [`${annotationPrefix}/kubernetes-version`]: cluster.status?.kubeMeta?.kubernetesVersion || cluster.spec?.clusterConfig?.kubernetesVersion || 'N/A',
        },
        tags: ['spectrocloud', 'cluster', cloudType.toLowerCase()],
      },
      spec: {
        type: 'spectrocloud-cluster',
        lifecycle: 'production',
        owner: `${ownerNamespace}:default/${defaultOwner}`,
      },
    };

    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    // Extract Kubernetes version from cluster status or spec
    const k8sVersion = cluster.status?.kubeMeta?.kubernetesVersion || 
                       cluster.spec?.clusterConfig?.kubernetesVersion;
    if (k8sVersion) {
      entity.metadata.annotations![`${annotationPrefix}/kubernetes-version`] = k8sVersion;
    }

    // Store minimal profile data for catalog matching (profile name -> version UID mapping)
    // This is lightweight and needed for the profile card to match clusters to profile versions
    if (cluster.spec?.clusterProfileTemplates?.length) {
      const profileRefs = cluster.spec.clusterProfileTemplates
        .filter(t => t?.name && t?.uid)
        .map(t => ({
          name: t.name,
          uid: t.uid, // This is the profile VERSION uid
        }));
      if (profileRefs.length) {
        entity.metadata.annotations![`${annotationPrefix}/cluster-profile-refs`] = JSON.stringify(profileRefs);
      }
    }

    const projectUid = cluster.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        entity.spec.system = `system:default/${this.getEntityName(project.metadata.name, instanceName)}`;
      }
    }

    if (entity.spec && cluster.spec?.clusterProfileTemplates?.length && clusterProfiles) {
      const dependsOn: string[] = [];
      for (const template of cluster.spec.clusterProfileTemplates) {
        if (!template?.uid && !template?.name) continue;
        const profile = clusterProfiles.find(p => 
          (template.uid && p.metadata.uid === template.uid) ||
          (template.name && p.metadata.name === template.name)
        );
        if (profile) {
          const profileProjectUid = profile.metadata.annotations?.projectUid;
          let profileEntityName: string;
          if (profileProjectUid && projects) {
            const profileProject = projects.find(p => p.metadata.uid === profileProjectUid);
            profileEntityName = profileProject
              ? this.getEntityName(`${profileProject.metadata.name}-${profile.metadata.name}`, instanceName)
              : this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
          } else {
            profileEntityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
          }
          dependsOn.push(`resource:default/${profileEntityName}`);
        }
      }
      if (dependsOn.length) {
        entity.spec.dependsOn = dependsOn;
      }
    }

    return entity;
  }

  private createClusterGroupEntity(
    clusterGroup: SpectroCloudClusterGroup,
    cfg: SpectroCloudConfig,
    annotationPrefix: string,
    instanceName?: string,
    projects?: SpectroCloudProject[],
    clusters?: SpectroCloudCluster[],
    clusterProfiles?: SpectroCloudClusterProfile[],
  ): Entity | null {
    if (!clusterGroup.metadata?.uid || !clusterGroup.metadata?.name) return null;

    const scope = clusterGroup.metadata.annotations?.scope || 'tenant';
    const clusterGroupProjectUid = clusterGroup.metadata.annotations?.projectUid;
    let entityName: string;
    
    if (scope === 'project' && clusterGroupProjectUid && projects) {
      const project = projects.find(p => p.metadata.uid === clusterGroupProjectUid);
      const projectName = project ? project.metadata.name : clusterGroupProjectUid;
      entityName = this.getEntityName(`${projectName}-${clusterGroup.metadata.name}`, instanceName);
    } else {
      entityName = this.getEntityName(`tenant-${clusterGroup.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Resource',
      metadata: {
        name: entityName,
        title: clusterGroup.metadata.name,
        description: `SpectroCloud Cluster Group: ${clusterGroup.metadata.name}`,
        annotations: {
          'backstage.io/managed-by-location': `spectrocloud:${cfg.url}`,
          'backstage.io/managed-by-origin-location': `spectrocloud:${cfg.url}`,
          [`${annotationPrefix}/cluster-group-id`]: clusterGroup.metadata.uid,
          [`${annotationPrefix}/scope`]: clusterGroup.metadata.annotations?.scope || 'tenant',
          [`${annotationPrefix}/project-id`]: clusterGroup.metadata.annotations?.projectUid || '',
        },
        tags: ['spectrocloud', 'cluster-group'],
      },
      spec: {
        type: 'spectrocloud-cluster-group',
        lifecycle: 'production',
        owner: `${ownerNamespace}:default/${defaultOwner}`,
      },
    };

    if (clusterGroup.spec?.clustersConfig?.endpointType) {
      entity.metadata.annotations![`${annotationPrefix}/endpoint-type`] = clusterGroup.spec.clustersConfig.endpointType;
    }
    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    // Store profile references
    if (clusterGroup.spec?.clusterProfileTemplates?.length) {
      const profileRefs = clusterGroup.spec.clusterProfileTemplates
        .filter(t => t?.name && t?.uid)
        .map(t => ({
          name: t.name,
          uid: t.uid,
        }));
      if (profileRefs.length) {
        entity.metadata.annotations![`${annotationPrefix}/cluster-profile-refs`] = JSON.stringify(profileRefs);
      }
    }

    const projectUid = clusterGroup.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        entity.spec.system = `system:default/${this.getEntityName(project.metadata.name, instanceName)}`;
      }
    }

    // Build dependencies on member clusters and cluster profiles
    if (entity.spec) {
      const dependsOn: string[] = [];

      // Add cluster dependencies (member clusters)
      if (clusterGroup.spec?.clusterRefs?.length && clusters) {
        this.logger.debug(`[INGESTOR] Cluster group ${clusterGroup.metadata.name} has ${clusterGroup.spec.clusterRefs.length} cluster refs`);
        for (const clusterRef of clusterGroup.spec.clusterRefs) {
          if (!clusterRef.clusterUid) continue;
          
          const cluster = clusters.find(c => c.metadata.uid === clusterRef.clusterUid);
          if (cluster) {
            const clusterProjectUid = cluster.metadata.annotations?.projectUid;
            let clusterEntityName: string;
            
            if (clusterProjectUid && projects) {
              const clusterProject = projects.find(p => p.metadata.uid === clusterProjectUid);
              clusterEntityName = clusterProject
                ? this.getEntityName(`${clusterProject.metadata.name}-${cluster.metadata.name}`, instanceName)
                : this.getEntityName(`tenant-${cluster.metadata.name}`, instanceName);
            } else {
              clusterEntityName = this.getEntityName(`tenant-${cluster.metadata.name}`, instanceName);
            }
            dependsOn.push(`resource:default/${clusterEntityName}`);
            this.logger.debug(`[INGESTOR] Added cluster dependency: ${clusterEntityName}`);
          } else {
            this.logger.warn(`[INGESTOR] Cluster group ${clusterGroup.metadata.name} references cluster ${clusterRef.clusterUid} but it was not found`);
          }
        }
      } else {
        this.logger.debug(`[INGESTOR] Cluster group ${clusterGroup.metadata.name} has no clusterRefs in spec`);
      }

      // Add cluster profile dependencies (add-on profiles)
      if (clusterGroup.spec?.clusterProfileTemplates?.length && clusterProfiles) {
        for (const template of clusterGroup.spec.clusterProfileTemplates) {
          if (!template?.uid && !template?.name) continue;
          
          const profile = clusterProfiles.find(p => 
            (template.uid && p.metadata.uid === template.uid) ||
            (template.name && p.metadata.name === template.name)
          );
          
          if (profile) {
            const profileProjectUid = profile.metadata.annotations?.projectUid;
            let profileEntityName: string;
            
            if (profileProjectUid && projects) {
              const profileProject = projects.find(p => p.metadata.uid === profileProjectUid);
              profileEntityName = profileProject
                ? this.getEntityName(`${profileProject.metadata.name}-${profile.metadata.name}`, instanceName)
                : this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
            } else {
              profileEntityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
            }
            dependsOn.push(`resource:default/${profileEntityName}`);
          }
        }
      }

      if (dependsOn.length) {
        entity.spec.dependsOn = dependsOn;
      }
    }

    return entity;
  }

  private createVirtualClusterEntity(
    virtualCluster: SpectroCloudVirtualCluster,
    cfg: SpectroCloudConfig,
    annotationPrefix: string,
    instanceName?: string,
    projects?: SpectroCloudProject[],
    clusters?: SpectroCloudCluster[],
    clusterGroups?: SpectroCloudClusterGroup[],
    clusterProfiles?: SpectroCloudClusterProfile[],
  ): Entity | null {
    if (!virtualCluster.metadata?.uid || !virtualCluster.metadata?.name) return null;

    const scope = virtualCluster.metadata.annotations?.scope || 'tenant';
    const virtualClusterProjectUid = virtualCluster.metadata.annotations?.projectUid;
    let entityName: string;
    let projectName = 'tenant';
    
    if (scope === 'project' && virtualClusterProjectUid && projects) {
      const project = projects.find(p => p.metadata.uid === virtualClusterProjectUid);
      projectName = project ? project.metadata.name : virtualClusterProjectUid;
      entityName = this.getEntityName(`${projectName}-${virtualCluster.metadata.name}`, instanceName);
    } else {
      entityName = this.getEntityName(`tenant-${virtualCluster.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

    // Extract cloud type - virtual clusters should have "nested"
    const cloudType = (virtualCluster.spec as any)?.cloudConfig?.cloudType || virtualCluster.spec?.cloudType || 'nested';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Resource',
      metadata: {
        name: entityName,
        title: virtualCluster.metadata.name,
        description: `SpectroCloud Virtual Cluster: ${virtualCluster.metadata.name}`,
        annotations: {
          'backstage.io/managed-by-location': `spectrocloud:${cfg.url}`,
          'backstage.io/managed-by-origin-location': `spectrocloud:${cfg.url}`,
          [`${annotationPrefix}/cluster-id`]: virtualCluster.metadata.uid,
          [`${annotationPrefix}/scope`]: virtualCluster.metadata.annotations?.scope || 'project',
          [`${annotationPrefix}/project-id`]: virtualCluster.metadata.annotations?.projectUid || '',
          [`${annotationPrefix}/project-name`]: projectName,
          [`${annotationPrefix}/tenant-id`]: virtualCluster.metadata.annotations?.tenantUid || '',
          [`${annotationPrefix}/cloud-type`]: cloudType,
          [`${annotationPrefix}/state`]: virtualCluster.status?.state || 'unknown',
        },
        tags: ['spectrocloud', 'virtual-cluster', 'nested'],
      },
      spec: {
        type: 'spectrocloud-virtual-cluster',
        lifecycle: 'production',
        owner: `${ownerNamespace}:default/${defaultOwner}`,
      },
    };

    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    // Extract Kubernetes version
    const k8sVersion = virtualCluster.status?.kubeMeta?.kubernetesVersion || 
                       virtualCluster.spec?.clusterConfig?.kubernetesVersion;
    if (k8sVersion) {
      entity.metadata.annotations![`${annotationPrefix}/kubernetes-version`] = k8sVersion;
    }

    // Store CPU and Memory quotas/limits
    const cpuLimit = virtualCluster.status?.metrics?.cpu?.limit;
    const memoryLimit = virtualCluster.status?.metrics?.memory?.limit;
    if (cpuLimit !== undefined) {
      entity.metadata.annotations![`${annotationPrefix}/cpu-limit`] = String(cpuLimit);
      entity.metadata.annotations![`${annotationPrefix}/cpu-limit-unit`] = virtualCluster.status?.metrics?.cpu?.unit || 'MilliCore';
    }
    if (memoryLimit !== undefined) {
      entity.metadata.annotations![`${annotationPrefix}/memory-limit`] = String(memoryLimit);
      entity.metadata.annotations![`${annotationPrefix}/memory-limit-unit`] = virtualCluster.status?.metrics?.memory?.unit || 'KiB';
    }

    // Store host cluster and cluster group references
    if (virtualCluster.status?.virtual?.hostCluster?.uid) {
      entity.metadata.annotations![`${annotationPrefix}/host-cluster-id`] = virtualCluster.status.virtual.hostCluster.uid;
    }
    if (virtualCluster.status?.virtual?.clusterGroup?.uid) {
      entity.metadata.annotations![`${annotationPrefix}/cluster-group-id`] = virtualCluster.status.virtual.clusterGroup.uid;
    }

    // Store profile references (from spec or specSummary)
    const profileTemplates = virtualCluster.spec?.clusterProfileTemplates || virtualCluster.specSummary?.clusterProfileTemplates;
    if (profileTemplates?.length) {
      const profileRefs = profileTemplates
        .filter(t => t?.name && t?.uid)
        .map(t => ({
          name: t.name,
          uid: t.uid,
        }));
      if (profileRefs.length) {
        entity.metadata.annotations![`${annotationPrefix}/cluster-profile-refs`] = JSON.stringify(profileRefs);
      }
    }

    const projectUid = virtualCluster.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        entity.spec.system = `system:default/${this.getEntityName(project.metadata.name, instanceName)}`;
      }
    }

    // Build dependencies on host cluster, cluster group, and cluster profiles
    if (entity.spec) {
      const dependsOn: string[] = [];

      // 1. Host cluster dependency
      if (virtualCluster.status?.virtual?.hostCluster?.uid && clusters) {
        const hostCluster = clusters.find(c => c.metadata.uid === virtualCluster.status?.virtual?.hostCluster?.uid);
        if (hostCluster) {
          const hostClusterProjectUid = hostCluster.metadata.annotations?.projectUid;
          let hostClusterEntityName: string;
          
          if (hostClusterProjectUid && projects) {
            const hostClusterProject = projects.find(p => p.metadata.uid === hostClusterProjectUid);
            hostClusterEntityName = hostClusterProject
              ? this.getEntityName(`${hostClusterProject.metadata.name}-${hostCluster.metadata.name}`, instanceName)
              : this.getEntityName(`tenant-${hostCluster.metadata.name}`, instanceName);
          } else {
            hostClusterEntityName = this.getEntityName(`tenant-${hostCluster.metadata.name}`, instanceName);
          }
          dependsOn.push(`resource:default/${hostClusterEntityName}`);
        }
      }

      // 2. Cluster group dependency
      if (virtualCluster.status?.virtual?.clusterGroup?.uid && clusterGroups) {
        const clusterGroup = clusterGroups.find(cg => cg.metadata.uid === virtualCluster.status?.virtual?.clusterGroup?.uid);
        if (clusterGroup) {
          const clusterGroupProjectUid = clusterGroup.metadata.annotations?.projectUid;
          let clusterGroupEntityName: string;
          
          if (clusterGroupProjectUid && projects) {
            const clusterGroupProject = projects.find(p => p.metadata.uid === clusterGroupProjectUid);
            clusterGroupEntityName = clusterGroupProject
              ? this.getEntityName(`${clusterGroupProject.metadata.name}-${clusterGroup.metadata.name}`, instanceName)
              : this.getEntityName(`tenant-${clusterGroup.metadata.name}`, instanceName);
          } else {
            clusterGroupEntityName = this.getEntityName(`tenant-${clusterGroup.metadata.name}`, instanceName);
          }
          dependsOn.push(`resource:default/${clusterGroupEntityName}`);
        }
      }

      // 3. Cluster profile dependencies
      if (profileTemplates?.length && clusterProfiles) {
        for (const template of profileTemplates) {
          if (!template?.uid && !template?.name) continue;
          
          const profile = clusterProfiles.find(p => 
            (template.uid && p.metadata.uid === template.uid) ||
            (template.name && p.metadata.name === template.name)
          );
          
          if (profile) {
            const profileProjectUid = profile.metadata.annotations?.projectUid;
            let profileEntityName: string;
            
            if (profileProjectUid && projects) {
              const profileProject = projects.find(p => p.metadata.uid === profileProjectUid);
              profileEntityName = profileProject
                ? this.getEntityName(`${profileProject.metadata.name}-${profile.metadata.name}`, instanceName)
                : this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
            } else {
              profileEntityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
            }
            dependsOn.push(`resource:default/${profileEntityName}`);
          }
        }
      }

      if (dependsOn.length) {
        entity.spec.dependsOn = dependsOn;
      }
    }

    return entity;
  }

  private getEntityName(name: string, instanceName?: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
    if (instanceName) {
      const sanitizedInstance = instanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      return `${sanitizedInstance}-${sanitized}`;
    }
    return sanitized;
  }
}

