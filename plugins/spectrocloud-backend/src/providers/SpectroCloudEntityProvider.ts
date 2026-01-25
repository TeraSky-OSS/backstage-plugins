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
    annotationPrefix?: string;
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

  constructor(
    private readonly taskRunner: SchedulerServiceTaskRunner,
    private readonly logger: LoggerService,
    private readonly config: Config,
  ) {
    this.configs = this.loadConfigs();
    this.initializeClients();
  }

  private loadConfigs(): SpectroCloudConfig[] {
    const spectroCloudConfigs = this.config.getOptionalConfigArray('spectrocloud');
    if (!spectroCloudConfigs || spectroCloudConfigs.length === 0) {
      this.logger.warn('No SpectroCloud configurations found');
      return [];
    }

    const configs: SpectroCloudConfig[] = [];
    
    for (let index = 0; index < spectroCloudConfigs.length; index++) {
      const cfg = spectroCloudConfigs[index];
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
          annotationPrefix: cfg.getOptionalString('catalogProvider.annotationPrefix') ?? 'terasky.backstage.io',
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
      this.logger.error('SpectroCloud EntityProvider: No connection available, cannot run');
      throw new Error('Connection not initialized');
    }

    this.logger.info(`SpectroCloud EntityProvider: Starting ingestion for ${this.configs.length} instance(s)`);

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
        this.logger.info(`Instance ${instanceKey}: Added ${entities.length} entities to catalog`);
      } catch (error) {
        this.logger.error(`Failed to fetch entities for instance ${instanceKey}: ${error}`);
      }
    }

    this.logger.info(`SpectroCloud EntityProvider: Applying ${allEntities.length} total entities to catalog`);

    await this.connection.applyMutation({
      type: 'full',
      entities: allEntities.map(entity => ({
        entity,
        locationKey: `provider:${this.getProviderName()}`,
      })),
    });

    this.logger.info('SpectroCloud EntityProvider: Ingestion complete');
  }

  private async fetchEntitiesForInstance(
    client: SpectroCloudClient,
    cfg: SpectroCloudConfig,
  ): Promise<Entity[]> {
    const entities: Entity[] = [];
    const annotationPrefix = cfg.catalogProvider?.annotationPrefix || 'spectrocloud.palette.com';
    const instanceName = cfg.name;

    // Default to true if not explicitly set to false
    const shouldFetchProjects = cfg.catalogProvider?.resources?.projects !== false;
    const shouldFetchProfiles = cfg.catalogProvider?.resources?.clusterProfiles !== false;
    const shouldFetchClusters = cfg.catalogProvider?.resources?.clusters !== false;

    // Fetch all resources
    const [projects, tenantProfiles, clustersMeta] = await Promise.all([
      shouldFetchProjects ? client.getAllProjects() : Promise.resolve([]),
      shouldFetchProfiles ? client.getAllClusterProfiles() : Promise.resolve([]),
      shouldFetchClusters ? client.getAllClusters() : Promise.resolve([]),
    ]);

    // Filter projects based on include/exclude lists
    const filteredProjects = this.filterProjects(projects, cfg);

    // Fetch project-scoped cluster profiles for each project
    const projectProfiles: SpectroCloudClusterProfile[] = [];
    if (shouldFetchProfiles && filteredProjects.length > 0) {
      this.logger.info(`Fetching project-scoped cluster profiles for ${filteredProjects.length} projects...`);
      for (const project of filteredProjects) {
        try {
          // Add 30 second timeout for each project
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
      this.logger.info(`Fetched ${projectProfiles.length} project-scoped profiles`);
    }

    // Combine tenant and project profiles
    const clusterProfiles = [...tenantProfiles, ...projectProfiles];
    this.logger.info(`Total cluster profiles: ${clusterProfiles.length} (${tenantProfiles.length} tenant + ${projectProfiles.length} project)`);

    // Fetch full cluster details for each cluster (to get cluster profile templates)
    const clusters: SpectroCloudCluster[] = [];
    if (shouldFetchClusters && clustersMeta.length > 0) {
      this.logger.info(`Fetching full details for ${clustersMeta.length} clusters...`);
      for (const clusterMeta of clustersMeta) {
        try {
          const projectUid = clusterMeta.metadata.annotations?.projectUid;
          const fullCluster = await client.getCluster(clusterMeta.metadata.uid, projectUid);
          if (fullCluster) {
            clusters.push(fullCluster);
          } else {
            this.logger.warn(`Could not fetch full details for cluster ${clusterMeta.metadata.name}, using metadata only`);
            clusters.push(clusterMeta);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch details for cluster ${clusterMeta.metadata.name}: ${error}. Using metadata only.`);
          clusters.push(clusterMeta);
        }
      }
      this.logger.info(`Fetched full details for ${clusters.length} clusters`);
    }

    // Create project entities (System)
    let projectEntitiesCreated = 0;
    if (shouldFetchProjects) {
      this.logger.info(`Creating project entities from ${filteredProjects.length} projects...`);
      for (const project of filteredProjects) {
        const entity = this.createProjectEntity(project, cfg, annotationPrefix, instanceName);
        if (entity) {
          entities.push(entity);
          projectEntitiesCreated++;
        }
      }
      this.logger.info(`Created ${projectEntitiesCreated} project entities`);
    }

    // Create cluster profile entities (Resource)
    let profileEntitiesCreated = 0;
    let profilesSkipped = 0;
    if (shouldFetchProfiles) {
      this.logger.info(`Creating cluster profile entities from ${clusterProfiles.length} profiles...`);
      for (const profile of clusterProfiles) {
        // Filter by project if configured
        if (!this.shouldIncludeResource(profile, filteredProjects, cfg)) {
          profilesSkipped++;
          continue;
        }
        const entity = this.createClusterProfileEntity(profile, cfg, annotationPrefix, instanceName, filteredProjects);
        if (entity) {
          entities.push(entity);
          profileEntitiesCreated++;
        }
      }
      this.logger.info(`Created ${profileEntitiesCreated} cluster profile entities (${profilesSkipped} skipped by filter)`);
    }

    // Create cluster entities (Resource)
    let clusterEntitiesCreated = 0;
    let clustersSkipped = 0;
    if (shouldFetchClusters) {
      this.logger.info(`Creating cluster entities from ${clusters.length} clusters...`);
      for (const cluster of clusters) {
        // Filter by project if configured
        if (!this.shouldIncludeResource(cluster, filteredProjects, cfg)) {
          clustersSkipped++;
          continue;
        }
        const entity = this.createClusterEntity(cluster, cfg, annotationPrefix, instanceName, filteredProjects, clusterProfiles);
        if (entity) {
          entities.push(entity);
          clusterEntitiesCreated++;
        }
      }
      this.logger.info(`Created ${clusterEntitiesCreated} cluster entities (${clustersSkipped} skipped by filter)`);
    }

    this.logger.info(`Total entities created for ${instanceName || cfg.url}: ${entities.length} (${projectEntitiesCreated} projects, ${profileEntitiesCreated} profiles, ${clusterEntitiesCreated} clusters)`);

    return entities;
  }

  private filterProjects(projects: SpectroCloudProject[], cfg: SpectroCloudConfig): SpectroCloudProject[] {
    const includeProjects = cfg.catalogProvider?.includeProjects;
    const excludeProjects = cfg.catalogProvider?.excludeProjects;
    const excludeTenantScoped = cfg.catalogProvider?.excludeTenantScopedResources;

    return projects.filter(project => {
      // Check tenant scope
      if (excludeTenantScoped && project.metadata.annotations?.scope === 'tenant') {
        return false;
      }

      // Check include list
      if (includeProjects && includeProjects.length > 0) {
        if (!includeProjects.includes(project.metadata.name)) {
          return false;
        }
      }

      // Check exclude list
      if (excludeProjects && excludeProjects.length > 0) {
        if (excludeProjects.includes(project.metadata.name)) {
          return false;
        }
      }

      return true;
    });
  }

  private shouldIncludeResource(
    resource: SpectroCloudCluster | SpectroCloudClusterProfile,
    filteredProjects: SpectroCloudProject[],
    cfg: SpectroCloudConfig,
  ): boolean {
    const excludeTenantScoped = cfg.catalogProvider?.excludeTenantScopedResources;

    // Check tenant scope
    if (excludeTenantScoped && resource.metadata.annotations?.scope === 'tenant') {
      return false;
    }

    // If project filtering is active, check if resource belongs to an included project
    const includeProjects = cfg.catalogProvider?.includeProjects;
    const excludeProjects = cfg.catalogProvider?.excludeProjects;
    
    if ((includeProjects && includeProjects.length > 0) || (excludeProjects && excludeProjects.length > 0)) {
      const resourceProjectUid = resource.metadata.annotations?.projectUid;
      if (resourceProjectUid) {
        const projectExists = filteredProjects.some(p => p.metadata.uid === resourceProjectUid);
        if (!projectExists) {
          return false;
        }
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
    // Skip projects without critical metadata
    if (!project.metadata?.uid || !project.metadata?.name) {
      this.logger.warn(`Skipping project with missing metadata: ${JSON.stringify(project.metadata)}`);
      return null;
    }

    // For projects, keep simple naming since they're unique
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
    // Skip profiles without critical metadata
    if (!profile.metadata?.uid || !profile.metadata?.name) {
      this.logger.warn(`Skipping cluster profile with missing metadata: ${JSON.stringify(profile.metadata)}`);
      return null;
    }

    // Determine scope and create appropriate entity name
    const scope = profile.metadata.annotations?.scope || 'tenant';
    const profileProjectUid = profile.metadata.annotations?.projectUid;
    let entityName: string;
    
    if (scope === 'project' && profileProjectUid && projects) {
      // Project-scoped: <project-name>-<profile-name>
      const project = projects.find(p => p.metadata.uid === profileProjectUid);
      const projectName = project ? project.metadata.name : profileProjectUid;
      entityName = this.getEntityName(`${projectName}-${profile.metadata.name}`, instanceName);
    } else {
      // Tenant-scoped: tenant-<profile-name>
      entityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
    }

    const ownerNamespace = cfg.catalogProvider?.ownerNamespace || 'group';
    const defaultOwner = cfg.catalogProvider?.defaultOwner || 'spectrocloud-auto-ingested';

    // Get profile details from published version, fallback to draft
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

    // Indicate if this is from published or draft
    if (profile.specSummary?.published) {
      entity.metadata.annotations![`${annotationPrefix}/profile-status`] = 'published';
    } else if (profile.specSummary?.draft) {
      entity.metadata.annotations![`${annotationPrefix}/profile-status`] = 'draft';
    }

    // Store all available versions of this profile
    // Note: In SpectroCloud, each profile version is stored as a separate profile with its own UID
    if (profile.specSummary?.versions && profile.specSummary.versions.length > 0) {
      const versionsData: ClusterProfileVersion[] = profile.specSummary.versions.map(v => ({
        uid: v.uid,
        version: v.version,
      }));
      entity.metadata.annotations![`${annotationPrefix}/profile-versions`] = JSON.stringify(versionsData);
    }

    // Store the latest/current version
    if (profile.specSummary?.version) {
      entity.metadata.annotations![`${annotationPrefix}/latest-version`] = profile.specSummary.version;
    }

    if (instanceName) {
      entity.metadata.annotations![`${annotationPrefix}/instance`] = instanceName;
    }

    // Add relationship to parent project if it exists
    const projectUid = profile.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        const projectEntityName = this.getEntityName(project.metadata.name, instanceName);
        entity.spec.system = `system:default/${projectEntityName}`;
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
    // Skip clusters without critical metadata
    if (!cluster.metadata?.uid || !cluster.metadata?.name) {
      this.logger.warn(`Skipping cluster with missing metadata: ${JSON.stringify(cluster.metadata)}`);
      return null;
    }

    // Determine scope and create appropriate entity name
    const scope = cluster.metadata.annotations?.scope || 'tenant';
    const clusterProjectUid = cluster.metadata.annotations?.projectUid;
    let entityName: string;
    
    if (scope === 'project' && clusterProjectUid && projects) {
      // Project-scoped: <project-name>-<cluster-name>
      const project = projects.find(p => p.metadata.uid === clusterProjectUid);
      const projectName = project ? project.metadata.name : clusterProjectUid;
      entityName = this.getEntityName(`${projectName}-${cluster.metadata.name}`, instanceName);
    } else {
      // Tenant-scoped: tenant-<cluster-name>
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

    // Store cluster profile information as annotations
    // Each profile template includes the version/UID of the specific profile version being used
    if (cluster.spec?.clusterProfileTemplates && cluster.spec.clusterProfileTemplates.length > 0) {
      const profilesData = cluster.spec.clusterProfileTemplates
        .filter(template => template?.uid || template?.name)
        .map(template => ({
          name: template.name || '',
          uid: template.uid || '',
          version: template.version !== undefined ? String(template.version) : '',
          profileVersionUid: template.uid || '',
        }));
      
      if (profilesData.length > 0) {
        entity.metadata.annotations![`${annotationPrefix}/cluster-profiles`] = JSON.stringify(profilesData);
      }
    }

    // Add relationship to parent project if it exists
    const projectUid = cluster.metadata.annotations?.projectUid;
    if (projectUid && entity.spec && projects) {
      const project = projects.find(p => p.metadata.uid === projectUid);
      if (project) {
        const projectEntityName = this.getEntityName(project.metadata.name, instanceName);
        entity.spec.system = `system:default/${projectEntityName}`;
      }
    }

    // Add relationship to cluster profile(s) if they exist
    if (entity.spec && cluster.spec?.clusterProfileTemplates && cluster.spec.clusterProfileTemplates.length > 0 && clusterProfiles) {
      const dependsOn: string[] = [];
      
      for (const template of cluster.spec.clusterProfileTemplates) {
        if (!template?.uid && !template?.name) {
          continue;
        }
        
        // Try to find profile by UID first, then by name
        const profile = clusterProfiles.find(p => 
          (template.uid && p.metadata.uid === template.uid) ||
          (template.name && p.metadata.name === template.name)
        );
        
        if (profile) {
          // Determine the profile's entity name the same way it was created
          const profileProjectUid = profile.metadata.annotations?.projectUid;
          let profileEntityName: string;
          
          if (profileProjectUid && projects) {
            // Project-scoped profile: <project-name>-<profile-name>
            const profileProject = projects.find(p => p.metadata.uid === profileProjectUid);
            if (profileProject) {
              profileEntityName = this.getEntityName(`${profileProject.metadata.name}-${profile.metadata.name}`, instanceName);
            } else {
              // Fallback if project not found
              profileEntityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
            }
          } else {
            // Tenant-scoped profile: tenant-<profile-name>
            profileEntityName = this.getEntityName(`tenant-${profile.metadata.name}`, instanceName);
          }
          
          dependsOn.push(`resource:default/${profileEntityName}`);
        }
      }
      
      if (dependsOn.length > 0) {
        entity.spec.dependsOn = dependsOn;
      }
    }

    return entity;
  }

  private getEntityName(name: string, instanceName?: string): string {
    // Sanitize name to be Backstage-compatible (lowercase, alphanumeric + hyphens)
    const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
    
    if (instanceName) {
      const sanitizedInstance = instanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
      return `${sanitizedInstance}-${sanitized}`;
    }
    
    return sanitized;
  }
}

