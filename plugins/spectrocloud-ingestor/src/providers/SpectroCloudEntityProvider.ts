import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { SpectroCloudClient, SpectroCloudCluster, SpectroCloudProject, SpectroCloudClusterProfile, ClusterProfileVersion } from '../client/SpectroCloudClient';

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

    const [projects, tenantProfiles, clustersMeta] = await Promise.all([
      shouldFetchProjects ? client.getAllProjects() : Promise.resolve([]),
      shouldFetchProfiles ? client.getAllClusterProfiles() : Promise.resolve([]),
      shouldFetchClusters ? client.getAllClusters() : Promise.resolve([]),
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

    // Fetch full cluster details
    const clusters: SpectroCloudCluster[] = [];
    if (shouldFetchClusters && clustersMeta.length > 0) {
      for (const clusterMeta of clustersMeta) {
        try {
          const projectUid = clusterMeta.metadata.annotations?.projectUid;
          const fullCluster = await client.getCluster(clusterMeta.metadata.uid, projectUid);
          clusters.push(fullCluster || clusterMeta);
        } catch (error) {
          clusters.push(clusterMeta);
        }
      }
    }

    // Create entities
    if (shouldFetchProjects) {
      for (const project of filteredProjects) {
        const entity = this.createProjectEntity(project, cfg, annotationPrefix, instanceName);
        if (entity) entities.push(entity);
      }
    }

    if (shouldFetchProfiles) {
      for (const profile of clusterProfiles) {
        if (!this.shouldIncludeResource(profile, filteredProjects, cfg)) continue;
        const entity = this.createClusterProfileEntity(profile, cfg, annotationPrefix, instanceName, filteredProjects);
        if (entity) entities.push(entity);
      }
    }

    if (shouldFetchClusters) {
      for (const cluster of clusters) {
        if (!this.shouldIncludeResource(cluster, filteredProjects, cfg)) continue;
        const entity = this.createClusterEntity(cluster, cfg, annotationPrefix, instanceName, filteredProjects, clusterProfiles);
        if (entity) entities.push(entity);
      }
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
    resource: SpectroCloudCluster | SpectroCloudClusterProfile,
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
    
    if (scope === 'project' && clusterProjectUid && projects) {
      const project = projects.find(p => p.metadata.uid === clusterProjectUid);
      const projectName = project ? project.metadata.name : clusterProjectUid;
      entityName = this.getEntityName(`${projectName}-${cluster.metadata.name}`, instanceName);
    } else {
      entityName = this.getEntityName(`tenant-${cluster.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

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
          [`${annotationPrefix}/overlord-id`]: cluster.metadata.annotations?.overlordUid || '',
          [`${annotationPrefix}/tenant-id`]: cluster.metadata.annotations?.tenantUid || '',
          [`${annotationPrefix}/cloud-type`]: cluster.spec?.cloudType || 'unknown',
          [`${annotationPrefix}/state`]: cluster.status?.state || 'unknown',
        },
        tags: ['spectrocloud', 'cluster', (cluster.spec?.cloudType || 'unknown').toLowerCase()],
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

  private getEntityName(name: string, instanceName?: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
    if (instanceName) {
      const sanitizedInstance = instanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      return `${sanitizedInstance}-${sanitized}`;
    }
    return sanitized;
  }
}

