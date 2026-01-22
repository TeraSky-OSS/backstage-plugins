import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { CatalogApi } from '@backstage/catalog-client';
import { InputError } from '@backstage/errors';
import { ScaleOpsService } from './service/ScaleOpsService';
import { AuthService } from '@backstage/backend-plugin-api';

export function registerMcpActions(
  actionsRegistry: typeof actionsRegistryServiceRef.T,
  service: ScaleOpsService,
  catalogApi: CatalogApi,
  auth: AuthService
) {
  // Get ScaleOps Data for Entity
  actionsRegistry.register({
    name: 'get_scaleops_data_for_entity',
    title: 'Get ScaleOps Data for Backstage Entity',
    description: 'Returns ScaleOps workload data for a specific Backstage catalog entity (component) based on its kubernetes label selector annotation',
    schema: {
      input: z => z.object({
        entityRef: z.string().describe('The entity reference (e.g., "component:default/my-service")'),
      }),
      output: z => z.object({
        entity: z.object({
          name: z.string().describe('Entity name'),
          namespace: z.string().describe('Entity namespace'),
          kind: z.string().describe('Entity kind'),
        }).describe('The entity information'),
        workloads: z.array(z.object({
          clusterName: z.string().describe('Cluster name'),
          namespace: z.string().describe('Kubernetes namespace'),
          workloadName: z.string().describe('Workload name'),
          type: z.string().describe('Workload type'),
          policyName: z.string().describe('ScaleOps policy'),
          auto: z.boolean().describe('Automation enabled'),
          cpuRequests: z.number().describe('CPU requests (millicores)'),
          memRequests: z.number().describe('Memory requests (bytes)'),
          cpuRecommended: z.number().describe('Recommended CPU'),
          memRecommended: z.number().describe('Recommended memory'),
          isUnderProvisioned: z.boolean().describe('Under-provisioned'),
          isOverProvisioned: z.boolean().describe('Over-provisioned'),
          savingsAvailable: z.number().describe('Available savings'),
          activeSavings: z.number().describe('Active savings'),
          dashboardUrl: z.string().nullable().describe('ScaleOps dashboard URL (if enabled)'),
        })).describe('Workloads associated with this entity'),
        summary: z.object({
          totalWorkloads: z.number().describe('Total workloads found'),
          totalSavingsAvailable: z.number().describe('Sum of available savings'),
          totalActiveSavings: z.number().describe('Sum of active savings'),
          automatedWorkloads: z.number().describe('Number of automated workloads'),
          overProvisionedCount: z.number().describe('Number of over-provisioned workloads'),
          underProvisionedCount: z.number().describe('Number of under-provisioned workloads'),
        }).describe('Summary metrics'),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });
        
        // Get the entity from catalog
        const entity = await catalogApi.getEntityByRef(
          input.entityRef,
          { token }
        );

        if (!entity) {
          throw new InputError(`Entity not found: ${input.entityRef}`);
        }

        // Get the kubernetes label selector annotation
        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        
        if (!labelSelector) {
          throw new InputError(`Entity ${input.entityRef} does not have the 'backstage.io/kubernetes-label-selector' annotation`);
        }

        // Query ScaleOps with the labels
        const labels = labelSelector.split(',');
        const data = await service.getWorkloadsByLabels(labels, true, 'AND');

        if (!data.workloads || !Array.isArray(data.workloads)) {
          return {
            output: {
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace || 'default',
                kind: entity.kind,
              },
              workloads: [],
              summary: {
                totalWorkloads: 0,
                totalSavingsAvailable: 0,
                totalActiveSavings: 0,
                automatedWorkloads: 0,
                overProvisionedCount: 0,
                underProvisionedCount: 0,
              },
            },
          };
        }

        // Map workloads to include dashboard URLs
        const workloadsWithDashboard = data.workloads.map((w: any) => ({
          ...w,
          dashboardUrl: service.generateDashboardUrl(w.workloadName, labels),
        }));

        // Calculate summary metrics
        const summary = {
          totalWorkloads: data.workloads.length,
          totalSavingsAvailable: data.workloads.reduce((sum: number, w: any) => sum + (w.savingsAvailable || 0), 0),
          totalActiveSavings: data.workloads.reduce((sum: number, w: any) => sum + (w.activeSavings || 0), 0),
          automatedWorkloads: data.workloads.filter((w: any) => w.auto).length,
          overProvisionedCount: data.workloads.filter((w: any) => w.isOverProvisioned).length,
          underProvisionedCount: data.workloads.filter((w: any) => w.isUnderProvisioned).length,
        };

        return {
          output: {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            workloads: workloadsWithDashboard,
            summary,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get ScaleOps data for entity: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Cost Analysis for Entity
  actionsRegistry.register({
    name: 'get_scaleops_cost_analysis_for_entity',
    title: 'Get ScaleOps Cost Analysis for Entity',
    description: 'Returns detailed cost analysis for a Backstage entity over a time period',
    schema: {
      input: z => z.object({
        entityRef: z.string().describe('The entity reference'),
        range: z.enum(['7d', '30d', '90d']).optional().default('7d').describe('Time range'),
      }),
      output: z => z.object({
        entity: z.object({
          name: z.string(),
          namespace: z.string(),
          kind: z.string(),
        }),
        costAnalysis: z.array(z.object({
          workloadName: z.string().describe('Workload name'),
          clusterName: z.string().describe('Cluster name'),
          namespace: z.string().describe('Kubernetes namespace'),
          totalCost: z.number().describe('Total cost over period'),
          hourlyCost: z.number().describe('Hourly cost'),
          spotPercent: z.number().describe('Spot instance percentage'),
          onDemandPercent: z.number().describe('On-demand percentage'),
          savingsAvailable: z.number().describe('Available savings'),
          dashboardUrl: z.string().nullable().describe('ScaleOps dashboard URL (if enabled)'),
        })),
        summary: z.object({
          totalCost: z.number().describe('Total cost across all workloads'),
          averageHourlyCost: z.number().describe('Average hourly cost'),
          totalSavingsAvailable: z.number().describe('Total available savings'),
        }),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });
        
        // Get entity
        const entity = await catalogApi.getEntityByRef(
          input.entityRef,
          { token }
        );

        if (!entity) {
          throw new InputError(`Entity not found: ${input.entityRef}`);
        }

        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        if (!labelSelector) {
          throw new InputError(`Entity ${input.entityRef} does not have kubernetes label selector annotation`);
        }

        // First get workloads to know what to query
        const labels = labelSelector.split(',');
        const workloadsData = await service.getWorkloadsByLabels(labels, true, 'AND');

        if (!workloadsData.workloads || workloadsData.workloads.length === 0) {
          return {
            output: {
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace || 'default',
                kind: entity.kind,
              },
              costAnalysis: [],
              summary: {
                totalCost: 0,
                averageHourlyCost: 0,
                totalSavingsAvailable: 0,
              },
            },
          };
        }

        // Get cost details - Note: The cost endpoint filters differently than the dashboard endpoint
        // and may return more workloads, so we need to filter the results to match the original query
        const firstWorkload = workloadsData.workloads[0];
        const costData = await service.getWorkloadCostDetails(
          firstWorkload.clusterName,
          firstWorkload.namespace,
          firstWorkload.type,
          labels,
          input.range || '7d'
        );

        // Create a Set of workload IDs from the original dashboard query
        // This ensures we only return cost data for workloads that match the entity's labels with AND logic
        const validWorkloadIds = new Set(workloadsData.workloads.map((w: any) => w.id.toLowerCase()));

        // Filter cost data to only include workloads from the original query
        const costAnalysis = (costData.aggregatedWorkloads || [])
          .filter((w: any) => validWorkloadIds.has(w.id.toLowerCase()))
          .map((w: any) => ({
            workloadName: w.workloadName || w.id,
            clusterName: firstWorkload.clusterName,
            namespace: firstWorkload.namespace,
            totalCost: w.totalCost || 0,
            hourlyCost: w.hourlyCost || 0,
            spotPercent: w.spotPercent || 0,
            onDemandPercent: w.onDemandPercent || 0,
            savingsAvailable: w.savingsAvailable || 0,
            dashboardUrl: service.generateDashboardUrl(w.workloadName || w.id, labels),
          }));

        const summary = {
          totalCost: costAnalysis.reduce((sum: number, c: any) => sum + c.totalCost, 0),
          averageHourlyCost: costAnalysis.length > 0 
            ? costAnalysis.reduce((sum: number, c: any) => sum + c.hourlyCost, 0) / costAnalysis.length
            : 0,
          totalSavingsAvailable: costAnalysis.reduce((sum: number, c: any) => sum + c.savingsAvailable, 0),
        };

        return {
          output: {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            costAnalysis,
            summary,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get cost analysis: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Optimization Recommendations for Entity
  actionsRegistry.register({
    name: 'get_scaleops_recommendations_for_entity',
    title: 'Get ScaleOps Optimization Recommendations for Entity',
    description: 'Returns optimization recommendations for a Backstage entity',
    schema: {
      input: z => z.object({
        entityRef: z.string().describe('The entity reference'),
        minSavingsThreshold: z.number().optional().default(0).describe('Minimum savings threshold'),
      }),
      output: z => z.object({
        entity: z.object({
          name: z.string(),
          namespace: z.string(),
          kind: z.string(),
        }),
        recommendations: z.array(z.object({
          workloadName: z.string(),
          namespace: z.string(),
          clusterName: z.string(),
          type: z.string(),
          issue: z.enum(['over-provisioned', 'under-provisioned', 'not-automated']).describe('The issue type'),
          currentCPU: z.number(),
          recommendedCPU: z.number(),
          currentMemory: z.number(),
          recommendedMemory: z.number(),
          savingsAvailable: z.number(),
          automated: z.boolean(),
          priority: z.enum(['high', 'medium', 'low']).describe('Recommendation priority'),
          dashboardUrl: z.string().nullable().describe('ScaleOps dashboard URL (if enabled)'),
        })),
        summary: z.object({
          totalRecommendations: z.number(),
          highPriority: z.number(),
          totalPotentialSavings: z.number(),
        }),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });
        
        const entity = await catalogApi.getEntityByRef(
          input.entityRef,
          { token }
        );

        if (!entity) {
          throw new InputError(`Entity not found: ${input.entityRef}`);
        }

        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        if (!labelSelector) {
          throw new InputError(`Entity does not have kubernetes label selector annotation`);
        }

        const labels = labelSelector.split(',');
        const data = await service.getWorkloadsByLabels(labels, true, 'AND');

        if (!data.workloads || data.workloads.length === 0) {
          return {
            output: {
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace || 'default',
                kind: entity.kind,
              },
              recommendations: [],
              summary: {
                totalRecommendations: 0,
                highPriority: 0,
                totalPotentialSavings: 0,
              },
            },
          };
        }

        // Generate recommendations
        const recommendations = data.workloads
          .filter((w: any) => {
            return (w.savingsAvailable || 0) >= (input.minSavingsThreshold || 0) &&
                   (w.isOverProvisioned || w.isUnderProvisioned || !w.auto);
          })
          .map((w: any) => {
            let issue: 'over-provisioned' | 'under-provisioned' | 'not-automated';
            let priority: 'high' | 'medium' | 'low';

            if (w.isUnderProvisioned) {
              issue = 'under-provisioned';
              priority = 'high'; // Under-provisioning is critical
            } else if (w.isOverProvisioned && !w.auto) {
              issue = 'over-provisioned';
              priority = 'high'; // Over-provisioned and not automated
            } else if (!w.auto) {
              issue = 'not-automated';
              priority = 'medium';
            } else {
              issue = 'over-provisioned';
              priority = 'low'; // Over-provisioned but automated
            }

            return {
              workloadName: w.workloadName,
              namespace: w.namespace,
              clusterName: w.clusterName,
              type: w.type,
              issue,
              currentCPU: w.cpuRequests || 0,
              recommendedCPU: w.cpuRecommended || 0,
              currentMemory: w.memRequests || 0,
              recommendedMemory: w.memRecommended || 0,
              savingsAvailable: w.savingsAvailable || 0,
              automated: w.auto || false,
              priority,
              dashboardUrl: service.generateDashboardUrl(w.workloadName, labels),
            };
          })
          .sort((a: any, b: any) => {
            // Sort by priority then by savings
            const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return b.savingsAvailable - a.savingsAvailable;
          });

        const summary = {
          totalRecommendations: recommendations.length,
          highPriority: recommendations.filter((r: any) => r.priority === 'high').length,
          totalPotentialSavings: recommendations.reduce((sum: number, r: any) => sum + r.savingsAvailable, 0),
        };

        return {
          output: {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            recommendations,
            summary,
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get recommendations: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Network Usage for a Backstage Entity
  actionsRegistry.register({
    name: 'get_scaleops_network_usage_for_entity',
    title: 'Get ScaleOps Network Usage for a Backstage Entity',
    description: 'Retrieves network usage and cost data for workloads associated with a Backstage component. Shows traffic patterns, costs (total, intra-AZ, cross-AZ), and destination workload information.',
    schema: {
      input: z => z.object({
        entityRef: z.string().describe('The Backstage entity reference (e.g., "component:default/my-service")'),
        workloadName: z.string().optional().describe('Optional: Get network usage for a specific workload only. If omitted, returns data for all workloads.'),
        timeRangeHours: z.number().optional().default(24).describe('Time range in hours to analyze network usage (default: 24 hours)'),
      }),
      output: z => z.object({
        entity: z.object({
          name: z.string(),
          namespace: z.string(),
          kind: z.string(),
        }),
        workloadNetworkData: z.array(z.object({
          workloadName: z.string().describe('Name of the workload'),
          clusterName: z.string().describe('Cluster name'),
          namespace: z.string().describe('Kubernetes namespace'),
          networkCostEnabled: z.boolean().describe('Whether network cost tracking is enabled for this cluster'),
          dashboardUrl: z.string().nullable().describe('ScaleOps dashboard URL (if enabled)'),
          destinations: z.array(z.object({
            Name: z.string().describe('Destination workload name'),
            Namespace: z.string().describe('Destination namespace'),
            WorkloadType: z.string().describe('Destination workload type'),
            totalCost: z.object({
              total: z.number().describe('Total cost'),
              egress: z.number().describe('Egress cost'),
              ingress: z.number().describe('Ingress cost'),
            }).describe('Total network costs'),
            intraAZCost: z.object({
              total: z.number().describe('Total cost'),
              egress: z.number().describe('Egress cost'),
              ingress: z.number().describe('Ingress cost'),
            }).describe('Intra-AZ network costs'),
            crossAZCost: z.object({
              total: z.number().describe('Total cost'),
              egress: z.number().describe('Egress cost'),
              ingress: z.number().describe('Ingress cost'),
            }).describe('Cross-AZ network costs'),
            replicas: z.number().describe('Number of replicas'),
            totalTraffic: z.object({
              total: z.number().describe('Total traffic in bytes'),
              egress: z.number().describe('Egress traffic in bytes'),
              ingress: z.number().describe('Ingress traffic in bytes'),
            }).describe('Total network traffic'),
            intraAZTraffic: z.object({
              total: z.number().describe('Total traffic in bytes'),
              egress: z.number().describe('Egress traffic in bytes'),
              ingress: z.number().describe('Ingress traffic in bytes'),
            }).describe('Intra-AZ network traffic'),
            crossAZTraffic: z.object({
              total: z.number().describe('Total traffic in bytes'),
              egress: z.number().describe('Egress traffic in bytes'),
              ingress: z.number().describe('Ingress traffic in bytes'),
            }).describe('Cross-AZ network traffic'),
          })).describe('List of network destinations and their usage/cost data'),
        })),
        summary: z.object({
          totalWorkloads: z.number().describe('Total number of workloads analyzed'),
          totalNetworkCost: z.number().describe('Total network cost across all workloads'),
          totalTraffic: z.number().describe('Total traffic in bytes across all workloads'),
        }),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });
        
        const entity = await catalogApi.getEntityByRef(
          input.entityRef,
          { token }
        );

        if (!entity) {
          throw new InputError(`Entity not found: ${input.entityRef}`);
        }

        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        if (!labelSelector) {
          throw new InputError(`Entity ${input.entityRef} does not have kubernetes label selector annotation`);
        }

        // Get workloads for the entity
        const labels = labelSelector.split(',');
        const workloadsData = await service.getWorkloadsByLabels(labels, true, 'AND');

        if (!workloadsData.workloads || workloadsData.workloads.length === 0) {
          return {
            output: {
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace || 'default',
                kind: entity.kind,
              },
              workloadNetworkData: [],
              summary: {
                totalWorkloads: 0,
                totalNetworkCost: 0,
                totalTraffic: 0,
              },
            },
          };
        }

        // Filter workloads if specific workload name is provided
        let targetWorkloads = workloadsData.workloads;
        if (input.workloadName) {
          targetWorkloads = workloadsData.workloads.filter(
            (w: any) => w.workloadName === input.workloadName
          );
          if (targetWorkloads.length === 0) {
            throw new InputError(`Workload "${input.workloadName}" not found for entity ${input.entityRef}`);
          }
        }

        // Get network usage for each workload
        const workloadNetworkData = await Promise.all(
          targetWorkloads.map(async (workload: any) => {
            try {
              // Check if network cost is enabled for this cluster
              const networkCostCheck = await service.checkNetworkCostEnabled(true);
              const networkCostEnabled = networkCostCheck.networkCostEnabled?.[workload.clusterName] || false;

              if (!networkCostEnabled) {
                return {
                  workloadName: workload.workloadName,
                  clusterName: workload.clusterName,
                  namespace: workload.namespace,
                  networkCostEnabled: false,
                  dashboardUrl: service.generateDashboardUrl(workload.workloadName, labels),
                  destinations: [],
                };
              }

              // Get network usage data
              const now = Date.now();
              const from = now - (input.timeRangeHours || 24) * 60 * 60 * 1000;
              const to = now;
              
              const networkData = await service.getWorkloadNetworkUsage(
                workload.clusterName,
                workload.namespace,
                workload.workloadName,
                workload.type,
                from,
                to
              );

              // Handle different response formats
              let destinations = [];
              if (Array.isArray(networkData)) {
                destinations = networkData;
              } else if (networkData && typeof networkData === 'object') {
                destinations = networkData.destinations || [];
              }

              return {
                workloadName: workload.workloadName,
                clusterName: workload.clusterName,
                namespace: workload.namespace,
                networkCostEnabled: true,
                dashboardUrl: service.generateDashboardUrl(workload.workloadName, labels),
                destinations: destinations,
              };
            } catch (error) {
              // If network data fetch fails, return empty destinations
              return {
                workloadName: workload.workloadName,
                clusterName: workload.clusterName,
                namespace: workload.namespace,
                networkCostEnabled: false,
                dashboardUrl: service.generateDashboardUrl(workload.workloadName, labels),
                destinations: [],
              };
            }
          })
        );

        // Calculate summary
        let totalNetworkCost = 0;
        let totalTraffic = 0;

        workloadNetworkData.forEach((wn: any) => {
          wn.destinations.forEach((dest: any) => {
            totalNetworkCost += dest.totalCost?.total || 0;
            totalTraffic += dest.totalTraffic?.total || 0;
          });
        });

        return {
          output: {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            workloadNetworkData,
            summary: {
              totalWorkloads: targetWorkloads.length,
              totalNetworkCost,
              totalTraffic,
            },
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get network usage: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });

  // Get Policy Definitions for Entity Workloads
  actionsRegistry.register({
    name: 'get_scaleops_policy_definitions_for_entity',
    title: 'Get ScaleOps Policy Definitions for Entity Workloads',
    description: 'Retrieves the ScaleOps policy definitions applied to workloads associated with a Backstage component.',
    schema: {
      input: z => z.object({
        entityRef: z.string().describe('The Backstage entity reference (e.g., "component:default/my-service")'),
        workloadName: z.string().optional().describe('Optional: Get policy for a specific workload only. If omitted, returns policies for all workloads.'),
      }),
      output: z => z.object({
        entity: z.object({
          name: z.string(),
          namespace: z.string(),
          kind: z.string(),
        }),
        workloadPolicies: z.array(z.object({
          workloadName: z.string().describe('Name of the workload'),
          clusterName: z.string().describe('Cluster name'),
          namespace: z.string().describe('Kubernetes namespace'),
          policyName: z.string().describe('Name of the applied policy'),
          policyDefinition: z.any().nullable().describe('The full policy definition (Kubernetes CRD format)'),
        })),
        summary: z.object({
          totalWorkloads: z.number().describe('Total number of workloads'),
          workloadsWithPolicies: z.number().describe('Number of workloads with policies'),
          uniquePolicies: z.array(z.string()).describe('List of unique policy names'),
        }),
      }),
    },
    action: async ({ input, credentials }) => {
      try {
        const creds = credentials || await auth.getOwnServiceCredentials();
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: creds,
          targetPluginId: 'catalog',
        });
        
        const entity = await catalogApi.getEntityByRef(
          input.entityRef,
          { token }
        );

        if (!entity) {
          throw new InputError(`Entity not found: ${input.entityRef}`);
        }

        const labelSelector = entity.metadata.annotations?.['backstage.io/kubernetes-label-selector'];
        if (!labelSelector) {
          throw new InputError(`Entity ${input.entityRef} does not have kubernetes label selector annotation`);
        }

        // Get workloads for the entity
        const labels = labelSelector.split(',');
        const workloadsData = await service.getWorkloadsByLabels(labels, true, 'AND');

        if (!workloadsData.workloads || workloadsData.workloads.length === 0) {
          return {
            output: {
              entity: {
                name: entity.metadata.name,
                namespace: entity.metadata.namespace || 'default',
                kind: entity.kind,
              },
              workloadPolicies: [],
              summary: {
                totalWorkloads: 0,
                workloadsWithPolicies: 0,
                uniquePolicies: [],
              },
            },
          };
        }

        // Filter workloads if specific workload name is provided
        let targetWorkloads = workloadsData.workloads;
        if (input.workloadName) {
          targetWorkloads = workloadsData.workloads.filter(
            (w: any) => w.workloadName === input.workloadName
          );
          if (targetWorkloads.length === 0) {
            throw new InputError(`Workload "${input.workloadName}" not found for entity ${input.entityRef}`);
          }
        }

        // Get policy definitions for each workload
        const workloadPolicies = await Promise.all(
          targetWorkloads.map(async (workload: any) => {
            let policyDefinition = null;
            
            if (workload.policyName && workload.policyName !== 'N/A') {
              try {
                policyDefinition = await service.getPolicyByName(
                  workload.policyName,
                  workload.clusterName
                );
              } catch (error) {
                // If policy fetch fails, just set to null
                policyDefinition = null;
              }
            }

            return {
              workloadName: workload.workloadName,
              clusterName: workload.clusterName,
              namespace: workload.namespace,
              policyName: workload.policyName || 'N/A',
              policyDefinition,
            };
          })
        );

        // Calculate summary
        const workloadsWithPolicies = workloadPolicies.filter(
          wp => wp.policyDefinition !== null
        ).length;

        const uniquePolicies = [...new Set(
          workloadPolicies
            .map(wp => wp.policyName)
            .filter(name => name && name !== 'N/A')
        )];

        return {
          output: {
            entity: {
              name: entity.metadata.name,
              namespace: entity.metadata.namespace || 'default',
              kind: entity.kind,
            },
            workloadPolicies,
            summary: {
              totalWorkloads: targetWorkloads.length,
              workloadsWithPolicies,
              uniquePolicies,
            },
          },
        };
      } catch (error) {
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(`Failed to get policy definitions: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  });
}

