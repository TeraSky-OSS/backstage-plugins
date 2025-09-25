import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { KubernetesService } from './service/KubernetesService';

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: KubernetesService) {
  // Get Crossplane Resources
  actionsRegistry.register({
    name: 'get_crossplane_resources',
    title: 'Get Crossplane Resources',
    description: 'Returns Crossplane resources and their dependencies',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the cluster'),
        namespace: z.string().optional().describe('The namespace of the resource'),
        group: z.string().describe('The API group of the resource'),
        version: z.string().describe('The API version of the resource'),
        plural: z.string().describe('The plural name of the resource'),
        name: z.string().describe('The name of the resource'),
        kind: z.string().optional().describe('The kind of the resource'),
      }),
      output: z => z.object({
        resources: z.array(z.object({
          type: z.enum(['XRD', 'Claim', 'Resource']).describe('The type of the resource'),
          name: z.string().describe('The name of the resource'),
          namespace: z.string().optional().describe('The namespace of the resource'),
          group: z.string().describe('The API group of the resource'),
          kind: z.string().describe('The kind of the resource'),
          status: z.object({
            synced: z.boolean().describe('Whether the resource is synced'),
            ready: z.boolean().describe('Whether the resource is ready'),
            conditions: z.array(z.object({}).passthrough()).describe('The resource conditions'),
          }),
          createdAt: z.string().describe('When the resource was created'),
          resource: z.object({}).passthrough().describe('The full resource object'),
          level: z.number().describe('The level in the resource hierarchy'),
          parentId: z.string().optional().describe('The ID of the parent resource'),
        })),
        supportingResources: z.array(z.object({}).passthrough()).describe('Additional supporting resources'),
      }),
    },
    action: async ({ input }) => {
      try {
        const result = await service.getResources(input);
        // Convert resources to plain objects with all properties
        // Convert everything to plain objects using JSON serialization
        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        throw new Error(`Failed to get Crossplane resources: ${error}`);
      }
    },
  });

  // Get Crossplane Events
  actionsRegistry.register({
    name: 'get_crossplane_events',
    title: 'Get Crossplane Events',
    description: 'Returns events for a specific Crossplane resource',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the cluster'),
        namespace: z.string().describe('The namespace of the resource'),
        resourceName: z.string().describe('The name of the resource'),
        resourceKind: z.string().describe('The kind of the resource'),
      }),
      output: z => z.object({
        events: z.array(z.object({
          metadata: z.object({
            name: z.string().optional().describe('The name of the event'),
            namespace: z.string().optional().describe('The namespace of the event'),
            creationTimestamp: z.string().optional().describe('When the event was created'),
          }),
          involvedObject: z.object({
            kind: z.string().optional().describe('The kind of the involved object'),
            name: z.string().optional().describe('The name of the involved object'),
            namespace: z.string().optional().describe('The namespace of the involved object'),
          }),
          reason: z.string().optional().describe('The reason for the event'),
          message: z.string().optional().describe('The event message'),
          type: z.string().optional().describe('The event type'),
          firstTimestamp: z.string().optional().describe('When the event first occurred'),
          lastTimestamp: z.string().optional().describe('When the event last occurred'),
          count: z.number().optional().describe('How many times the event occurred'),
        })),
      }),
    },
    action: async ({ input }) => {
      try {
        const result = await service.getEvents(input);
        // Convert events to plain objects and ensure required fields are present
        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        throw new Error(`Failed to get Crossplane events: ${error}`);
      }
    },
  });

  // Get Crossplane Resource Graph (V1)
  actionsRegistry.register({
    name: 'get_crossplane_resource_graph',
    title: 'Get Crossplane Resource Graph',
    description: 'Returns a graph of related Crossplane resources (V1 API)',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the cluster'),
        namespace: z.string().describe('The namespace of the resource'),
        xrdName: z.string().describe('The name of the XRD'),
        xrdId: z.string().describe('The ID of the XRD'),
        claimId: z.string().describe('The ID of the claim'),
        claimName: z.string().describe('The name of the claim'),
        claimGroup: z.string().describe('The API group of the claim'),
        claimVersion: z.string().describe('The API version of the claim'),
        claimPlural: z.string().describe('The plural name of the claim'),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).describe('The resources in the graph'),
      }),
    },
    action: async ({ input }) => {
      try {
        const result = await service.getResourceGraph(input);
        // Convert resources to plain objects
        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        throw new Error(`Failed to get Crossplane resource graph: ${error}`);
      }
    },
  });

  // Get Crossplane Resource Graph (V2)
  actionsRegistry.register({
    name: 'get_crossplane_v2_resource_graph',
    title: 'Get Crossplane V2 Resource Graph',
    description: 'Returns a graph of related Crossplane resources (V2 API)',
    schema: {
      input: z => z.object({
        clusterName: z.string().describe('The name of the cluster'),
        namespace: z.string().describe('The namespace of the resource'),
        name: z.string().describe('The name of the resource'),
        group: z.string().describe('The API group of the resource'),
        version: z.string().describe('The API version of the resource'),
        plural: z.string().describe('The plural name of the resource'),
        scope: z.enum(['Namespaced', 'Cluster']).describe('The scope of the resource'),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).describe('The resources in the graph'),
      }),
    },
    action: async ({ input }) => {
      try {
        const result = await service.getV2ResourceGraph(input);
        // Convert resources to plain objects
        const plainResult = JSON.parse(JSON.stringify(result));
        return {
          output: plainResult,
        };
      } catch (error) {
        throw new Error(`Failed to get Crossplane V2 resource graph: ${error}`);
      }
    },
  });
}
