import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { DefaultKubernetesResourceFetcher } from '../services';
import { KubernetesDataProvider } from './KubernetesDataProvider';
import { Logger } from 'winston';
import { CRDDataProvider } from './CRDDataProvider';
import { XRDDataProvider } from './XRDDataProvider';
import { RGDDataProvider } from './RGDDataProvider';
import yaml from 'js-yaml';
import pluralize from 'pluralize';

interface BackstageLink {
  url: string;
  title: string;
  icon: string;
  [key: string]: string;
}

/**
 * Resolves owner reference from annotation value.
 * If the annotation contains a full entity ref (with kind like "group:" or "user:"),
 * it returns it as-is. Otherwise, it prefixes with the namespace.
 */
export function resolveOwnerRef(
  ownerAnnotation: string | undefined,
  namespacePrefix: string,
  defaultOwner: string,
): string {
  if (!ownerAnnotation) {
    return `${namespacePrefix}/${defaultOwner}`;
  }
  // If owner annotation contains a colon, it's a full entity ref (e.g., "group:default/team")
  if (ownerAnnotation.includes(':')) {
    return ownerAnnotation;
  }
  // Otherwise, prefix with namespace
  return `${namespacePrefix}/${ownerAnnotation}`;
}

export class XRDTemplateEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

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

  private readonly logger: Logger;

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

  private getDefaultOwner(): string {
    return this.config.getOptionalString('kubernetesIngestor.defaultOwner') || 'kubernetes-auto-ingested';
  }

  getProviderName(): string {
    return 'XRDTemplateEntityProvider';
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
      const isCrossplaneEnabled = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.enabled') ?? true;
      
      if (!isCrossplaneEnabled) {
        await this.connection.applyMutation({
          type: 'full',
          entities: [],
        });
        return;
      }

      const templateDataProvider = new XRDDataProvider(
        this.resourceFetcher,
        this.config,
        this.logger,
      );

      const crdDataProvider = new CRDDataProvider(
        this.resourceFetcher,
        this.config,
        this.logger,
      );

      let allEntities: Entity[] = [];

      // Fetch all CRDs once
      const crdData = await crdDataProvider.fetchCRDObjects();

      if (this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.enabled')) {
        const xrdData = await templateDataProvider.fetchXRDObjects();
        const xrdIngestOnlyAsAPI = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.ingestOnlyAsAPI') ?? false;
        
        // Only generate templates if not ingestOnlyAsAPI
        if (!xrdIngestOnlyAsAPI) {
          const xrdEntities = xrdData.flatMap((xrd: any) => this.translateXRDVersionsToTemplates(xrd));
          allEntities = allEntities.concat(xrdEntities);
        }
        
        // Always generate API entities
        const APIEntities = xrdData.flatMap((xrd: any) => this.translateXRDVersionsToAPI(xrd));
        allEntities = allEntities.concat(APIEntities);
      }

      // Add CRD template generation
      const crdIngestOnlyAsAPI = this.config.getOptionalBoolean('kubernetesIngestor.genericCRDTemplates.ingestOnlyAsAPI') ?? false;
      
      // Only generate templates if not ingestOnlyAsAPI
      if (!crdIngestOnlyAsAPI) {
        const crdEntities = crdData.flatMap(crd => this.translateCRDToTemplate(crd));
        allEntities = allEntities.concat(crdEntities);
      }
      
      // Always generate API entities
      const CRDAPIEntities = crdData.flatMap(crd => this.translateCRDVersionsToAPI(crd));
      allEntities = allEntities.concat(CRDAPIEntities);

      await this.connection.applyMutation({
        type: 'full',
        entities: allEntities.map(entity => ({
          entity,
          locationKey: `provider:${this.getProviderName()}`,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to run TemplateEntityProvider: ${error}`);
    }
  }

  private translateXRDVersionsToTemplates(xrd: any): Entity[] {
    if (!xrd?.metadata || !xrd?.spec) {
      this.logger.warn(`Skipping XRD ${xrd?.metadata?.name || 'unknown'} due to missing metadata or spec`);
      return [];
    }
    
    if (!Array.isArray(xrd.spec.versions) || xrd.spec.versions.length === 0) {
      this.logger.warn(`Skipping XRD ${xrd.metadata.name} due to missing or empty versions array`);
      return [];
    }
    // --- BEGIN VERSION/SCOPE LOGIC REFACTOR ---
    // Use presence of xrd.spec.scope to determine v2, otherwise v1
    const isV2 = !!xrd.spec?.scope;
    const crossplaneVersion = isV2 ? 'v2' : 'v1';
    const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
    const isLegacyCluster = isV2 && scope === 'LegacyCluster';
    const isCluster = scope === 'Cluster';
    const isNamespaced = scope === 'Namespaced';
    // --- END VERSION/SCOPE LOGIC REFACTOR ---
    const clusters = xrd.clusters || ["kubetopus"];
    const templates = xrd.spec.versions.map((version: { name: any }) => {
      // For v2 Cluster/Namespaced, do not generate claim-based templates
      if (isV2 && !isLegacyCluster && (isCluster || isNamespaced)) {
        // No claimNames, use spec.name as resource type
        const parameters = this.extractParameters(version, clusters, xrd);
        const prefix = this.getAnnotationPrefix();
        const steps = this.extractSteps(version, xrd);
        const clusterTags = clusters.map((cluster: any) => `cluster:${cluster}`);
        const tags = ['crossplane', ...clusterTags];
        const crossplaneAnnotations = {
          [`${prefix}/crossplane-version`]: crossplaneVersion,
          [`${prefix}/crossplane-scope`]: scope,
        };
        return {
          apiVersion: 'scaffolder.backstage.io/v1beta3',
          kind: 'Template',
          metadata: {
            name: `${xrd.metadata.name}-${version.name}`,
            title: `${xrd.spec.claimNames?.kind || xrd.spec.names?.kind}`,
            description: `A template to create a ${xrd.metadata.name} instance`,
            labels: {
              forEntity: "system",
              source: "crossplane",
            },
            tags: tags,
            annotations: {
              'backstage.io/managed-by-location': `cluster origin: ${xrd.clusterName}`,
              'backstage.io/managed-by-origin-location': `cluster origin: ${xrd.clusterName}`,
              ...crossplaneAnnotations,
            },
          },
          spec: {
            type: xrd.metadata.name,
            parameters,
            steps,
            output: {
              links: [
                {
                  title: 'Download YAML Manifest',
                  url: 'data:application/yaml;base64,${{ steps.generateManifest.output.manifestEncoded }}'
                },
                {
                  title: 'Open Pull Request',
                  if: '${{ parameters.pushToGit }}',
                  url: this.getPullRequestUrl()
                }
              ]
            },
          },
        };
      }
      // v1 or v2 LegacyCluster or claim-based
      const parameters = this.extractParameters(version, clusters, xrd);
      const prefix = this.getAnnotationPrefix();
      const steps = this.extractSteps(version, xrd);
      const clusterTags = clusters.map((cluster: any) => `cluster:${cluster}`);
      const tags = ['crossplane', ...clusterTags];
      const crossplaneAnnotations = {
        [`${prefix}/crossplane-version`]: crossplaneVersion,
        [`${prefix}/crossplane-scope`]: scope,
      };
      return {
        apiVersion: 'scaffolder.backstage.io/v1beta3',
        kind: 'Template',
        metadata: {
          name: `${xrd.metadata.name}-${version.name}`,
          title: `${xrd.spec.claimNames?.kind || xrd.spec.names?.kind}`,
          description: `A template to create a ${xrd.metadata.name} instance`,
          labels: {
            forEntity: "system",
            source: "crossplane",
          },
          tags: tags,
          annotations: {
            'backstage.io/managed-by-location': `cluster origin: ${xrd.clusterName}`,
            'backstage.io/managed-by-origin-location': `cluster origin: ${xrd.clusterName}`,
            [`${prefix}/crossplane-claim`]: 'true',
            ...crossplaneAnnotations,
          },
        },
        spec: {
          type: xrd.metadata.name,
          parameters,
          steps,
          output: {
            links: [
              {
                title: 'Download YAML Manifest',
                url: 'data:application/yaml;base64,${{ steps.generateManifest.output.manifestEncoded }}'
              },
              {
                title: 'Open Pull Request',
                if: '${{ parameters.pushToGit }}',
                url: this.getPullRequestUrl()
              }
            ]
          },
        },
      };
    });
    // Filter out invalid templates
    return templates.filter((template: Entity) => this.validateEntityName(template));
  }

  private translateXRDVersionsToAPI(xrd: any): Entity[] {
    if (!xrd?.metadata || !xrd?.spec) {
      this.logger.warn(`Skipping XRD API generation for ${xrd?.metadata?.name || 'unknown'} due to missing metadata or spec`);
      return [];
    }
    
    if (!Array.isArray(xrd.spec.versions) || xrd.spec.versions.length === 0) {
      this.logger.warn(`Skipping XRD API generation for ${xrd.metadata.name} due to missing or empty versions array`);
      return [];
    }

    // --- BEGIN VERSION/SCOPE LOGIC REFACTOR ---
    // Use presence of xrd.spec.scope to determine v2, otherwise v1
    const isV2 = !!xrd.spec?.scope;
    const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
    const isLegacyCluster = isV2 && scope === 'LegacyCluster';
    // --- END VERSION/SCOPE LOGIC REFACTOR ---
    // Prefer spec.names.plural/kind if available, fallback to metadata.name
    const resourcePlural = (!isV2 || isLegacyCluster)
      ? xrd.spec.claimNames?.plural
      : (xrd.spec.names?.plural || xrd.metadata.name);
    const resourceKind = (!isV2 || isLegacyCluster)
      ? xrd.spec.claimNames?.kind
      : (xrd.spec.names?.kind || xrd.metadata.name);

    const apis = xrd.spec.versions.map((version: any = {}) => {
      // Use the generated CRD's schema if present, otherwise fallback to XRD schema
      let crdSchemaProps = undefined;
      if (xrd.generatedCRD) {
        const crdVersion = xrd.generatedCRD.spec.versions.find((v: any) => v.name === version.name) ||
                           xrd.generatedCRD.spec.versions.find((v: any) => v.storage) ||
                           xrd.generatedCRD.spec.versions[0];
        crdSchemaProps = crdVersion?.schema?.openAPIV3Schema?.properties;
      }
      const schemaProps = crdSchemaProps || version.schema.openAPIV3Schema.properties;

      let xrdOpenAPIDoc: any = {};
      xrdOpenAPIDoc.openapi = "3.0.0";
      xrdOpenAPIDoc.info = {
        title: `${resourcePlural}.${xrd.spec.group}`,
        version: version.name,
      };
      xrdOpenAPIDoc.servers = xrd.clusterDetails.map((cluster: any) => ({
        url: cluster.url,
        description: cluster.name,
      }));
      xrdOpenAPIDoc.tags = [
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
      // TODO(vrabbi) Add Paths To API for XRD
      xrdOpenAPIDoc.paths = {
        [`/apis/${xrd.spec.group}/${version.name}/${resourcePlural}`]: {
          get: {
            tags: ["Cluster Scoped Operations"],
            summary: `List all ${resourcePlural} in all namespaces`,
            operationId: `list${resourcePlural}AllNamespaces`,
            responses: {
              "200": {
                description: `List of ${resourcePlural} in all namespaces`,
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
        [`/apis/${xrd.spec.group}/${version.name}/namespaces/{namespace}/${resourcePlural}`]: {
          get: {
            tags: ["Namespace Scoped Operations"],
            summary: `List all ${resourcePlural} in a namespace`,
            operationId: `list${resourcePlural}`,
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
                description: `List of ${resourcePlural}`,
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
        [`/apis/${xrd.spec.group}/${version.name}/namespaces/{namespace}/${resourcePlural}/{name}`]: {
          get: {
            tags: ["Specific Object Scoped Operations"],
            summary: `Get a ${resourceKind}`,
            operationId: `get${resourceKind}`,
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
      xrdOpenAPIDoc.components = {
        schemas: {
          Resource: {
            type: "object",
            properties: schemaProps
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
      xrdOpenAPIDoc.security = [
        {
          bearerHttpAuthentication: []
        }
      ];
      return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'API',
        metadata: {
          name: `${resourceKind?.toLowerCase()}-${xrd.spec.group}--${version.name}`,
          title: `${resourceKind?.toLowerCase()}-${xrd.spec.group}--${version.name}`,
          tags: ['crossplane'],
          annotations: {
            'backstage.io/managed-by-location': `cluster origin: ${xrd.clusterName}`,
            'backstage.io/managed-by-origin-location': `cluster origin: ${xrd.clusterName}`,
          },
        },
        spec: {
          type: "openapi",
          lifecycle: "production",
          owner: this.getDefaultOwner(),
          system: "kubernetes-auto-ingested",
          definition: yaml.dump(xrdOpenAPIDoc),
        },
      };
    });

    // Filter out invalid APIs
    return apis.filter((api: Entity) => this.validateEntityName(api));
  }

  private extractParameters(version: any, clusters: string[], xrd: any): any[] {
    // --- BEGIN VERSION/SCOPE LOGIC REFACTOR ---
    // Use presence of xrd.spec.scope to determine v2, otherwise v1
    const isV2 = !!xrd.spec?.scope;
    const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'Cluster');
    const isLegacyCluster = isV2 && scope === 'LegacyCluster';
    const isCluster = scope === 'Cluster';
    const isNamespaced = scope === 'Namespaced';
    // --- END VERSION/SCOPE LOGIC REFACTOR ---
    // Main parameter group
    let mainParameterGroup: any = {
      title: 'Resource Metadata',
      required: ['xrName', 'owner'],
      properties: {
        xrName: {
          title: 'Name',
          description: 'The name of the resource',
          pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
          maxLength: 63,
          type: 'string',
        }
      },
      type: 'object',
    };
    if ((isV2 && isNamespaced) || (!isV2) || isLegacyCluster) {
      mainParameterGroup.required.push('xrNamespace');
      mainParameterGroup.properties.xrNamespace = {
        title: 'Namespace',
        description: 'The namespace in which to create the resource',
        pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
        maxLength: 63,
        type: 'string',
      };
    }
    mainParameterGroup.properties.owner = {
      title: 'Owner',
      description: 'The owner of the resource',
      type: 'string',
      'ui:field': 'OwnerPicker',
      'ui:options': {
        'catalogFilter': {
          'kind': 'Group',
        },
      },
    };
    // Additional parameters
    const convertDefaultValuesToPlaceholders = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.convertDefaultValuesToPlaceholders');
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
    const processedSpec = version.schema?.openAPIV3Schema?.properties?.spec
      ? processProperties(version.schema.openAPIV3Schema.properties.spec.properties)
      : {};
    const additionalParameters = {
      title: 'Resource Spec',
      properties: processedSpec,
      type: 'object',
    };
    // Crossplane settings
    let crossplaneParameters: any = null;
    if ((isV2 && (isCluster || isNamespaced)) && !isLegacyCluster) {
      // v2 Cluster/Namespaced: move crossplane settings under spec.crossplane, remove writeConnectionSecretToRef
      crossplaneParameters = {
        title: 'Crossplane Settings',
        properties: {
          crossplane: {
            title: 'Crossplane Configuration',
            type: 'object',
            properties: {
              compositionUpdatePolicy: {
                title: 'Composition Update Policy',
                enum: ['Automatic', 'Manual'],
                type: 'string',
              },
              compositionSelectionStrategy: {
                title: 'Composition Selection Strategy',
                description: 'How the composition should be selected.',
                enum: [
                  'runtime',
                  ...(xrd.compositions && xrd.compositions.length > 0 ? ['direct-reference'] : []),
                  'label-selector',
                ],
                default: 'runtime',
                type: 'string',
              },
            },
            dependencies: {
              compositionSelectionStrategy: {
                oneOf: [
                  {
                    properties: {
                      compositionSelectionStrategy: { enum: ['runtime'] },
                    },
                  },
                  ...(xrd.compositions && xrd.compositions.length > 0
                    ? [
                        {
                          properties: {
                            compositionSelectionStrategy: { enum: ['direct-reference'] },
                            compositionRef: {
                              title: 'Composition Reference',
                              properties: {
                                name: {
                                  type: 'string',
                                  title: 'Select A Composition By Name',
                                  enum: xrd.compositions,
                                  ...(xrd.spec?.defaultCompositionRef?.name && {
                                    default: xrd.spec.defaultCompositionRef.name,
                                  }),
                                },
                              },
                              required: ['name'],
                              type: 'object',
                            },
                          },
                        },
                      ]
                    : []),
                  {
                    properties: {
                      compositionSelectionStrategy: { enum: ['label-selector'] },
                      compositionSelector: {
                        title: 'Composition Selector',
                        properties: {
                          matchLabels: {
                            title: 'Match Labels',
                            additionalProperties: { type: 'string' },
                            type: 'object',
                          },
                        },
                        required: ['matchLabels'],
                        type: 'object',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        type: 'object',
      };
    } else {
      // v1 or v2 LegacyCluster: keep current structure
      crossplaneParameters = {
        title: 'Crossplane Settings',
        properties: {
          writeConnectionSecretToRef: {
            title: 'Crossplane Configuration Details',
            properties: {
              name: {
                title: 'Connection Secret Name',
                type: 'string',
              },
            },
            type: 'object',
          },
          compositeDeletePolicy: {
            title: 'Composite Delete Policy',
            default: 'Background',
            enum: ['Background', 'Foreground'],
            type: 'string',
          },
          compositionUpdatePolicy: {
            title: 'Composition Update Policy',
            enum: ['Automatic', 'Manual'],
            type: 'string',
          },
          compositionSelectionStrategy: {
            title: 'Composition Selection Strategy',
            description: 'How the composition should be selected.',
            enum: [
              'runtime',
              ...(xrd.compositions && xrd.compositions.length > 0 ? ['direct-reference'] : []),
              'label-selector',
            ],
            default: 'runtime',
            type: 'string',
          },
        },
        dependencies: {
          compositionSelectionStrategy: {
            oneOf: [
              {
                properties: {
                  compositionSelectionStrategy: { enum: ['runtime'] },
                },
              },
              ...(xrd.compositions && xrd.compositions.length > 0
                ? [
                    {
                      properties: {
                        compositionSelectionStrategy: { enum: ['direct-reference'] },
                        compositionRef: {
                          title: 'Composition Reference',
                          properties: {
                            name: {
                              type: 'string',
                              title: 'Select A Composition By Name',
                              enum: xrd.compositions,
                              ...(xrd.spec?.defaultCompositionRef?.name && {
                                default: xrd.spec.defaultCompositionRef.name,
                              }),
                            },
                          },
                          required: ['name'],
                          type: 'object',
                        },
                      },
                    },
                  ]
                : []),
              {
                properties: {
                  compositionSelectionStrategy: { enum: ['label-selector'] },
                  compositionSelector: {
                    title: 'Composition Selector',
                    properties: {
                      matchLabels: {
                        title: 'Match Labels',
                        additionalProperties: { type: 'string' },
                        type: 'object',
                      },
                    },
                    required: ['matchLabels'],
                    type: 'object',
                  },
                },
              },
            ],
          },
        },
        type: 'object',
      };
    }
    // Publish parameters (unchanged)
    let allowedHosts: string[] = [];
    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.target')?.toLowerCase();
    const allowedTargets = this.config.getOptionalStringArray('kubernetesIngestor.crossplane.xrds.publishPhase.allowedTargets');
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
    const requestUserCredentials = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.publishPhase.requestUserCredentialsForRepoUrl') ?? false;
    const defaultRepoUrl = this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.repoUrl');
    const repoUrlUiOptions: any = {
      allowedHosts: allowedHosts,
    };
    if (requestUserCredentials) {
      repoUrlUiOptions.requestUserCredentials = {
        secretsKey: 'USER_OAUTH_TOKEN',
      };
    }
    const publishParameters = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.publishPhase.allowRepoSelection')
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
                    'ui:options': repoUrlUiOptions,
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
                  ...(requestUserCredentials
                    ? {
                        repoUrl: {
                          content: { type: 'string' },
                          description: 'Name of repository',
                          'ui:field': 'RepoUrlPicker',
                          'ui:options': repoUrlUiOptions,
                          ...(defaultRepoUrl && { default: defaultRepoUrl }),
                        },
                      }
                    : {}),
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
    // Compose parameter groups
    const paramGroups = [mainParameterGroup, additionalParameters];
    if (crossplaneParameters) paramGroups.push(crossplaneParameters);
    paramGroups.push(publishParameters);
    return paramGroups;
  }

  private extractSteps(version: any, xrd: any): any[] {
    // --- BEGIN VERSION/SCOPE LOGIC REFACTOR ---
    // Use presence of xrd.spec.scope to determine v2, otherwise v1
    const isV2 = !!xrd.spec?.scope;
    const scope = xrd.spec?.scope || (isV2 ? 'LegacyCluster' : 'LegacyCluster');
    const isLegacyCluster = isV2 && scope === 'LegacyCluster';
    const isCluster = scope === 'Cluster';
    const isNamespaced = scope === 'Namespaced';
    // --- END VERSION/SCOPE LOGIC REFACTOR ---
    let baseStepsYaml = '';
    // Compose the YAML as a string, not a template literal with JS expressions inside
    if (isV2 && (isCluster || isNamespaced) && !isLegacyCluster) {
      // v2 Cluster/Namespaced: no claim, use resource template action, only set namespaceParam if Namespaced
      baseStepsYaml =
        '- id: generateManifest\n' +
        '  name: Generate Kubernetes Resource Manifest\n' +
        '  action: terasky:claim-template\n' +
        '  input:\n' +
        '    parameters: ${{ parameters }}\n' +
        '    nameParam: xrName\n' +
        (isNamespaced ? '    namespaceParam: xrNamespace\n' : '    namespaceParam: ""\n') +
        '    ownerParam: owner\n' +
        '    excludeParams: [\'crossplane.compositionSelectionStrategy\',\'owner\',\'pushToGit\',\'basePath\',\'manifestLayout\',\'_editData\',\'targetBranch\',\'repoUrl\',\'clusters\',\'xrName\'' + (isNamespaced ? ', \'xrNamespace\'' : '') + ']\n' +
        '    apiVersion: {API_VERSION}\n' +
        '    kind: {KIND}\n' +
        '    clusters: ${{ parameters.clusters if parameters.manifestLayout === \'cluster-scoped\' and parameters.pushToGit else [\'temp\'] }}\n' +
        '    removeEmptyParams: true\n';
    } else {
      // v1 or v2 LegacyCluster: keep current logic
      baseStepsYaml =
        '- id: generateManifest\n' +
        '  name: Generate Kubernetes Resource Manifest\n' +
        '  action: terasky:claim-template\n' +
        '  input:\n' +
        '    parameters: ${{ parameters }}\n' +
        '    nameParam: xrName\n' +
        '    namespaceParam: xrNamespace\n' +
        '    ownerParam: owner\n' +
        '    excludeParams: [\'owner\', \'compositionSelectionStrategy\',\'pushToGit\',\'basePath\',\'manifestLayout\',\'_editData\', \'targetBranch\', \'repoUrl\', \'clusters\', \'xrName\', \'xrNamespace\']\n' +
        '    apiVersion: {API_VERSION}\n' +
        '    kind: {KIND}\n' +
        '    clusters: ${{ parameters.clusters if parameters.manifestLayout === \'cluster-scoped\' and parameters.pushToGit else [\'temp\'] }}\n' +
        '    removeEmptyParams: true\n'
    }
    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.target')?.toLowerCase();
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
    const allowRepoSelection = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.publishPhase.allowRepoSelection') ?? false;
    const requestUserCredentials = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.xrds.publishPhase.requestUserCredentialsForRepoUrl') ?? false;
    const userOAuthTokenInput = requestUserCredentials
      ? '    token: ${{ secrets.USER_OAUTH_TOKEN }}\n'
      : '';
    const repoSelectionStepsYaml =
      '- id: create-pull-request\n' +
      '  name: create-pull-request\n' +
      `  action: ${action}\n` +
      '  if: ${{ parameters.pushToGit }}\n' +
      '  input:\n' +
      '    repoUrl: ${{ parameters.repoUrl }}\n' +
      '    branchName: create-${{ parameters.xrName }}-resource\n' +
      '    title: Create {KIND} Resource ${{ parameters.xrName }}\n' +
      '    description: Create {KIND} Resource ${{ parameters.xrName }}\n' +
      '    targetBranchName: ${{ parameters.targetBranch }}\n' +
      userOAuthTokenInput;

    let defaultStepsYaml = baseStepsYaml;

    if (publishPhaseTarget !== 'yaml') {
      if (allowRepoSelection) {
        defaultStepsYaml += repoSelectionStepsYaml;
      }
      else {
        const repoHardcodedStepsYaml =
          '- id: create-pull-request\n' +
          '  name: create-pull-request\n' +
          `  action: ${action}\n` +
          '  if: ${{ parameters.pushToGit }}\n' +
          '  input:\n' +
          `    repoUrl: ${this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.repoUrl')}\n` +
          '    branchName: create-${{ parameters.xrName }}-resource\n' +
          '    title: Create {KIND} Resource ${{ parameters.xrName }}\n' +
          '    description: Create {KIND} Resource ${{ parameters.xrName }}\n' +
          `    targetBranchName: ${this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.targetBranch')}\n` +
          userOAuthTokenInput;
        defaultStepsYaml += repoHardcodedStepsYaml;
      }
    }

    // Replace placeholders in the default steps YAML with XRD details
    const apiVersion = `${xrd.spec.group}/${version.name}`;
    const kind = (!isV2 || isLegacyCluster)
      ? xrd.spec.claimNames?.kind
      : xrd.spec.names?.kind;

    const populatedStepsYaml = defaultStepsYaml
      .replaceAll('{API_VERSION}', apiVersion)
      .replaceAll('{KIND}', kind);

    // Parse the populated default steps YAML string
    const defaultSteps = yaml.load(populatedStepsYaml) as any[];

    // Retrieve additional steps from the version if defined
    const additionalStepsYamlString = version.schema?.openAPIV3Schema?.properties?.steps?.default;
    const additionalSteps = additionalStepsYamlString
      ? yaml.load(additionalStepsYamlString) as any[]
      : [];

    // Combine default steps with any additional steps
    return [...defaultSteps, ...additionalSteps];
  }

  private getPullRequestUrl(): string {
    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.target')?.toLowerCase();
    
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

  private translateCRDToTemplate(crd: any): Entity[] {
    if (!crd?.metadata || !crd?.spec?.versions) {
      throw new Error('Invalid CRD object');
    }

    const clusters = crd.clusters || ["default"];

    // Find the stored version
    const storedVersion = crd.spec.versions.find((version: any) => version.storage === true);
    if (!storedVersion) {
      this.logger.warn(`No stored version found for CRD ${crd.metadata.name}, skipping template generation`);
      return [];
    }

    const parameters = this.extractCRDParameters(storedVersion, clusters, crd);
    const steps = this.extractCRDSteps(storedVersion, crd);
    const clusterTags = clusters.map((cluster: any) => `cluster:${cluster}`);
    const tags = ['kubernetes-crd', ...clusterTags];

    const templates = [{
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: `${crd.spec.names.singular}-${storedVersion.name}`,
        title: `${crd.spec.names.kind}`,
        description: `A template to create a ${crd.spec.names.kind} instance`,
        tags: tags,
        labels: {
          forEntity: "system",
          source: "kubernetes",
        },
        annotations: {
          'backstage.io/managed-by-location': `cluster origin: ${crd.clusterName}`,
          'backstage.io/managed-by-origin-location': `cluster origin: ${crd.clusterName}`,
        },
      },
      spec: {
        type: crd.spec.names.singular,
        parameters,
        steps,
        output: {
          links: [
            {
              title: 'Download YAML Manifest',
              url: 'data:application/yaml;base64,${{ steps.generateManifest.output.manifestEncoded }}'
            },
            {
              title: 'Open Pull Request',
              if: '${{ parameters.pushToGit }}',
              url: this.getCRDPullRequestUrl()
            }
          ]
        },
      },
    }];

    // Filter out invalid templates
    return templates.filter(template => this.validateEntityName(template));
  }

  private translateCRDVersionsToAPI(crd: any): Entity[] {
    if (!crd?.metadata || !crd?.spec?.versions) {
      throw new Error('Invalid CRD object');
    }

    const apis = crd.spec.versions.map((version: any = {}) => {
      let crdOpenAPIDoc: any = {};
      crdOpenAPIDoc.openapi = "3.0.0";
      crdOpenAPIDoc.info = {
        title: `${crd.spec.names.plural}.${crd.spec.group}`,
        version: version.name,
      };
      crdOpenAPIDoc.servers = crd.clusterDetails.map((cluster: any) => ({
        url: cluster.url,
        description: cluster.name,
      }));
      crdOpenAPIDoc.tags = [
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
      ]
      // TODO(vrabbi) Add Paths To API for XRD
      if (crd.spec.scope === "Cluster") {
        crdOpenAPIDoc.paths = {
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
            },
            post: {
              tags: ["Cluster Scoped Operations"],
              summary: "Create a resource",
              operationId: "createResource",
              parameters: [],
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
          [`/apis/${crd.spec.group}/${version.name}/${crd.spec.names.plural}/{name}`]: {
            get: {
              tags: ["Specific Object Scoped Operations"],
              summary: `Get a ${crd.spec.names.kind}`,
              operationId: `get${crd.spec.names.kind}`,
              parameters: [
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
                { name: "name", in: "path", required: true, schema: { type: "string" } },
              ],
              responses: {
                "200": { description: "Resource deleted" },
              },
            },
          },
        };
      }
      else {
        crdOpenAPIDoc.paths = {
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
      }
      crdOpenAPIDoc.components = {
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
      crdOpenAPIDoc.security = [
        {
          bearerHttpAuthentication: []
        }
      ]
      return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'API',
        metadata: {
          name: `${crd.spec.names.kind.toLowerCase()}-${crd.spec.group}--${version.name}`,
          title: `${crd.spec.names.kind.toLowerCase()}-${crd.spec.group}--${version.name}`,
          tags: ['crd'],
          annotations: {
            'backstage.io/managed-by-location': `cluster origin: ${crd.clusterName}`,
            'backstage.io/managed-by-origin-location': `cluster origin: ${crd.clusterName}`,
          },
        },
        spec: {
          type: "openapi",
          lifecycle: "production",
          owner: this.getDefaultOwner(),
          system: "kubernetes-auto-ingested",
          definition: yaml.dump(crdOpenAPIDoc),
        },
      };
    }
    );

    // Filter out invalid APIs
    return apis.filter((api: Entity) => this.validateEntityName(api));
  }

  private extractCRDParameters(version: any, clusters: string[], crd: any): any[] {
    const mainParameterGroup = {
      title: 'Resource Metadata',
      required: ['name'],
      properties: {
        name: {
          title: 'Name',
          description: 'The name of the resource',
          pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
          maxLength: 63,
          type: 'string',
        },
        ...(crd.spec.scope === 'Namespaced' ? {
          namespace: {
            title: 'Namespace',
            description: 'The namespace in which to create the resource',
            pattern: "^[a-z0-9]([-a-z0-9]*[a-z0-9])?$",
            maxLength: 63,
            type: 'string',
          }
        } : {}),
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

    const processProperties = (properties: Record<string, any>): Record<string, any> => {
      const processedProperties: Record<string, any> = {};

      for (const [key, value] of Object.entries(properties)) {
        const typedValue = value as Record<string, any>;
        
        // Handle fields with x-kubernetes-preserve-unknown-fields: true
        if (typedValue['x-kubernetes-preserve-unknown-fields'] === true && !typedValue.type) {
          const { required: _, ...restValue } = typedValue;
          processedProperties[key] = {
            ...restValue,
            type: 'string',
            'ui:widget': 'textarea',
            'ui:options': {
              rows: 10,
            },
          };
        } else if (typedValue.type === 'object' && typedValue.properties) {
          const subProperties = processProperties(typedValue.properties);
          // Remove required fields for nested objects
          const { required: _, ...restValue } = typedValue;
          processedProperties[key] = { ...restValue, properties: subProperties };
        } else {
          // Remove required field if present
          const { required: _, ...restValue } = typedValue;
          processedProperties[key] = restValue;
        }
      }

      return processedProperties;
    };

    const processedSpec = version.schema?.openAPIV3Schema?.properties?.spec
      ? processProperties(version.schema.openAPIV3Schema.properties.spec.properties)
      : {};

    const specParameters = {
      title: 'Resource Spec',
      properties: processedSpec,
      type: 'object',
    };

    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.target')?.toLowerCase();
    const allowedTargets = this.config.getOptionalStringArray('kubernetesIngestor.genericCRDTemplates.publishPhase.allowedTargets');

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

    const requestUserCredentials = this.config.getOptionalBoolean('kubernetesIngestor.genericCRDTemplates.publishPhase.requestUserCredentialsForRepoUrl') ?? false;
    const defaultRepoUrl = this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.git.repoUrl');
    const repoUrlUiOptions: any = {
      allowedHosts: allowedHosts,
    };
    if (requestUserCredentials) {
      repoUrlUiOptions.requestUserCredentials = {
        secretsKey: 'USER_OAUTH_TOKEN',
      };
    }

    const publishParameters = this.config.getOptionalBoolean('kubernetesIngestor.genericCRDTemplates.publishPhase.allowRepoSelection')
      ? {
        title: "Creation Settings",
        properties: {
          pushToGit: {
            title: "Push Manifest to GitOps Repository",
            type: "boolean",
            default: true
          }
        },
        dependencies: {
          pushToGit: {
            oneOf: [
              {
                properties: {
                  pushToGit: { enum: [false] }
                }
              },
              {
                properties: {
                  pushToGit: { enum: [true] },
                  repoUrl: {
                    content: { type: "string" },
                    description: "Name of repository",
                    "ui:field": "RepoUrlPicker",
                    "ui:options": repoUrlUiOptions
                  },
                  targetBranch: {
                    type: "string",
                    description: "Target Branch for the PR",
                    default: "main"
                  },
                  manifestLayout: {
                    type: "string",
                    description: "Layout of the manifest",
                    default: "cluster-scoped",
                    "ui:help": "Choose how the manifest should be generated in the repo.\n* Cluster-scoped - a manifest is created for each selected cluster under the root directory of the clusters name\n* namespace-scoped - a manifest is created for the resource under the root directory with the namespace name\n* custom - a manifest is created under the specified base path",
                    enum: ["cluster-scoped", "namespace-scoped", "custom"]
                  }
                },
                dependencies: {
                  manifestLayout: {
                    oneOf: [
                      {
                        properties: {
                          manifestLayout: { enum: ["cluster-scoped"] },
                          clusters: {
                            title: "Target Clusters",
                            description: "The target clusters to apply the resource to",
                            type: "array",
                            minItems: 1,
                            items: {
                              enum: clusters,
                              type: 'string',
                            },
                            uniqueItems: true,
                            'ui:widget': 'checkboxes',
                          },
                        },
                        required: ["clusters"]
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ["custom"] },
                          basePath: {
                            type: "string",
                            description: "Base path in GitOps repository to push the manifest to"
                          }
                        },
                        required: ["basePath"]
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ["namespace-scoped"] }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      }
      : {
        title: "Creation Settings",
        properties: {
          pushToGit: {
            title: "Push Manifest to GitOps Repository",
            type: "boolean",
            default: true
          }
        },
        dependencies: {
          pushToGit: {
            oneOf: [
              {
                properties: {
                  pushToGit: { enum: [false] }
                }
              },
              {
                properties: {
                  pushToGit: { enum: [true] },
                  ...(requestUserCredentials
                    ? {
                        repoUrl: {
                          content: { type: "string" },
                          description: "Name of repository",
                          "ui:field": "RepoUrlPicker",
                          "ui:options": repoUrlUiOptions,
                          ...(defaultRepoUrl && { default: defaultRepoUrl })
                        }
                      }
                    : {}),
                  manifestLayout: {
                    type: "string",
                    description: "Layout of the manifest",
                    default: "cluster-scoped",
                    "ui:help": "Choose how the manifest should be generated in the repo.\n* Cluster-scoped - a manifest is created for each selected cluster under the root directory of the clusters name\n* namespace-scoped - a manifest is created for the resource under the root directory with the namespace name\n* custom - a manifest is created under the specified base path",
                    enum: ["cluster-scoped", "namespace-scoped", "custom"]
                  }
                },
                dependencies: {
                  manifestLayout: {
                    oneOf: [
                      {
                        properties: {
                          manifestLayout: { enum: ["cluster-scoped"] },
                          clusters: {
                            title: "Target Clusters",
                            description: "The target clusters to apply the resource to",
                            type: "array",
                            minItems: 1,
                            items: {
                              enum: clusters,
                              type: 'string',
                            },
                            uniqueItems: true,
                            'ui:widget': 'checkboxes',
                          },
                        },
                        required: ["clusters"]
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ["custom"] },
                          basePath: {
                            type: "string",
                            description: "Base path in GitOps repository to push the manifest to"
                          }
                        },
                        required: ["basePath"]
                      },
                      {
                        properties: {
                          manifestLayout: { enum: ["namespace-scoped"] }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }
      };

    return [mainParameterGroup, specParameters, publishParameters];
  }

  private extractCRDSteps(version: any, crd: any): any[] {
    let baseStepsYaml =
      '- id: generateManifest\n' +
      '  name: Generate Kubernetes Resource Manifest\n' +
      '  action: terasky:crd-template\n' +
      '  input:\n' +
      '    parameters: ${{ parameters }}\n' +
      '    nameParam: name\n' +
      (crd.spec.scope === 'Namespaced' ? '    namespaceParam: namespace\n' : '    namespaceParam: ""\n') +
      '    excludeParams: [\'compositionSelectionStrategy\',\'pushToGit\',\'basePath\',\'manifestLayout\',\'_editData\', \'targetBranch\', \'repoUrl\', \'clusters\', \'name\', \'namespace\', \'owner\']\n' +
      `    apiVersion: ${crd.spec.group}/${version.name}\n` +
      `    kind: ${crd.spec.names.kind}\n` +
      '    clusters: ${{ parameters.clusters if parameters.manifestLayout === \'cluster-scoped\' and parameters.pushToGit else [\'temp\'] }}\n' +
      '    removeEmptyParams: true\n';

    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.target')?.toLowerCase();
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
    const allowRepoSelection = this.config.getOptionalBoolean('kubernetesIngestor.genericCRDTemplates.publishPhase.allowRepoSelection') ?? false;
    const requestUserCredentials = this.config.getOptionalBoolean('kubernetesIngestor.genericCRDTemplates.publishPhase.requestUserCredentialsForRepoUrl') ?? false;
    const userOAuthTokenInput = requestUserCredentials
      ? '    token: ${{ secrets.USER_OAUTH_TOKEN }}\n'
      : '';

    let defaultStepsYaml = baseStepsYaml;

    if (publishPhaseTarget !== 'yaml') {
      if (allowRepoSelection) {
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
          '    targetBranchName: ${{ parameters.targetBranch }}\n' +
          userOAuthTokenInput;
      } else {
        defaultStepsYaml +=
          '- id: create-pull-request\n' +
          '  name: create-pull-request\n' +
          `  action: ${action}\n` +
          '  if: ${{ parameters.pushToGit }}\n' +
          '  input:\n' +
          `    repoUrl: ${this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.git.repoUrl')}\n` +
          '    branchName: create-${{ parameters.name }}-resource\n' +
          `    title: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          `    description: Create ${crd.spec.names.kind} Resource \${{ parameters.name }}\n` +
          `    targetBranchName: ${this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.git.targetBranch')}\n` +
          userOAuthTokenInput;
      }
    }
    return yaml.load(defaultStepsYaml) as any[];
  }

  private getCRDPullRequestUrl(): string {
    const publishPhaseTarget = this.config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.target')?.toLowerCase();
    
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

export class KubernetesEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private readonly taskRunner: SchedulerServiceTaskRunner,
    private readonly logger: LoggerService,
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

  getProviderName(): string {
    return 'KubernetesEntityProvider';
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
      const isCrossplaneEnabled = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.enabled') ?? true;
      const isKROEnabled = this.config.getOptionalBoolean('kubernetesIngestor.kro.enabled') ?? false;
      const componentsEnabled = this.config.getOptionalBoolean('kubernetesIngestor.components.enabled') ?? true;
      
      if (componentsEnabled) {
        // Initialize providers
        const kubernetesDataProvider = new KubernetesDataProvider(
          this.resourceFetcher,
          this.config,
          this.logger,
        );

        let compositeKindLookup: { [key: string]: any } = {};
        let rgdLookup: { [key: string]: any } = {};
        let xrdDataProvider;
        let rgdDataProvider;
        
        // Only initialize Crossplane providers if enabled
        if (isCrossplaneEnabled) {
          xrdDataProvider = new XRDDataProvider(
            this.resourceFetcher,
            this.config,
            this.logger,
          );
          // Build composite kind lookup for v2/Cluster/Namespaced (case-insensitive)
          compositeKindLookup = await xrdDataProvider.buildCompositeKindLookup();
          // Add lowercased keys for case-insensitive matching
          for (const key of Object.keys(compositeKindLookup)) {
            compositeKindLookup[key.toLowerCase()] = compositeKindLookup[key];
          }
        }

        // Only initialize KRO providers if enabled
        if (isKROEnabled) {
          rgdDataProvider = new RGDDataProvider(
            this.resourceFetcher,
            this.config,
            this.logger,
          );
          // Build RGD lookup for case-insensitive matching
          rgdLookup = await rgdDataProvider.buildRGDLookup();
          // Add lowercased keys for case-insensitive matching
          for (const key of Object.keys(rgdLookup)) {
            rgdLookup[key.toLowerCase()] = rgdLookup[key];
          }
        }

        // Fetch all Kubernetes resources and build a CRD mapping
        const kubernetesData = await kubernetesDataProvider.fetchKubernetesObjects();
        const crdMapping = await kubernetesDataProvider.fetchCRDMapping();
        let claimCount = 0, compositeCount = 0, k8sCount = 0, kroCount = 0;
        const entities = kubernetesData.flatMap((k8s: any) => {
          if (!isCrossplaneEnabled) {
            // When Crossplane is disabled, treat everything as regular K8s resources
            if (k8s) {
              // Log the resource type being processed
              this.logger.debug(`Processing as regular K8s resource: ${k8s.kind} ${k8s.metadata?.name}`);
              k8sCount++;
              return this.translateKubernetesObjectsToEntities(k8s);
            }
            return [];
          }

          // Crossplane processing when enabled
          if (k8s?.spec?.resourceRef) {
            this.logger.debug(`Processing Crossplane claim: ${k8s.kind} ${k8s.metadata?.name}`);
            const entity = this.translateCrossplaneClaimToEntity(k8s, k8s.clusterName, crdMapping);
            if (entity) claimCount++;
            return entity ? [entity] : [];
          }
          // Ingest XRs for v2/Cluster or v2/Namespaced (case-insensitive)
          if (k8s?.spec?.crossplane) {
            this.logger.debug(`Processing Crossplane XR: ${k8s.kind} ${k8s.metadata?.name}`);
            const [group, version] = k8s.apiVersion.split('/');
            const lookupKey = `${k8s.kind}|${group}|${version}`;
            const lookupKeyLower = lookupKey.toLowerCase();
            if (compositeKindLookup[lookupKey] || compositeKindLookup[lookupKeyLower]) {
              const entity = this.translateCrossplaneCompositeToEntity(k8s, k8s.clusterName, compositeKindLookup);
              if (entity) compositeCount++;
              return entity ? [entity] : [];
            }
          }
          // Check if it's a KRO instance
          if (isKROEnabled && k8s?.metadata?.labels?.['kro.run/resource-graph-definition-id']) {
            this.logger.debug(`Processing KRO instance: ${k8s.kind} ${k8s.metadata?.name}`);
            const [group, version] = k8s.apiVersion.split('/');
            const lookupKey = `${k8s.kind}|${group}|${version}`;
            const lookupKeyLower = lookupKey.toLowerCase();
            if (rgdLookup[lookupKey] || rgdLookup[lookupKeyLower]) {
              kroCount++;
              return this.translateKROInstanceToEntity(k8s, k8s.clusterName, rgdLookup);
            }
          }

          // Fallback: treat as regular K8s resource
          if (k8s) {
            this.logger.debug(`Processing as regular K8s resource: ${k8s.kind} ${k8s.metadata?.name}`);
            k8sCount++;
            return this.translateKubernetesObjectsToEntities(k8s);
          }
          return [];
        });

        await this.connection.applyMutation({
          type: 'full',
          entities: entities.map((entity: Entity) => ({
            entity,
            locationKey: `provider:${this.getProviderName()}`,
          })),
        });
      } else {
        await this.connection.applyMutation({
          type: 'full',
          entities: [],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to run KubernetesEntityProvider: ${error}`);
    }
  }

  private translateKubernetesObjectsToEntities(resource: any): Entity[] {
    const namespace = resource.metadata.namespace || 'default';
    const annotations = resource.metadata.annotations || {};
    const systemNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.namespaceModel')?.toLowerCase() || 'default';
    let systemNamespaceValue = '';
    if (systemNamespaceModel === 'cluster') {
      systemNamespaceValue = resource.clusterName;
    } else if (systemNamespaceModel === 'namespace') {
      systemNamespaceValue = namespace || 'default';
    } else {
      systemNamespaceValue = 'default';
    }
    const systemNameModel = this.config.getOptionalString('kubernetesIngestor.mappings.systemModel')?.toLowerCase() || 'namespace';
    let systemNameValue = '';
    if (systemNameModel === 'cluster') {
      systemNameValue = resource.clusterName;
    } else if (systemNameModel === 'namespace') {
      systemNameValue = namespace || resource.metadata.name;
    } else if (systemNameModel === 'cluster-namespace') {
      if (resource.metadata.namespace) {
        systemNameValue = `${resource.clusterName}-${resource.metadata.namespace}`;
      } else {
        systemNameValue = `${resource.clusterName}`;
      }
    } else {
      systemNameValue = 'default';
    }
    const systemReferencesNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.referencesNamespaceModel')?.toLowerCase() || 'default';
    let systemReferencesNamespaceValue = '';
    if (systemReferencesNamespaceModel === 'same') {
      systemReferencesNamespaceValue = systemNamespaceValue;
    } else if (systemReferencesNamespaceModel === 'default') {
      systemReferencesNamespaceValue = 'default';
    }
    const nameModel = this.config.getOptionalString('kubernetesIngestor.mappings.nameModel')?.toLowerCase() || 'name';
    let nameValue = '';
    if (nameModel === 'name-kind') {
      nameValue = `${resource.metadata.name}-${resource.kind.toLowerCase()}`;
    } else if (nameModel === 'name-cluster') {
      nameValue = `${resource.metadata.name}-${resource.clusterName}`;
    } else if (nameModel === 'name-namespace') {
      nameValue = `${resource.metadata.name}-${namespace}`;
    } else {
      nameValue = resource.metadata.name;
    }
    const titleModel = this.config.getOptionalString('kubernetesIngestor.mappings.titleModel')?.toLowerCase() || 'name';
    let titleValue = '';
    if (titleModel === 'name-cluster') {
      titleValue = `${resource.metadata.name}-${resource.clusterName}`;
    } else if (titleModel === 'name-namespace') {
      titleValue = `${resource.metadata.name}-${namespace}`;
    } else {
      titleValue = resource.metadata.name;
    }
    const prefix = this.getAnnotationPrefix();

    const customAnnotations = this.extractCustomAnnotations(annotations, resource.clusterName);

    // Add ArgoCD app name if present
    const argoAnnotations = this.extractArgoAppName(annotations);

    // Add the Kubernetes label selector annotation if present
    if (!annotations[`${prefix}/kubernetes-label-selector`]) {
      if (resource.kind === 'Deployment' || resource.kind === 'StatefulSet' || resource.kind === 'DaemonSet' || resource.kind === 'CronJob') {
        const commonLabels = this.findCommonLabels(resource);
        if (commonLabels) {
          customAnnotations['backstage.io/kubernetes-label-selector'] = commonLabels;
        }
      }
    } else {
      customAnnotations['backstage.io/kubernetes-label-selector'] = annotations[`${prefix}/kubernetes-label-selector`];
    }

    // Add custom workload URI
    if (resource.apiVersion) {
      const [apiGroup, version] = resource.apiVersion.includes('/') 
        ? resource.apiVersion.split('/')
        : ['', resource.apiVersion];
      const kindPlural = pluralize(resource.kind);
      const objectName = resource.metadata.name;
      const customWorkloadUri = resource.metadata.namespace
        ? `/apis/${apiGroup}/${version}/namespaces/${namespace}/${kindPlural}/${objectName}`
        : `/apis/${apiGroup}/${version}/${kindPlural}/${objectName}`;
      customAnnotations[`${prefix}/custom-workload-uri`] = customWorkloadUri.toLowerCase();
    }

    // Add source-location and techdocs-ref if present
    if (annotations[`${prefix}/source-code-repo-url`]) {
      const repoUrl = `url:${annotations[`${prefix}/source-code-repo-url`]}`;
      customAnnotations['backstage.io/source-location'] = repoUrl;

      // Construct techdocs-ref
      const branch = annotations[`${prefix}/source-branch`] || 'main';
      const techdocsPath = annotations[`${prefix}/techdocs-path`];

      if (techdocsPath) {
        customAnnotations['backstage.io/techdocs-ref'] = `${repoUrl}/blob/${branch}/${techdocsPath}`;
      }
    }

    const systemEntity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        name: systemNameValue,
        namespace: annotations[`${prefix}/backstage-namespace`] || systemNamespaceValue,
        annotations: customAnnotations,
      },
      spec: {
        owner: resolveOwnerRef(annotations[`${prefix}/owner`], systemReferencesNamespaceValue, this.getDefaultOwner()),
        type: annotations[`${prefix}/system-type`] || 'kubernetes-namespace',
        ...(annotations[`${prefix}/domain`]
          ? { domain: annotations[`${prefix}/domain`] }
          : {}),
      },
    };

    // Check if we should ingest as Resource instead of Component
    const ingestAsResources = this.config.getOptionalBoolean('kubernetesIngestor.components.ingestAsResources') ?? false;
    const entityKind = ingestAsResources ? 'Resource' : 'Component';

    const componentEntity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: entityKind,
      metadata: {
        name: annotations[`${prefix}/name`] || nameValue,
        title: annotations[`${prefix}/title`] || titleValue,
        description: annotations[`${prefix}/description`] || `${resource.kind} ${resource.metadata.name} from ${resource.clusterName}`,
        namespace: annotations[`${prefix}/backstage-namespace`] || systemNamespaceValue,
        links: this.parseBackstageLinks(resource.metadata.annotations || {}),
        annotations: {
          ...Object.fromEntries(
            Object.entries(annotations).filter(([key]) => key !== `${prefix}/links`)
          ),
          [`${prefix}/kubernetes-resource-kind`]: resource.kind,
          [`${prefix}/kubernetes-resource-name`]: resource.metadata.name,
          [`${prefix}/kubernetes-resource-api-version`]: resource.apiVersion,
          [`${prefix}/kubernetes-resource-namespace`]: resource.metadata.namespace || '',
          ...customAnnotations,
          ...argoAnnotations,
          ...(systemNameModel === 'cluster-namespace' || systemNamespaceModel === 'cluster' ? {
            'backstage.io/kubernetes-cluster': resource.clusterName,
          } : {})
        },
        tags: [`cluster:${resource.clusterName}`, `kind:${resource.kind?.toLowerCase()}`],
      },
      spec: {
        type: annotations[`${prefix}/component-type`] || 'service',
        lifecycle: annotations[`${prefix}/lifecycle`] || 'production',
        owner: resolveOwnerRef(annotations[`${prefix}/owner`], systemReferencesNamespaceValue, this.getDefaultOwner()),
        system: annotations[`${prefix}/system`] || `${systemReferencesNamespaceValue}/${systemNameValue}`,
        dependsOn: annotations[`${prefix}/dependsOn`]?.split(','),
        ...(entityKind === 'Component' ? {
          providesApis: annotations[`${prefix}/providesApis`]?.split(','),
          consumesApis: annotations[`${prefix}/consumesApis`]?.split(','),
        } : {}),
        ...(annotations[`${prefix}/subcomponent-of`] && {
          subcomponentOf: annotations[`${prefix}/subcomponent-of`],
        }),
      },
    };

    const entities: Entity[] = [];
    if (this.validateEntityName(systemEntity)) {
      entities.push(systemEntity);
    }
    if (this.validateEntityName(componentEntity)) {
      entities.push(componentEntity);
    }
    return entities;
  }

  private translateCrossplaneClaimToEntity(claim: any, clusterName: string, crdMapping: any): Entity | undefined {
    // First, check if this is a valid claim by looking up its kind in the CRD mapping
    const resourceKind = claim.kind;
    if (!crdMapping[resourceKind]) {
      this.logger.debug(`No CRD mapping found for kind ${resourceKind}, skipping claim processing`);
      return undefined;
    }
    const prefix = this.getAnnotationPrefix();
    const annotations = claim.metadata.annotations || {};

    // Extract CR values
    const [crGroup, crVersion] = claim.apiVersion.split('/');
    const crKind = claim.kind;
    const crPlural = crdMapping[crKind] || pluralize(claim.kind.toLowerCase()); // Fetch plural from CRD mapping

    // Extract Composite values from `spec.resourceRef`
    const compositeRef = claim.spec?.resourceRef || {};
    const compositeKind = compositeRef.kind || '';
    const compositeName = compositeRef.name || '';
    const compositeGroup = compositeRef.apiVersion?.split('/')?.[0] || '';
    const compositeVersion = compositeRef.apiVersion?.split('/')?.[1] || '';
    const compositePlural = compositeKind ? crdMapping[compositeKind] || '' : ''; // Fetch plural for composite kind
    const compositionData = claim.compositionData || {};
    const compositionName = compositionData.name || '';
    const compositionFunctions = compositionData.usedFunctions || [];

    // Add Crossplane claim annotations
    const crossplaneAnnotations = {
      [`${prefix}/claim-name`]: claim.metadata.name,
      [`${prefix}/claim-kind`]: crKind,
      [`${prefix}/claim-version`]: crVersion,
      [`${prefix}/claim-group`]: crGroup,
      [`${prefix}/claim-plural`]: crPlural,
      [`${prefix}/crossplane-resource`]: "true",
      [`${prefix}/composite-kind`]: compositeKind,
      [`${prefix}/composite-name`]: compositeName,
      [`${prefix}/composite-group`]: compositeGroup,
      [`${prefix}/composite-version`]: compositeVersion,
      [`${prefix}/composite-plural`]: compositePlural,
      [`${prefix}/composition-name`]: compositionName,
      [`${prefix}/composition-functions`]: compositionFunctions.join(','),
      'backstage.io/kubernetes-label-selector': `crossplane.io/claim-name=${claim.metadata.name},crossplane.io/claim-namespace=${claim.metadata.namespace},crossplane.io/composite=${compositeName}`
    };

    const resourceAnnotations = claim.metadata.annotations || {};
    const customAnnotations = this.extractCustomAnnotations(resourceAnnotations, clusterName);

    // Add ArgoCD app name if present
    const argoAnnotations = this.extractArgoAppName(resourceAnnotations);

    const systemNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.namespaceModel')?.toLowerCase() || 'default';
    let systemNamespaceValue = '';
    if (systemNamespaceModel === 'cluster') {
      systemNamespaceValue = clusterName;
    } else if (systemNamespaceModel === 'namespace') {
      systemNamespaceValue = claim.metadata.namespace || 'default';
    } else {
      systemNamespaceValue = 'default';
    }
    const systemNameModel = this.config.getOptionalString('kubernetesIngestor.mappings.systemModel')?.toLowerCase() || 'namespace';
    let systemNameValue = '';
    if (systemNameModel === 'cluster') {
      systemNameValue = clusterName;
    } else if (systemNameModel === 'namespace') {
      systemNameValue = claim.metadata.namespace || claim.metadata.name;
    } else if (systemNameModel === 'cluster-namespace') {
      if (claim.metadata.namespace) {
        systemNameValue = `${clusterName}-${claim.metadata.namespace}`;
      } else {
        systemNameValue = `${clusterName}`;
      }
    } else {
      systemNameValue = 'default';
    }
    const systemReferencesNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.referencesNamespaceModel')?.toLowerCase() || 'default';
    let systemReferencesNamespaceValue = '';
    if (systemReferencesNamespaceModel === 'same') {
      systemReferencesNamespaceValue = systemNamespaceValue;
    } else if (systemReferencesNamespaceModel === 'default') {
      systemReferencesNamespaceValue = 'default';
    }
    const nameModel = this.config.getOptionalString('kubernetesIngestor.mappings.nameModel')?.toLowerCase() || 'name';
    let nameValue = '';
    if (nameModel === 'name-kind') {
      nameValue = `${claim.metadata.name}-${crKind.toLowerCase()}`;
    } else if (nameModel === 'name-cluster') {
      nameValue = `${claim.metadata.name}-${clusterName}`;
    } else if (nameModel === 'name-namespace') {
      nameValue = `${claim.metadata.name}-${claim.metadata.namespace}`;
    } else {
      nameValue = claim.metadata.name;
    }
    const titleModel = this.config.getOptionalString('kubernetesIngestor.mappings.titleModel')?.toLowerCase() || 'name';
    let titleValue = '';
    if (titleModel === 'name-cluster') {
      titleValue = `${claim.metadata.name}-${clusterName}`;
    } else if (titleModel === 'name-namespace') {
      titleValue = `${claim.metadata.name}-${claim.metadata.namespace}`;
    } else {
      titleValue = claim.metadata.name;
    }

    // Check if we should ingest as Resource instead of Component
    const ingestAsResources = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.claims.ingestAsResources') ?? false;
    const entityKind = ingestAsResources ? 'Resource' : 'Component';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: entityKind,
      metadata: {
        name: annotations[`${prefix}/name`] || nameValue,
        title: annotations[`${prefix}/title`] || titleValue,
        description: annotations[`${prefix}/description`] || `${crKind} ${claim.metadata.name} from ${claim.clusterName}`,
        tags: [`cluster:${claim.clusterName}`, `kind:${crKind.toLowerCase()}`],
        namespace: annotations[`${prefix}/backstage-namespace`] || systemNamespaceValue,
        links: this.parseBackstageLinks(claim.metadata.annotations || {}),
        annotations: {
          ...Object.fromEntries(
            Object.entries(annotations).filter(([key]) => key !== `${prefix}/links`)
          ),
          [`${prefix}/component-type`]: 'crossplane-claim',
          ...(systemNameModel === 'cluster-namespace' || systemNamespaceModel === 'cluster' ? {
            'backstage.io/kubernetes-cluster': clusterName,
          } : {}),
          ...customAnnotations,
          ...argoAnnotations,
          ...crossplaneAnnotations,
        },
      },
      spec: {
        type: 'crossplane-claim',
        lifecycle: annotations[`${prefix}/lifecycle`] || 'production',
        owner: resolveOwnerRef(annotations[`${prefix}/owner`], systemReferencesNamespaceValue, this.getDefaultOwner()),
        system: annotations[`${prefix}/system`] || `${systemReferencesNamespaceValue}/${systemNameValue}`,
        dependsOn: annotations[`${prefix}/dependsOn`]?.split(','),
        ...(entityKind === 'Component' ? {
          consumesApis: [`${systemReferencesNamespaceValue}/${claim.kind}-${claim.apiVersion.split('/').join('--')}`],
        } : {}),
        ...(annotations[`${prefix}/subcomponent-of`] && {
          subcomponentOf: annotations[`${prefix}/subcomponent-of`],
        }),
      },
    };

    return this.validateEntityName(entity) ? entity : undefined;
  }

  private translateKROInstanceToEntity(instance: any, clusterName: string, rgdLookup: any): Entity[] {
    // First, check if this is a valid KRO instance by looking up its kind in the RGD lookup
    const [group, version] = instance.apiVersion.split('/');
    const lookupKey = `${instance.kind}|${group}|${version}`;
    const lookupKeyLower = lookupKey.toLowerCase();
    const rgd = rgdLookup[lookupKey] || rgdLookup[lookupKeyLower];
    if (!rgd) {
      this.logger.debug(`No RGD lookup found for key ${lookupKey}, skipping KRO instance processing`);
      return [];
    }

    const prefix = this.getAnnotationPrefix();
    const annotations = instance.metadata.annotations || {};
    const rgdId = instance.metadata.labels['kro.run/resource-graph-definition-id'];

    // Add KRO-specific annotations
    const kroAnnotations = {
      [`${prefix}/kro-rgd-name`]: instance.kroData.rgd.metadata.name,
      [`${prefix}/kro-rgd-id`]: rgdId,
      [`${prefix}/kro-rgd-crd-name`]: instance.kroData.crd?.metadata?.name,
      [`${prefix}/kro-instance-uid`]: instance.metadata?.uid,
      [`${prefix}/kro-instance-namespace`]: instance.metadata?.namespace,
      [`${prefix}/kro-instance-name`]: instance.metadata?.name,
      [`${prefix}/kro-sub-resources`]: instance.kroData.rgd.spec.resources.map((r: any) => {
        if (!r.template) return null;
        const apiVersion = r.template.apiVersion.toLowerCase();
        const kind = r.template.kind.toLowerCase();
        return `${apiVersion}:${kind}`;
      }).filter(Boolean).join(','),
      [`${prefix}/component-type`]: 'kro-instance',
    };

    const resourceAnnotations = instance.metadata.annotations || {};
    const customAnnotations = this.extractCustomAnnotations(resourceAnnotations, clusterName);

    // Add ArgoCD app name if present
    const argoAnnotations = this.extractArgoAppName(resourceAnnotations);

    const systemNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.namespaceModel')?.toLowerCase() || 'default';
    let systemNamespaceValue = '';
    if (systemNamespaceModel === 'cluster') {
      systemNamespaceValue = clusterName;
    } else if (systemNamespaceModel === 'namespace') {
      systemNamespaceValue = instance.metadata.namespace || 'default';
    } else {
      systemNamespaceValue = 'default';
    }
    const systemNameModel = this.config.getOptionalString('kubernetesIngestor.mappings.systemModel')?.toLowerCase() || 'namespace';
    let systemNameValue = '';
    if (systemNameModel === 'cluster') {
      systemNameValue = clusterName;
    } else if (systemNameModel === 'namespace') {
      systemNameValue = instance.metadata.namespace || instance.metadata.name;
    } else if (systemNameModel === 'cluster-namespace') {
      if (instance.metadata.namespace) {
        systemNameValue = `${clusterName}-${instance.metadata.namespace}`;
      } else {
        systemNameValue = `${clusterName}`;
      }
    } else {
      systemNameValue = 'default';
    }
    const systemReferencesNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.referencesNamespaceModel')?.toLowerCase() || 'default';
    let systemReferencesNamespaceValue = '';
    if (systemReferencesNamespaceModel === 'same') {
      systemReferencesNamespaceValue = systemNamespaceValue;
    } else if (systemReferencesNamespaceModel === 'default') {
      systemReferencesNamespaceValue = 'default';
    }
    const nameModel = this.config.getOptionalString('kubernetesIngestor.mappings.nameModel')?.toLowerCase() || 'name';
    let nameValue = '';
    if (nameModel === 'name-kind') {
      nameValue = `${instance.metadata.name}-${instance.kind?.toLowerCase()}`;
    } else if (nameModel === 'name-cluster') {
      nameValue = `${instance.metadata.name}-${clusterName}`;
    } else if (nameModel === 'name-namespace') {
      nameValue = `${instance.metadata.name}-${instance.metadata.namespace}`;
    } else {
      nameValue = instance.metadata.name;
    }
    const titleModel = this.config.getOptionalString('kubernetesIngestor.mappings.titleModel')?.toLowerCase() || 'name';
    let titleValue = '';
    if (titleModel === 'name-cluster') {
      titleValue = `${instance.metadata.name}-${clusterName}`;
    } else if (titleModel === 'name-namespace') {
      titleValue = `${instance.metadata.name}-${instance.metadata.namespace}`;
    } else {
      titleValue = instance.metadata.name;
    }

    // Check if we should ingest as Resource instead of Component
    const ingestAsResources = this.config.getOptionalBoolean('kubernetesIngestor.kro.instances.ingestAsResources') ?? false;
    const entityKind = ingestAsResources ? 'Resource' : 'Component';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: entityKind,
      metadata: {
        name: annotations[`${prefix}/name`] || nameValue,
        title: annotations[`${prefix}/title`] || titleValue,
        description: annotations[`${prefix}/description`] || `${instance.kind} ${instance.metadata.name} from ${instance.clusterName}`,
        tags: [`cluster:${instance.clusterName}`, `kind:${instance.kind?.toLowerCase()}`],
        namespace: annotations[`${prefix}/backstage-namespace`] || systemNamespaceValue,
        links: this.parseBackstageLinks(instance.metadata.annotations || {}),
        annotations: {
          ...Object.fromEntries(
            Object.entries(annotations).filter(([key]) => key !== `${prefix}/links`)
          ),
          ...(systemNameModel === 'cluster-namespace' || systemNamespaceModel === 'cluster' ? {
            'backstage.io/kubernetes-cluster': clusterName,
          } : {}),
          ...customAnnotations,
          ...argoAnnotations,
          ...kroAnnotations,
        },
      },
      spec: {
        type: 'kro-instance',
        lifecycle: annotations[`${prefix}/lifecycle`] || 'production',
        owner: resolveOwnerRef(annotations[`${prefix}/owner`], systemReferencesNamespaceValue, this.getDefaultOwner()),
        system: annotations[`${prefix}/system`] || `${systemReferencesNamespaceValue}/${systemNameValue}`,
        dependsOn: annotations[`${prefix}/dependsOn`]?.split(','),
        ...(entityKind === 'Component' ? {
          consumesApis: [`${systemReferencesNamespaceValue}/${instance.kind}-${instance.apiVersion.split('/').join('--')}`],
        } : {}),
        ...(annotations[`${prefix}/subcomponent-of`] && {
          subcomponentOf: annotations[`${prefix}/subcomponent-of`],
        }),
      },
    };

    return this.validateEntityName(entity) ? [entity] : [];
  }

  private translateCrossplaneCompositeToEntity(xr: any, clusterName: string, compositeKindLookup: any): Entity | undefined {
    // First, check if this is a valid composite by looking up its kind in the composite kind lookup
    const [group, version] = xr.apiVersion.split('/');
    const lookupKey = `${xr.kind}|${group}|${version}`;
    const lookupKeyLower = lookupKey.toLowerCase();
    if (!compositeKindLookup[lookupKey] && !compositeKindLookup[lookupKeyLower]) {
      this.logger.debug(`No composite kind lookup found for key ${lookupKey}, skipping composite processing`);
      return undefined;
    }
    const annotations = xr.metadata.annotations || {};
    const prefix = this.getAnnotationPrefix();
    const kind = xr.kind;
    const scope = compositeKindLookup[lookupKey]?.scope || compositeKindLookup[lookupKeyLower]?.scope;
    const crossplaneVersion = 'v2';
    const plural = compositeKindLookup[lookupKey]?.spec?.names?.plural || compositeKindLookup[lookupKeyLower]?.spec?.names?.plural;
    const compositionName = xr.spec?.crossplane?.compositionRef?.name || '';
    const compositionData = xr.compositionData || {};
    const compositionFunctions = compositionData.usedFunctions || [];

    // Add Crossplane annotations
    const crossplaneAnnotations = {
      [`${prefix}/crossplane-version`]: crossplaneVersion,
      [`${prefix}/crossplane-scope`]: scope,
      [`${prefix}/composite-kind`]: kind,
      [`${prefix}/composite-name`]: xr.metadata.name,
      [`${prefix}/composite-namespace`]: xr.metadata.namespace || 'default',
      [`${prefix}/composite-group`]: group,
      [`${prefix}/composite-version`]: version,
      [`${prefix}/composite-plural`]: plural,
      [`${prefix}/composition-name`]: compositionName,
      [`${prefix}/crossplane-resource`]: 'true',
      [`${prefix}/component-type`]: 'crossplane-xr',
      'backstage.io/kubernetes-label-selector': `crossplane.io/composite=${xr.metadata.name}`,
    };

    // Add composition-functions annotation if present
    if (compositionFunctions.length > 0) {
      crossplaneAnnotations[`${prefix}/composition-functions`] = compositionFunctions.join(',');
    }

    const resourceAnnotations = xr.metadata.annotations || {};
    const customAnnotations = this.extractCustomAnnotations(resourceAnnotations, clusterName);

    // Add ArgoCD app name if present
    const argoAnnotations = this.extractArgoAppName(resourceAnnotations);

    const systemNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.namespaceModel')?.toLowerCase() || 'default';
    let systemNamespaceValue = '';
    if (systemNamespaceModel === 'cluster') {
      systemNamespaceValue = clusterName;
    } else if (systemNamespaceModel === 'namespace') {
      systemNamespaceValue = xr.metadata.namespace || 'default';
    } else {
      systemNamespaceValue = 'default';
    }
    const systemNameModel = this.config.getOptionalString('kubernetesIngestor.mappings.systemModel')?.toLowerCase() || 'namespace';
    let systemNameValue = '';
    if (systemNameModel === 'cluster') {
      systemNameValue = clusterName;
    } else if (systemNameModel === 'namespace') {
      systemNameValue = xr.metadata.namespace || xr.metadata.name;
    } else if (systemNameModel === 'cluster-namespace') {
      if (xr.metadata.namespace) {
        systemNameValue = `${clusterName}-${xr.metadata.namespace}`;
      } else {
        systemNameValue = `${clusterName}`;
      }
    } else {
      systemNameValue = 'default';
    }
    const systemReferencesNamespaceModel = this.config.getOptionalString('kubernetesIngestor.mappings.referencesNamespaceModel')?.toLowerCase() || 'default';
    let systemReferencesNamespaceValue = '';
    if (systemReferencesNamespaceModel === 'same') {
      systemReferencesNamespaceValue = systemNamespaceValue;
    } else if (systemReferencesNamespaceModel === 'default') {
      systemReferencesNamespaceValue = 'default';
    }
    const nameModel = this.config.getOptionalString('kubernetesIngestor.mappings.nameModel')?.toLowerCase() || 'name';
    let nameValue = '';
    if (nameModel === 'name-kind') {
      nameValue = `${xr.metadata.name}-${kind.toLowerCase()}`;
    } else if (nameModel === 'name-cluster') {
      nameValue = `${xr.metadata.name}-${clusterName}`;
    } else if (nameModel === 'name-namespace') {
      nameValue = `${xr.metadata.name}-${xr.metadata.namespace || 'default'}`;
    } else {
      nameValue = xr.metadata.name;
    }
    const titleModel = this.config.getOptionalString('kubernetesIngestor.mappings.titleModel')?.toLowerCase() || 'name';
    let titleValue = '';
    if (titleModel === 'name-cluster') {
      titleValue = `${xr.metadata.name}-${clusterName}`;
    } else if (titleModel === 'name-namespace') {
      titleValue = `${xr.metadata.name}-${xr.metadata.namespace || 'default'}`;
    } else {
      titleValue = xr.metadata.name;
    }

    // Check if we should ingest as Resource instead of Component (uses same config as claims)
    const ingestAsResources = this.config.getOptionalBoolean('kubernetesIngestor.crossplane.claims.ingestAsResources') ?? false;
    const entityKind = ingestAsResources ? 'Resource' : 'Component';

    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: entityKind,
      metadata: {
        name: annotations[`${prefix}/name`] || nameValue,
        title: annotations[`${prefix}/title`] || titleValue,
        description: annotations[`${prefix}/description`] || `${kind} ${xr.metadata.name} from ${xr.clusterName}`,
        tags: [`cluster:${xr.clusterName}`, `kind:${kind.toLowerCase()}`],
        namespace: annotations[`${prefix}/backstage-namespace`] || systemNamespaceValue,
        links: this.parseBackstageLinks(xr.metadata.annotations || {}),
        annotations: {
          ...Object.fromEntries(
            Object.entries(annotations).filter(([key]) => key !== `${prefix}/links`)
          ),
          'backstage.io/kubernetes-cluster': clusterName,
          ...customAnnotations,
          ...argoAnnotations,
          ...crossplaneAnnotations,
        },
      },
      spec: {
        type: 'crossplane-xr',
        lifecycle: annotations[`${prefix}/lifecycle`] || 'production',
        owner: annotations[`${prefix}/owner`] || this.getDefaultOwner(),
        system: annotations[`${prefix}/system`] || `${systemReferencesNamespaceValue}/${systemNameValue}`,
        dependsOn: annotations[`${prefix}/dependsOn`]?.split(','),
        ...(entityKind === 'Component' ? {
          consumesApis: [`${systemReferencesNamespaceValue}/${xr.kind}-${xr.apiVersion.split('/').join('--')}`],
        } : {}),
        ...(annotations[`${prefix}/subcomponent-of`] && {
          subcomponentOf: annotations[`${prefix}/subcomponent-of`],
        }),
      },
    };

    return this.validateEntityName(entity) ? entity : undefined;
  }

  private extractCustomAnnotations(annotations: Record<string, string>, clusterName: string): Record<string, string> {
    const prefix = this.getAnnotationPrefix();
    const customAnnotationsKey = `${prefix}/component-annotations`;
    const defaultAnnotations: Record<string, string> = {
      'backstage.io/managed-by-location': `cluster origin: ${clusterName}`,
      'backstage.io/managed-by-origin-location': `cluster origin: ${clusterName}`,
    };

    if (!annotations[customAnnotationsKey]) {
      return defaultAnnotations;
    }

    const customAnnotations = annotations[customAnnotationsKey].split(',').reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex !== -1) {
        const key = pair.substring(0, separatorIndex).trim();
        const value = pair.substring(separatorIndex + 1).trim();
        if (key && value) {
          acc[key] = value;
        }
      }
      return acc;
    }, defaultAnnotations);
    
    return customAnnotations;
  }

  private getAnnotationPrefix(): string {
    return this.config.getOptionalString('kubernetesIngestor.annotationPrefix') || 'terasky.backstage.io';
  }

  private getDefaultOwner(): string {
    return this.config.getOptionalString('kubernetesIngestor.defaultOwner') || 'kubernetes-auto-ingested';
  }

  private extractArgoAppName(annotations: Record<string, string>): Record<string, string> {
    const argoIntegrationEnabled = this.config.getOptionalBoolean('kubernetesIngestor.argoIntegration') ?? true;
    
    if (!argoIntegrationEnabled) {
      return {};
    }

    const trackingId = annotations['argocd.argoproj.io/tracking-id'];
    if (!trackingId) {
      return {};
    }

    // Extract the first segment before the first ':'
    const appName = trackingId.split(':')[0];
    if (!appName) {
      return {};
    }

    return {
      'argocd/app-name': appName,
    };
  }

  private findCommonLabels(resource: any): string | null {
    const highLevelLabels = resource.metadata.labels || {};
    const podLabels = resource.spec?.template?.metadata?.labels || {};

    const commonLabels = Object.keys(highLevelLabels).filter(label => podLabels[label]);
    if (commonLabels.length > 0) {
      return commonLabels.map(label => `${label}=${highLevelLabels[label]}`).join(',');
    } else if (Object.keys(highLevelLabels).length > 0) {
      return Object.keys(highLevelLabels).map(label => `${label}=${highLevelLabels[label]}`).join(',');
    }

    return null;
  }

  private parseBackstageLinks(annotations: Record<string, string>): BackstageLink[] {
    const prefix = this.getAnnotationPrefix();
    const linksAnnotation = annotations[`${prefix}/links`];
    if (!linksAnnotation) {
      return [];
    }

    try {
      const linksArray = JSON.parse(linksAnnotation) as BackstageLink[];
      this.logger.debug(`Parsed ${prefix}/links: ${JSON.stringify(linksArray)}`);

      return linksArray.map((link: BackstageLink) => ({
        url: link.url,
        title: link.title,
        icon: link.icon
      }));
    } catch (error) {
      this.logger.warn(`Failed to parse ${prefix}/links annotation: ${error}`)
      this.logger.warn(`Raw annotation value: ${linksAnnotation}`)
      return [];
    }
  }
}
