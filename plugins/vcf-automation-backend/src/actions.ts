import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { VcfAutomationService } from './services/VcfAutomationService';

export function registerMcpActions(actionsRegistry: typeof actionsRegistryServiceRef.T, service: VcfAutomationService) {
  // Get VCFA Instances
  actionsRegistry.register({
    name: 'get_vcfa_instances',
    title: 'Get VCFA Instances',
    description: 'Returns the configured VCFA instances within Backstage',
    schema: {
      input: z => z.object({}),
      output: z => z.object({
        instances: z.array(z.object({
          name: z.string().describe('The name of the VCFA instance'),
          url: z.string().describe('The base URL of the VCFA instance'),
          tenant: z.string().optional().describe('The tenant name if applicable'),
          version: z.number().describe('The major version of the VCFA instance'),
          tenantType: z.enum(['vm-apps', 'all-apps']).optional().describe('The tenant type if applicable'),
        })),
      }),
    },
    action: async () => {
      // We can access the instances directly from the service's private field
      // since we're in the same package
      const instances = (service as any).instances;
      return {
        output: {
          instances: instances.map((instance: any) => ({
            name: instance.name,
            url: instance.baseUrl,
            tenant: instance.orgName,
            version: instance.majorVersion,
            tenantType: instance.organizationType,
          })),
        },
      };
    },
  });

  // Get VCFA Projects
  actionsRegistry.register({
    name: 'get_vcfa_projects',
    title: 'Get VCFA Projects',
    description: 'Lists the projects in a VCFA instance',
    schema: {
      input: z => z.object({
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        projects: z.array(z.object({
          id: z.string().describe('The ID of the project'),
          name: z.string().describe('The name of the project'),
        })),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getProjects(input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          projects: result.content.map((project: any) => ({
            id: project.id,
            name: project.name,
          })),
        },
      };
    },
  });

  // Get VCFA Project Details
  actionsRegistry.register({
    name: 'get_vcfa_project_details',
    title: 'Get VCFA Project Details',
    description: 'Returns detailed information about a specific VCFA project',
    schema: {
      input: z => z.object({
        projectId: z.string().describe('The ID of the project'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        project: z.object({}).passthrough().describe('The full project details'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getProjectDetails(input.projectId, input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          project: result,
        },
      };
    },
  });

  // Get Supervisor Namespaces
  actionsRegistry.register({
    name: 'get_supervisor_namespaces',
    title: 'Get Supervisor Namespaces',
    description: 'Lists all supervisor namespaces in a VCFA instance',
    schema: {
      input: z => z.object({
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        namespaces: z.array(z.object({}).passthrough()).describe('List of supervisor namespaces'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getSupervisorNamespaces(input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          namespaces: result.items || [],
        },
      };
    },
  });

  // Get Supervisor Namespace Details
  actionsRegistry.register({
    name: 'get_supervisor_namespace',
    title: 'Get Supervisor Namespace Details',
    description: 'Returns detailed information about a specific supervisor namespace',
    schema: {
      input: z => z.object({
        namespaceId: z.string().describe('The ID of the supervisor namespace'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        namespace: z.object({}).passthrough().describe('The full namespace details'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getSupervisorNamespace(input.namespaceId, input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          namespace: result,
        },
      };
    },
  });

  // Get Deployments
  actionsRegistry.register({
    name: 'get_deployments',
    title: 'Get Deployments',
    description: 'Lists all deployments in a VCFA instance',
    schema: {
      input: z => z.object({
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        deployments: z.array(z.object({}).passthrough()).describe('List of deployments'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getDeployments(input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          deployments: result.content || [],
        },
      };
    },
  });

  // Get Deployment Details
  actionsRegistry.register({
    name: 'get_deployment_details',
    title: 'Get Deployment Details',
    description: 'Returns detailed information about a specific deployment',
    schema: {
      input: z => z.object({
        deploymentId: z.string().describe('The ID of the deployment'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        deployment: z.object({}).passthrough().describe('The full deployment details'),
        history: z.array(z.object({}).passthrough()).describe('The deployment history'),
        events: z.array(z.object({}).passthrough()).describe('The deployment events'),
        resources: z.array(z.object({}).passthrough()).describe('The deployment resources'),
      }),
    },
    action: async ({ input }) => {
      const [details, history, events, resources] = await Promise.all([
        service.getDeploymentDetails(input.deploymentId, input.instanceName),
        service.getDeploymentHistory(input.deploymentId, input.instanceName),
        service.getDeploymentEvents(input.deploymentId, input.instanceName),
        service.getDeploymentResources(input.deploymentId, input.instanceName),
      ]);

      if ('error' in details) throw new Error(details.error);
      if ('error' in history) throw new Error(history.error);
      if ('error' in events) throw new Error(events.error);
      if ('error' in resources) throw new Error(resources.error);

      return {
        output: {
          deployment: details,
          history: history.content || [],
          events: events.content || [],
          resources: resources.content || [],
        },
      };
    },
  });

  // VM Power Management (unified for both standalone and deployment-managed VMs)
  actionsRegistry.register({
    name: 'vm_power_action',
    title: 'VM Power Action',
    description: 'Execute power actions (power on/off) on VMs, supporting both standalone and deployment-managed VMs',
    schema: {
      input: z => z.object({
        // Common parameters
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
        action: z.enum(['PowerOn', 'PowerOff']).describe('The power action to execute'),
        
        // For deployment-managed VMs
        resourceId: z.string().optional().describe('The resource ID of the deployment-managed VM'),
        
        // For standalone VMs
        namespaceUrnId: z.string().optional().describe('The URN ID of the namespace containing the standalone VM'),
        namespaceName: z.string().optional().describe('The name of the namespace containing the standalone VM'),
        vmName: z.string().optional().describe('The name of the standalone VM'),
      }),
      output: z => z.object({
        success: z.boolean().describe('Whether the power action was executed successfully'),
        message: z.string().describe('Status message or error details'),
        details: z.object({}).passthrough().optional().describe('Additional details about the operation'),
      }),
    },
    action: async ({ input }) => {
      try {
        // Validate input
        const hasDeploymentVm = input.resourceId !== undefined;
        const hasStandaloneVm = input.namespaceUrnId !== undefined && 
                               input.namespaceName !== undefined && 
                               input.vmName !== undefined;
        
        if (hasDeploymentVm === hasStandaloneVm) {
          throw new Error('Must provide either resourceId for deployment VMs OR (namespaceUrnId, namespaceName, vmName) for standalone VMs');
        }

        // Handle deployment-managed VMs
        if (input.resourceId) {
          // First check if the action is available
          const checkResult = await service.checkVmPowerAction(
            input.resourceId,
            input.action,
            input.instanceName,
          );

          if ('error' in checkResult) {
            return {
              output: {
                success: false,
                message: checkResult.error,
              },
            };
          }

          // Execute the power action
          const result = await service.executeVmPowerAction(
            input.resourceId,
            input.action,
            input.instanceName,
          );

          if ('error' in result) {
            return {
              output: {
                success: false,
                message: result.error,
              },
            };
          }

          return {
            output: {
              success: true,
              message: `Successfully executed ${input.action} on deployment VM`,
              details: result,
            },
          };
        }
        
        // Handle standalone VMs
        else {
          // First get current VM status
          const vmStatus = await service.getStandaloneVmStatus(
            input.namespaceUrnId!,
            input.namespaceName!,
            input.vmName!,
            input.instanceName,
          );

          if ('error' in vmStatus) {
            return {
              output: {
                success: false,
                message: vmStatus.error,
              },
            };
          }

          // Execute the power action
          const result = await service.executeStandaloneVmPowerAction(
            input.namespaceUrnId!,
            input.namespaceName!,
            input.vmName!,
            input.action === 'PowerOn' ? 'PoweredOn' : 'PoweredOff',
            vmStatus,
            input.instanceName,
          );

          if ('error' in result) {
            return {
              output: {
                success: false,
                message: result.error,
              },
            };
          }

          return {
            output: {
              success: true,
              message: `Successfully executed ${input.action} on standalone VM ${input.vmName}`,
              details: result,
            },
          };
        }
      } catch (error) {
        return {
          output: {
            success: false,
            message: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  });

  // Get Resource Details
  actionsRegistry.register({
    name: 'get_resource_details',
    title: 'Get Resource Details',
    description: 'Get details of a specific resource in a deployment',
    schema: {
      input: z => z.object({
        deploymentId: z.string().describe('The ID of the deployment'),
        resourceId: z.string().describe('The ID of the resource'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resource: z.object({}).passthrough().describe('The full resource details'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getResourceDetails(input.deploymentId, input.resourceId, input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          resource: result,
        },
      };
    },
  });

  // Get Supervisor Resources
  actionsRegistry.register({
    name: 'get_supervisor_resources',
    title: 'Get Supervisor Resources',
    description: 'List all supervisor resources',
    schema: {
      input: z => z.object({
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resources: z.array(z.object({}).passthrough()).describe('List of supervisor resources'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getSupervisorResources(input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          resources: result.content || [],
        },
      };
    },
  });

  // Get Supervisor Resource
  actionsRegistry.register({
    name: 'get_supervisor_resource',
    title: 'Get Supervisor Resource',
    description: 'Get details of a specific supervisor resource',
    schema: {
      input: z => z.object({
        resourceId: z.string().describe('The ID of the supervisor resource'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        resource: z.object({}).passthrough().describe('The full supervisor resource details'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getSupervisorResource(input.resourceId, input.instanceName);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          resource: result,
        },
      };
    },
  });

  // Get Supervisor Resource Manifest
  actionsRegistry.register({
    name: 'get_supervisor_resource_manifest',
    title: 'Get Supervisor Resource Manifest',
    description: 'Get manifest of a supervisor resource',
    schema: {
      input: z => z.object({
        namespaceUrnId: z.string().describe('The URN ID of the namespace'),
        namespaceName: z.string().describe('The name of the namespace'),
        resourceName: z.string().describe('The name of the resource'),
        apiVersion: z.string().describe('The API version of the resource'),
        kind: z.string().describe('The kind of the resource'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        manifest: z.object({}).passthrough().describe('The full resource manifest'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.getSupervisorResourceManifest(
        input.namespaceUrnId,
        input.namespaceName,
        input.resourceName,
        input.apiVersion,
        input.kind,
        input.instanceName,
      );
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          manifest: result,
        },
      };
    },
  });

  // Update Supervisor Resource Manifest
  actionsRegistry.register({
    name: 'update_supervisor_resource_manifest',
    title: 'Update Supervisor Resource Manifest',
    description: 'Update manifest of a supervisor resource',
    schema: {
      input: z => z.object({
        namespaceUrnId: z.string().describe('The URN ID of the namespace'),
        namespaceName: z.string().describe('The name of the namespace'),
        resourceName: z.string().describe('The name of the resource'),
        apiVersion: z.string().describe('The API version of the resource'),
        kind: z.string().describe('The kind of the resource'),
        manifest: z.object({}).passthrough().describe('The updated manifest to apply'),
        instanceName: z.string().optional().describe('The name of the VCFA instance. If not provided, uses the default instance.'),
      }),
      output: z => z.object({
        success: z.boolean().describe('Whether the update was successful'),
        manifest: z.object({}).passthrough().describe('The updated resource manifest'),
      }),
    },
    action: async ({ input }) => {
      const result = await service.updateSupervisorResourceManifest(
        input.namespaceUrnId,
        input.namespaceName,
        input.resourceName,
        input.apiVersion,
        input.kind,
        input.manifest,
        input.instanceName,
      );
      if ('error' in result) {
        throw new Error(result.error);
      }
      return {
        output: {
          success: true,
          manifest: result,
        },
      };
    },
  });
}