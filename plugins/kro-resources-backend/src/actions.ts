import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogService } from '@backstage/plugin-catalog-node';
import { ConflictError, InputError } from '@backstage/errors';
import { KubernetesService } from './service/KubernetesService';

async function getEntityAndKroInfo(catalog: CatalogService, name: string, kind: string = 'component', namespace: string = 'default', credentials?: any): Promise<{ entity: any; kroInfo: { clusterName: string; rgdName: string; rgdId: string; instanceId: string; instanceName: string; crdName: string; namespace: string } }> {
  const filter: Record<string, string> = { 'metadata.name': name };
  filter.kind = kind;
  filter['metadata.namespace'] = namespace;

  const { items } = await catalog.queryEntities(
    { filter },
    { credentials },
  );

  if (items.length === 0) {
    throw new InputError(`No entity found with name "${name}"`);
  }

  if (items.length > 1) {
    throw new ConflictError(
      `Multiple entities found with name "${name}", please provide more specific filters.`,
    );
  }

  const [entity] = items;
  const annotations = entity.metadata.annotations || {};
  const clusterLocation = annotations['backstage.io/managed-by-location'];
  
  if (!clusterLocation) {
    throw new InputError('Entity is missing required annotation: backstage.io/managed-by-location');
  }

  const clusterName = clusterLocation.split(': ')[1];
  const rgdName = annotations['terasky.backstage.io/kro-rgd-name'];
  const rgdId = annotations['terasky.backstage.io/kro-rgd-id'];
  const instanceId = annotations['terasky.backstage.io/kro-instance-uid'];
  const crdName = annotations['terasky.backstage.io/kro-rgd-crd-name'];

  if (!rgdName || !rgdId || !instanceId || !crdName) {
    throw new InputError('Entity is missing required KRO annotations');
  }

  const kroInfo = {
    clusterName,
    rgdName,
    rgdId,
    instanceId,
    instanceName: entity.metadata.name,
    crdName,
    namespace: entity.metadata.namespace || annotations['namespace'] || 'default',
  };

  return { entity, kroInfo };
}

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: KubernetesService, catalog: CatalogService) {
  // Get Resources
  actionsRegistry.register({
    name: 'get_kro_resources',
    title: 'Get KRO Resources',
    description: 'Get all resources for a KRO instance',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
      }),
      output: z => z.object({
        resources: z.array(z.object({
          type: z.enum(['RGD', 'Instance', 'Resource']),
          name: z.string(),
          namespace: z.string().optional(),
          group: z.string(),
          kind: z.string(),
          status: z.object({
            synced: z.boolean(),
            ready: z.boolean(),
            conditions: z.array(z.object({}).passthrough()),
          }),
          createdAt: z.string(),
          resource: z.object({}).passthrough(),
          level: z.number(),
          parentId: z.string().optional(),
        })).transform(resources => resources as { [k: string]: unknown }[]),
        supportingResources: z.array(z.object({}).passthrough()).transform(resources => resources as { [k: string]: unknown }[]),
      }),
    },
    action: async ({ input, credentials }) => {
      const { kroInfo } = await getEntityAndKroInfo(
        catalog,
        input.backstageEntityName,
        input.backstageEntityKind,
        input.backstageEntityNamespace,
        credentials
      );

      const result = await service.getResources(
        kroInfo.clusterName,
        kroInfo.namespace,
        kroInfo.rgdName,
        kroInfo.rgdId,
        kroInfo.instanceId,
        kroInfo.instanceName,
        kroInfo.crdName,
      );
      return {
        output: {
          resources: result.resources as unknown as { [k: string]: unknown }[],
          supportingResources: result.supportingResources as unknown as { [k: string]: unknown }[],
        },
      };
    },
  });

  // Get Events
  actionsRegistry.register({
    name: 'get_kro_resource_events',
    title: 'Get KRO Resource Events',
    description: 'Get events for a Kubernetes resource managed by KRO',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
        kubernetesNamespace: z.string().describe('The namespace of the Kubernetes resource'),
        kubernetesResourceName: z.string().describe('The name of the resource'),
        kubernetesResourceKind: z.string().describe('The kind of the resource'),
      }),
      output: z => z.object({
        events: z.array(z.object({
          metadata: z.object({
            name: z.string().optional(),
            namespace: z.string().optional(),
            creationTimestamp: z.string().optional(),
          }).optional(),
          involvedObject: z.object({
            kind: z.string().optional(),
            name: z.string().optional(),
            namespace: z.string().optional(),
          }).optional(),
          reason: z.string().optional(),
          message: z.string().optional(),
          type: z.string().optional(),
          firstTimestamp: z.string().optional(),
          lastTimestamp: z.string().optional(),
          count: z.number().optional(),
        })),
      }),
    },
    action: async ({ input, credentials }) => {
      const { kroInfo } = await getEntityAndKroInfo(
        catalog,
        input.backstageEntityName,
        input.backstageEntityKind,
        input.backstageEntityNamespace,
        credentials
      );

      const events = await service.getEvents(
        kroInfo.clusterName,
        input.kubernetesNamespace,
        input.kubernetesResourceName,
        input.kubernetesResourceKind,
      );
      return {
        output: {
          events,
        },
      };
    },
  });

  // Get Resource Graph
  actionsRegistry.register({
    name: 'get_kro_resource_graph',
    title: 'Get KRO Resource Graph',
    description: 'Get the resource graph for a KRO instance',
    schema: {
      input: z => z.object({
        backstageEntityName: z.string().describe('The name of the Backstage entity'),
        backstageEntityKind: z.string().describe('The kind of the Backstage entity. Defaults to component.').optional(),
        backstageEntityNamespace: z.string().describe('The namespace of the Backstage entity. Defaults to default.').optional(),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).transform(resources => resources as { [k: string]: unknown }[]),
      }),
    },
    action: async ({ input, credentials }) => {
      const { kroInfo } = await getEntityAndKroInfo(
        catalog,
        input.backstageEntityName,
        input.backstageEntityKind,
        input.backstageEntityNamespace,
        credentials
      );

      const resources = await service.getResourceGraph(
        kroInfo.clusterName,
        kroInfo.namespace,
        kroInfo.rgdName,
        kroInfo.rgdId,
        kroInfo.instanceId,
        kroInfo.instanceName,
      );
      return {
        output: {
          resources: resources as unknown as { [k: string]: unknown }[],
        },
      };
    },
  });
}
