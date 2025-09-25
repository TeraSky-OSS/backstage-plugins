import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { VcfOperationsService } from './services/VcfOperationsService';

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: VcfOperationsService) {
  // Get VCF Operations Instances
  actionsRegistry.register({
    name: 'get_vcf_operations_instances',
    title: 'Get VCF Operations Instances',
    description: 'Returns the configured VCF Operations instances within Backstage',
    schema: {
      input: z => z.object({}),
      output: z => z.object({
        instances: z.array(z.object({
          name: z.string().describe('The name of the VCF Operations instance'),
          relatedVCFAInstances: z.array(z.string()).optional().describe('Related VCFA instances'),
        })),
      }),
    },
    action: async () => {
      const instances = service.getInstances();
      return {
        output: {
          instances,
        },
      };
    },
  });

  // Get Resource Metrics
  actionsRegistry.register({
    name: 'get_vcf_operations_resource_metrics',
    title: 'Get VCF Operations Resource Metrics',
    description: 'Get metrics for a specific resource in VCF Operations',
    schema: {
      input: z => z.object({
        resourceId: z.string().describe('The ID of the resource'),
        statKeys: z.array(z.string()).describe('The metric keys to retrieve'),
        begin: z.number().optional().describe('Start timestamp in milliseconds'),
        end: z.number().optional().describe('End timestamp in milliseconds'),
        rollUpType: z.string().optional().describe('Roll-up type (e.g., AVERAGE)'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        values: z.array(z.object({
          resourceId: z.string(),
          stat: z.object({
            statKey: z.object({
              key: z.string(),
            }),
            timestamps: z.array(z.number()),
            data: z.array(z.number()),
          }),
        })),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getResourceMetrics(
        input.resourceId,
        input.statKeys,
        input.begin,
        input.end,
        input.rollUpType,
        input.instanceName,
      );
      return {
        output: result,
      };
    },
  });

  // Get Latest Resource Metrics
  actionsRegistry.register({
    name: 'get_latest_vcf_operations_resource_metrics',
    title: 'Get Latest VCF Operations Resource Metrics',
    description: 'Get the latest metrics for specific resources in VCF Operations',
    schema: {
      input: z => z.object({
        resourceIds: z.array(z.string()).describe('The IDs of the resources'),
        statKeys: z.array(z.string()).describe('The metric keys to retrieve'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        values: z.array(z.object({
          resourceId: z.string(),
          stat: z.object({
            statKey: z.object({
              key: z.string(),
            }),
            timestamps: z.array(z.number()),
            data: z.array(z.number()),
          }),
        })),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getLatestResourceMetrics(
        input.resourceIds,
        input.statKeys,
        input.instanceName,
      );
      return {
        output: result,
      };
    },
  });

  // Get Resource Details
  actionsRegistry.register({
    name: 'get_vcf_operations_resource_details',
    title: 'Get VCF Operations Resource Details',
    description: 'Get detailed information about a specific resource in VCF Operations',
    schema: {
      input: z => z.object({
        resourceId: z.string().describe('The ID of the resource'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resource: z.object({}).passthrough().describe('The full resource details'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getResourceDetails(input.resourceId, input.instanceName);
      return {
        output: {
          resource: result,
        },
      };
    },
  });

  // Get Available Metrics
  actionsRegistry.register({
    name: 'get_available_metrics_from_vcf_operations',
    title: 'Get Available Metrics from VCF Operations',
    description: 'Get available metrics for a specific resource in VCF Operations',
    schema: {
      input: z => z.object({
        resourceId: z.string().describe('The ID of the resource'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        metrics: z.array(z.object({}).passthrough()).describe('List of available metrics'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getAvailableMetrics(input.resourceId, input.instanceName);
      return {
        output: {
          metrics: result['stat-key'] || [],
        },
      };
    },
  });

  // Search Resources
  actionsRegistry.register({
    name: 'search_vcf_operations_resources',
    title: 'Search VCF Operations Resources',
    description: 'Search for resources by name, adapter kind, and resource kind in VCF Operations',
    schema: {
      input: z => z.object({
        name: z.string().optional().describe('Resource name to search for'),
        adapterKind: z.string().optional().describe('Adapter kind to filter by'),
        resourceKind: z.string().optional().describe('Resource kind to filter by'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).describe('List of matching resources'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.searchResources(
        input.name,
        input.adapterKind,
        input.resourceKind,
        input.instanceName,
      );
      return {
        output: {
          resources: result.resourceList || [],
        },
      };
    },
  });

  // Find Resource By Name
  actionsRegistry.register({
    name: 'find_vcf_operations_resource_by_name',
    title: 'Find VCF Operations Resource By Name',
    description: 'Find a resource by its name and optionally by type in VCF Operations',
    schema: {
      input: z => z.object({
        resourceName: z.string().describe('The name of the resource to find'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
        resourceType: z.enum(['project', 'vm', 'supervisor-namespace', 'cluster']).optional().describe('The type of resource to find'),
      }),
      output: z => z.object({
        resource: z.object({}).passthrough().nullable().describe('The found resource or null if not found'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.findResourceByName(
        input.resourceName,
        input.instanceName,
        input.resourceType,
      );
      return {
        output: {
          resource: result ? { ...result } : null,
        },
      };
    },
  });

  // Find Resource By Property
  actionsRegistry.register({
    name: 'find_vcf_operations_resource_by_property',
    title: 'Find Resource By Property',
    description: 'Find a resource by a specific property value',
    schema: {
      input: z => z.object({
        propertyKey: z.string().describe('The property key to search by'),
        propertyValue: z.string().describe('The property value to search for'),
        instanceName: z.string().optional().describe('The name of the VCF Operations instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resource: z.object({}).passthrough().nullable().describe('The found resource or null if not found'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.findResourceByProperty(
        input.propertyKey,
        input.propertyValue,
        input.instanceName,
      );
      return {
        output: {
          resource: result ? { ...result } : null,
        },
      };
    },
  });
}
