import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { KubernetesService } from './service/KubernetesService';

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: KubernetesService) {
  // Get Resources
  actionsRegistry.register({
    name: 'get_kro_resources',
    title: 'Get KRO Resources',
    description: 'Get all resources for a KRO instance',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the Kubernetes cluster'),
        namespace: z.string().describe('The namespace containing the resources'),
        rgdName: z.string().describe('The name of the ResourceGraphDefinition'),
        rgdId: z.string().describe('The ID of the ResourceGraphDefinition'),
        instanceId: z.string().describe('The ID of the instance'),
        instanceName: z.string().describe('The name of the instance'),
        crdName: z.string().describe('The name of the CRD'),
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
    action: async ({ input }) => {
      const result = await service.getResources(
        input.clusterName,
        input.namespace,
        input.rgdName,
        input.rgdId,
        input.instanceId,
        input.instanceName,
        input.crdName,
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
        clusterName: z.string().describe('The name of the Kubernetes cluster'),
        namespace: z.string().describe('The namespace containing the resource'),
        resourceName: z.string().describe('The name of the resource'),
        resourceKind: z.string().describe('The kind of the resource'),
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
    action: async ({ input }) => {
      const events = await service.getEvents(
        input.clusterName,
        input.namespace,
        input.resourceName,
        input.resourceKind,
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
        clusterName: z.string().describe('The name of the Kubernetes cluster'),
        namespace: z.string().describe('The namespace containing the resources'),
        rgdName: z.string().describe('The name of the ResourceGraphDefinition'),
        rgdId: z.string().describe('The ID of the ResourceGraphDefinition'),
        instanceId: z.string().describe('The ID of the instance'),
        instanceName: z.string().describe('The name of the instance'),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).transform(resources => resources as { [k: string]: unknown }[]),
      }),
    },
    action: async ({ input }) => {
      const resources = await service.getResourceGraph(
        input.clusterName,
        input.namespace,
        input.rgdName,
        input.rgdId,
        input.instanceId,
        input.instanceName,
      );
      return {
        output: {
          resources: resources as unknown as { [k: string]: unknown }[],
        },
      };
    },
  });
}
