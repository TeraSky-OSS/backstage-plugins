import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';
import { RGDDataProvider } from './RGDDataProvider';
import { Logger } from 'winston';
import yaml from 'js-yaml';

export class RGDTemplateEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly logger: Logger;

  constructor(
    private readonly taskRunner: SchedulerServiceTaskRunner,
    logger: LoggerService,
    private readonly config: Config,
    private readonly resourceFetcher: DefaultKubernetesResourceFetcher,
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

  private validateEntityName(entity: Entity): boolean {
    if (entity.metadata.name.length > 63) {
      this.logger.warn(
        `The entity ${entity.metadata.name} of type ${entity.kind} cant be ingested as its auto generated name would be over 63 characters long. please consider chaning the naming conventions via the config of the plugin or shorten the names in the relevant sources of info to allow this resource to be ingested.`
      );
      return false;
    }
    return true;
  }

  private getAnnotationPrefix(): string {
    return this.config.getOptionalString('kubernetesIngestor.annotationPrefix') || 'terasky.backstage.io';
  }

  getProviderName(): string {
    return 'RGDTemplateEntityProvider';
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
      throw new Error('Connection not initialized');
    }
    try {
      const isKROEnabled = this.config.getOptionalBoolean('kubernetesIngestor.kro.enabled') ?? false;
      
      if (!isKROEnabled) {
        await this.connection.applyMutation({
          type: 'full',
          entities: [],
        });
        return;
      }

      const rgdDataProvider = new RGDDataProvider(
        this.resourceFetcher,
        this.config,
        this.logger,
      );

      let allEntities: Entity[] = [];

      if (this.config.getOptionalBoolean('kubernetesIngestor.kro.rgds.enabled')) {
        const rgdData = await rgdDataProvider.fetchRGDObjects();
        const rgdEntities = rgdData.flatMap((rgd: any) => this.translateRGDToTemplate(rgd));
        const APIEntities = rgdData.flatMap((rgd: any) => this.translateRGDToAPI(rgd));
        allEntities = allEntities.concat(rgdEntities, APIEntities);
      }

      await this.connection.applyMutation({
        type: 'full',
        entities: allEntities.map(entity => ({
          entity,
          locationKey: `provider:${this.getProviderName()}`,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to run RGDTemplateEntityProvider: ${error}`);
    }
  }

  private translateRGDToTemplate(rgd: any): Entity[] {
    if (!rgd?.metadata || !rgd?.spec || !rgd.generatedCRD) {
      this.logger.warn(`Skipping RGD ${rgd?.metadata?.name || 'unknown'} due to missing metadata, spec, or CRD`);
      return [];
    }

    const crd = rgd.generatedCRD;
    // Get allowed clusters from config or discover them
    const allowedClusters = this.config.getOptionalStringArray('kubernetesIngestor.allowedClusterNames');
    const clusters = allowedClusters || rgd.clusterDetails?.map((c: any) => c.name) || [];
    const parameters = this.extractParameters(crd, clusters, rgd);
    const steps = this.extractSteps(crd, rgd);
    const clusterTags = clusters.map((cluster: any) => `cluster:${cluster}`);
    const tags = ['kro', ...clusterTags];
    const prefix = this.getAnnotationPrefix();

    const templates = [{
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: `${rgd.metadata.name}-${crd.spec.versions[0].name}`,
        title: `${crd.spec.names.kind}`,
        description: `A template to create a ${rgd.metadata.name} instance`,
        tags: tags,
        labels: {
          forEntity: "system",
          source: "kro",
        },
        annotations: {
          'backstage.io/managed-by-location': `cluster origin: ${rgd.clusterName}`,
          'backstage.io/managed-by-origin-location': `cluster origin: ${rgd.clusterName}`,
          [`${prefix}/kro-rgd`]: 'true',
        },
      },
      spec: {
        type: rgd.metadata.name,
        parameters,
        steps,
        output: {
          links: [
            {
              title: 'Download YAML Manifest',
              url: 'data:application/yaml;charset=utf-8,${{ steps.generateManifest.output.manifest }}'
            },
            {
              title: 'Open Pull Request',
              if: '${{ parameters.pushToGit }}',
              url: this.getPullRequestUrl()
            }
          ]
        },
      },
    }];

    // Filter out invalid templates
    return templates.filter(template => this.validateEntityName(template));
  }

  private translateRGDToAPI(rgd: any): Entity[] {
    if (!rgd?.metadata || !rgd?.spec || !rgd.generatedCRD) {
      this.logger.warn(`Skipping RGD API generation for ${rgd?.metadata?.name || 'unknown'} due to missing metadata, spec, or CRD`);
      return [];
    }

    const crd = rgd.generatedCRD;
    const apis = crd.spec.versions.map((version: any = {}) => {
      let rgdOpenAPIDoc: any = {};
      rgdOpenAPIDoc.openapi = "3.0.0";
      rgdOpenAPIDoc.info = {
        title: `${crd.spec.names.plural}.${crd.spec.group}`,
        version: version.name,
      };
      rgdOpenAPIDoc.servers = rgd.clusterDetails.map((cluster: any) => ({
        url: cluster.url,
        description: cluster.name,
      }));
      rgdOpenAPIDoc.tags = [
        {
          name: "Cluster Scoped Operations",
          description: "Operations on the cluster level"
        },
        {
          name: "Namespace Scoped Operations",
          description: "Operations on the namespace level"
        },
        {
          name: "Specific Object Scoped Operations",
          description: "Operations on a specific resource"
        }
      ];

      rgdOpenAPIDoc.paths = {
        [`/apis/${crd.spec.group}/${version.name}/${crd.spec.names.plural}`]: {
          get: {
            tags: ["Cluster Scoped Operations"],
            summary: `List all ${crd.spec.names.plural} in all namespaces`,
            operationId: `list${crd.spec.names.plural}AllNamespaces`,
            responses: {
              "200": {
                description: `List of ${crd.spec.names.plural} in all namespaces`,
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        $ref: `#/components/schemas/Resource`
                      }
                    }
                  }
                }
              }
            }
          }
        },
        [`/apis/${crd.spec.group}/${version.name}/namespaces/{namespace}/${crd.spec.names.plural}`]: {
          get: {
            tags: ["Namespace Scoped Operations"],
            summary: `List all ${crd.spec.names.plural} in a namespace`,
            operationId: `list${crd.spec.names.plural}`,
            parameters: [
              {
                name: "namespace",
                in: "path",
                required: true,
                schema: {
                  type: "string"
                }
              }
            ],
            responses: {
              "200": {
                description: `List of ${crd.spec.names.plural}`,
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        $ref: `#/components/schemas/Resource`
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            tags: ["Namespace Scoped Operations"],
            summary: "Create a resource",
            operationId: "createResource",
            parameters: [
              { name: "namespace", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    $ref: `#/components/schemas/Resource`
                  }
                },
              },
            },
            responses: {
              "201": { description: "Resource created" },
            },
          },
        },
        [`/apis/${crd.spec.group}/${version.name}/namespaces/{namespace}/${crd.spec.names.plural}/{name}`]: {
          get: {
            tags: ["Specific Object Scoped Operations"],
            summary: `Get a ${crd.spec.names.kind}`,
            operationId: `get${crd.spec.names.kind}`,
            parameters: [
              { name: "namespace", in: "path", required: true, schema: { type: "string" } },
              { name: "name", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              "200": {
                description: "Resource details",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      $ref: `#/components/schemas/Resource`
                    },
                  },
                },
              },
            },
          },
          put: {
            tags: ["Specific Object Scoped Operations"],
            summary: "Update a resource",
            operationId: "updateResource",
            parameters: [
              { name: "namespace", in: "path", required: true, schema: { type: "string" } },
              { name: "name", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    $ref: `#/components/schemas/Resource`
                  },
                },
              },
            },
            responses: {
              "200": { description: "Resource updated" },
            },
          },
          delete: {
            tags: ["Specific Object Scoped Operations"],
            summary: "Delete a resource",
            operationId: "deleteResource",
            parameters: [
              { name: "namespace", in: "path", required: true, schema: { type: "string" } },
              { name: "name", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              "200": { description: "Resource deleted" },
            },
          },
        },
      };

      rgdOpenAPIDoc.components = {
        schemas: {
          Resource: {
            type: "object",
            properties: version.schema.openAPIV3Schema.properties
          }
        },
        securitySchemes: {
          bearerHttpAuthentication: {
            description: "Bearer token using a JWT",
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      };

      rgdOpenAPIDoc.security = [
        {
          bearerHttpAuthentication: []
        }
      ];

      return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'API',
        metadata: {
          name: `${crd.spec.names.kind.toLowerCase()}-${crd.spec.group}--${version.name}`,
          title: `${crd.spec.names.kind.toLowerCase()}-${crd.spec.group}--${version.name}`,
          annotations: {
            'backstage.io/managed-by-location': `cluster origin: ${rgd.clusterName}`,
            'backstage.io/managed-by-origin-location': `cluster origin: ${rgd.clusterName}`,
          },
          tags: ['kro'],
        },
        spec: {
          type: "openapi",
          lifecycle: "production",
          owner: "kubernetes-auto-ingested",
          system: "kubernets-auto-ingested",
          definition: yaml.dump(rgdOpenAPIDoc),
        },
      };
    });

    // Filter out invalid APIs
    return apis.filter((api: Entity) => this.validateEntityName(api));
  }

  private extractParameters(crd: any, clusters: string[], _rgd: any): any[] {
    const mainParameterGroup = {
      title: 'Resource Metadata',
      required: ['kroInstanceName', 'kroInstanceNamespace'],
      properties: {
        kroInstanceName: {
          title: 'Name',
          description: 'The name of the resource',
          pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
          maxLength: 63,
          type: 'string',
        },
        kroInstanceNamespace: {
          title: 'Namespace',
          description: 'The namespace in which to create the resource',
          pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
          maxLength: 63,
          type: 'string',
        },
        owner: {
          title: 'Owner',
          description: 'The owner of the resource',
          type: 'string',
          'ui:field': 'OwnerPicker',
          'ui:options': {
            'catalogFilter': {
              'kind': 'Group',
            },
          },
        }
      },
      type: 'object',
    };

    const convertDefaultValuesToPlaceholders = this.config.getOptionalBoolean('kubernetesIngestor.kro.rgds.convertDefaultValuesToPlaceholders');

    const processProperties = (properties: Record<string, any>): Record<string, any> => {
      const processedProperties: Record<string, any> = {};
      for (const [key, value] of Object.entries(properties)) {
        const typedValue = value as Record<string, any>;
        
        // Handle fields with x-kubernetes-preserve-unknown-fields: true
        if (typedValue['x-kubernetes-preserve-unknown-fields'] === true && !typedValue.type) {
          processedProperties[key] = {
            ...typedValue,
            type: 'string',
            'ui:widget': 'textarea',
            'ui:options': {
              rows: 10,
            },
          };
        } else if (typedValue.type === 'object' && typedValue.properties) {
          const subProperties = processProperties(typedValue.properties);
          processedProperties[key] = { ...typedValue, properties: subProperties };
          if (typedValue.properties.enabled && typedValue.properties.enabled.type === 'boolean') {
            const siblingKeys = Object.keys(typedValue.properties).filter(k => k !== 'enabled');
            processedProperties[key].dependencies = {
              enabled: {
                if: {
                  properties: {
                    enabled: { const: true },
                  },
                },
                then: {
                  properties: siblingKeys.reduce((acc, k) => ({ ...acc, [k]: typedValue.properties[k] }), {}),
                },
              },
            };
            siblingKeys.forEach(k => delete processedProperties[key].properties[k]);
          }
        } else {
          if (convertDefaultValuesToPlaceholders && typedValue.default !== undefined && typedValue.type !== 'boolean') {
            processedProperties[key] = { ...typedValue, 'ui:placeholder': typedValue.default };
            delete processedProperties[key].default;
          } else {
            processedProperties[key] = typedValue;
          }
        }
      }
      return processedProperties;
    };

    const processedSpec = crd.spec.versions[0]?.schema?.openAPIV3Schema?.properties?.spec
      ? processProperties(crd.spec.versions[0].schema.openAPIV3Schema.properties.spec.properties)
      : {};

    const specParameters = {
      title: 'Resource Spec',
      properties: processedSpec,
      type: 'object',
    };

    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.kro.rgds.publishPhase.target')?.toLowerCase();
    const allowedTargets = this.config.getOptionalStringArray('kubernetesIngestor.kro.rgds.publishPhase.allowedTargets');

    let allowedHosts: string[] = [];
    if (allowedTargets) {
      allowedHosts = allowedTargets;
    } else {
      switch (publishPhaseTarget) {
        case 'github':
          allowedHosts = ['github.com'];
          break;
        case 'gitlab':
          allowedHosts = ['gitlab.com'];
          break;
        case 'bitbucket':
          allowedHosts = ['only-bitbucket-server-is-allowed'];
          break;
        case 'bitbucketcloud':
          allowedHosts = ['bitbucket.org'];
          break;
        default:
          allowedHosts = [];
      }
    }

    const publishParameters = this.config.getOptionalBoolean('kubernetesIngestor.kro.rgds.publishPhase.allowRepoSelection')
      ? {
        title: 'Creation Settings',
        properties: {
          pushToGit: {
            title: 'Push Manifest to GitOps Repository',
            type: 'boolean',
            default: true,
          },
        },
        dependencies: {
          pushToGit: {
            oneOf: [
              {
                properties: {
                  pushToGit: { enum: [false] },
                },
              },
              {
                properties: {
                  pushToGit: { enum: [true] },
                  repoUrl: {
                    content: { type: 'string' },
                    description: 'Name of repository',
                    'ui:field': 'RepoUrlPicker',
                    'ui:options': {
                      allowedHosts: allowedHosts,
                    },
                  },
                  targetBranch: {
                    type: 'string',
                    description: 'Target Branch for the PR',
                    default: 'main',
                  },
                  manifestLayout: {
                    type: 'string',
                    description: 'Layout of the manifest',
                    default: 'cluster-scoped',
                    'ui:help':
                      'Choose how the manifest should be generated in the repo.\n* Cluster-scoped - a manifest is created for each selected cluster under the root directory of the clusters name\n* namespace-scoped - a manifest is created for the resource under the root directory with the namespace name\n* custom - a manifest is created under the specified base path',
                    enum: ['cluster-scoped', 'namespace-scoped', 'custom'],
                  },
                },
                dependencies: {
                  manifestLayout: {
                    oneOf: [
                      {
                        properties: {
                          manifestLayout: { enum: ['cluster-scoped'] },
                          clusters: {
                            title: 'Target Clusters',
                            description: 'The target clusters to apply the resource to',
                            type: 'array',
                            minItems: 1,
                            items: {
                              enum: clusters,
                              type: 'string',
                            },
                            uniqueItems: true,
                            'ui:widget': 'checkboxes',
                          },
                        },
                        required: ['clusters'],
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ['custom'] },
                          basePath: {
                            type: 'string',
                            description: 'Base path in GitOps repository to push the manifest to',
                          },
                        },
                        required: ['basePath'],
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ['namespace-scoped'] },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      }
      : {
        title: 'Creation Settings',
        properties: {
          pushToGit: {
            title: 'Push Manifest to GitOps Repository',
            type: 'boolean',
            default: true,
          },
        },
        dependencies: {
          pushToGit: {
            oneOf: [
              {
                properties: {
                  pushToGit: { enum: [false] },
                },
              },
              {
                properties: {
                  pushToGit: { enum: [true] },
                  manifestLayout: {
                    type: 'string',
                    description: 'Layout of the manifest',
                    default: 'cluster-scoped',
                    'ui:help':
                      'Choose how the manifest should be generated in the repo.\n* Cluster-scoped - a manifest is created for each selected cluster under the root directory of the clusters name\n* namespace-scoped - a manifest is created for the resource under the root directory with the namespace name\n* custom - a manifest is created under the specified base path',
                    enum: ['cluster-scoped', 'namespace-scoped', 'custom'],
                  },
                },
                dependencies: {
                  manifestLayout: {
                    oneOf: [
                      {
                        properties: {
                          manifestLayout: { enum: ['cluster-scoped'] },
                          clusters: {
                            title: 'Target Clusters',
                            description: 'The target clusters to apply the resource to',
                            type: 'array',
                            minItems: 1,
                            items: {
                              enum: clusters,
                              type: 'string',
                            },
                            uniqueItems: true,
                            'ui:widget': 'checkboxes',
                          },
                        },
                        required: ['clusters'],
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ['custom'] },
                          basePath: {
                            type: 'string',
                            description: 'Base path in GitOps repository to push the manifest to',
                          },
                        },
                        required: ['basePath'],
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ['namespace-scoped'] },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

    return [mainParameterGroup, specParameters, publishParameters];
  }

  private extractSteps(crd: any, _rgd: any): any[] {
    let baseStepsYaml =
      '- id: generateManifest\n' +
      '  name: Generate Kubernetes Resource Manifest\n' +
      '  action: terasky:crd-template\n' +
      '  input:\n' +
      '    parameters: ${{ parameters }}\n' +
      '    nameParam: kroInstanceName\n' +
      '    namespaceParam: kroInstanceNamespace\n' +
      '    excludeParams: [\'pushToGit\',\'basePath\',\'manifestLayout\',\'_editData\', \'targetBranch\', \'repoUrl\', \'clusters\', \'kroInstanceName\', \'kroInstanceNamespace\', \'owner\']\n' +
      `    apiVersion: ${crd.spec.group}/${crd.spec.versions[0].name}\n` +
      `    kind: ${crd.spec.names.kind}\n` +
      '    clusters: ${{ parameters.clusters if parameters.manifestLayout === \'cluster-scoped\' and parameters.pushToGit else [\'temp\'] }}\n' +
      '    removeEmptyParams: true\n' +
      '- id: moveNamespacedManifest\n' +
      '  name: Move and Rename Manifest\n' +
      '  if: ${{ parameters.manifestLayout === \'namespace-scoped\' }}\n' +
      '  action: fs:rename\n' +
      '  input:\n' +
      '    files:\n' +
      '      - from: ${{ steps.generateManifest.output.filePaths[0] }}\n' +
      '        to: "./${{ parameters.namespace }}/${{ steps.generateManifest.input.kind }}/${{ steps.generateManifest.output.filePaths[0].split(\'/\').pop() }}"\n' +
      '- id: moveCustomManifest\n' +
      '  name: Move and Rename Manifest\n' +
      '  if: ${{ parameters.manifestLayout === \'custom\' }}\n' +
      '  action: fs:rename\n' +
      '  input:\n' +
      '    files:\n' +
      '      - from: ${{ steps.generateManifest.output.filePaths[0] }}\n' +
      '        to: "./${{ parameters.basePath }}/${{ parameters.name }}.yaml"\n';

    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.kro.rgds.publishPhase.target')?.toLowerCase();
    let action = '';
    switch (publishPhaseTarget) {
      case 'gitlab':
        action = 'publish:gitlab:merge-request';
        break;
      case 'bitbucket':
        action = 'publish:bitbucketServer:pull-request';
        break;
      case 'bitbucketcloud':
        action = 'publish:bitbucketCloud:pull-request';
        break;
      case 'github':
      default:
        action = 'publish:github:pull-request';
        break;
    }

    let defaultStepsYaml = baseStepsYaml;

    if (publishPhaseTarget !== 'yaml') {
      if (this.config.getOptionalBoolean('kubernetesIngestor.kro.rgds.publishPhase.allowRepoSelection')) {
        defaultStepsYaml +=
          '- id: create-pull-request\n' +
          '  name: create-pull-request\n' +
          `  action: ${action}\n` +
          '  if: ${{ parameters.pushToGit }}\n' +
          '  input:\n' +
          '    repoUrl: ${{ parameters.repoUrl }}\n' +
          '    branchName: create-${{ parameters.name }}-resource\n' +
          `    title: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          `    description: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          '    targetBranchName: ${{ parameters.targetBranch }}\n';
      } else {
        defaultStepsYaml +=
          '- id: create-pull-request\n' +
          '  name: create-pull-request\n' +
          `  action: ${action}\n` +
          '  if: ${{ parameters.pushToGit }}\n' +
          '  input:\n' +
          `    repoUrl: ${this.config.getOptionalString('kubernetesIngestor.kro.rgds.publishPhase.git.repoUrl')}\n` +
          '    branchName: create-${{ parameters.name }}-resource\n' +
          `    title: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          `    description: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          `    targetBranchName: ${this.config.getOptionalString('kubernetesIngestor.kro.rgds.publishPhase.git.targetBranch')}\n`;
      }
    }

    return yaml.load(defaultStepsYaml) as any[];
  }

  private getPullRequestUrl(): string {
    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.kro.rgds.publishPhase.target')?.toLowerCase();
    
    switch (publishPhaseTarget) {
      case 'gitlab':
        return '${{ steps["create-pull-request"].output.mergeRequestUrl }}';
      case 'bitbucket':
      case 'bitbucketcloud':
        return '${{ steps["create-pull-request"].output.pullRequestUrl }}';
      case 'github':
      default:
        return '${{ steps["create-pull-request"].output.remoteUrl }}';
    }
  }
}
