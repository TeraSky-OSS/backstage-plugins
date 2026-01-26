import { registerMcpActions } from './actions';
import { InputError } from '@backstage/errors';
import { VcfAutomationService } from './services/VcfAutomationService';

describe('registerMcpActions', () => {
  const mockActionsRegistry = {
    register: jest.fn(),
  };

  const mockService = {
    getProjects: jest.fn(),
    getProjectDetails: jest.fn(),
    getDeployments: jest.fn(),
    getDeploymentDetails: jest.fn(),
    getDeploymentHistory: jest.fn(),
    getDeploymentEvents: jest.fn(),
    getDeploymentResources: jest.fn(),
    getSupervisorNamespaces: jest.fn(),
    getSupervisorNamespace: jest.fn(),
    getSupervisorResources: jest.fn(),
    getSupervisorResource: jest.fn(),
    getResourceDetails: jest.fn(),
    checkVmPowerAction: jest.fn(),
    executeVmPowerAction: jest.fn(),
    getStandaloneVmStatus: jest.fn(),
    executeStandaloneVmPowerAction: jest.fn(),
    getSupervisorResourceManifest: jest.fn(),
    updateSupervisorResourceManifest: jest.fn(),
    instances: [
      {
        name: 'test-instance',
        baseUrl: 'http://vcfa.example.com',
        orgName: 'test-tenant',
        majorVersion: 8,
        organizationType: 'all-apps',
      },
    ],
  } as unknown as VcfAutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAction = (name: string) => {
    registerMcpActions(mockActionsRegistry as any, mockService);
    return mockActionsRegistry.register.mock.calls.find(
      (call: any[]) => call[0].name === name
    )?.[0];
  };

  it('should register all MCP actions', () => {
    registerMcpActions(mockActionsRegistry as any, mockService);

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_vcf_automation_instances');
    expect(registeredActions).toContain('get_vcf_automation_projects');
    expect(registeredActions).toContain('get_vcf_automation_project_details');
    expect(registeredActions).toContain('get_supervisor_namespaces_from_vcf_automation');
    expect(registeredActions).toContain('get_supervisor_namespace_from_vcf_automation');
    expect(registeredActions).toContain('get_vcf_automation_deployments');
    expect(registeredActions).toContain('get_vcf_automation_deployment_details');
    expect(registeredActions).toContain('vm_power_action_from_vcf_automation');
    expect(registeredActions).toContain('get_resource_details_from_vcf_automation');
    expect(registeredActions).toContain('get_supervisor_resources_from_vcf_automation');
    expect(registeredActions).toContain('get_supervisor_resource_from_vcf_automation');
    expect(registeredActions).toContain('get_vcf_automation_supervisor_resource_manifest');
    expect(registeredActions).toContain('update_vcf_automation_supervisor_resource_manifest');
  });

  describe('get_vcf_automation_instances action', () => {
    it('should return configured instances', async () => {
      const action = getAction('get_vcf_automation_instances');
      const result = await action.action({ credentials: undefined });

      expect(result.output.instances).toHaveLength(1);
      expect(result.output.instances[0].name).toBe('test-instance');
      expect(result.output.instances[0].url).toBe('http://vcfa.example.com');
      expect(result.output.instances[0].tenant).toBe('test-tenant');
      expect(result.output.instances[0].version).toBe(8);
      expect(result.output.instances[0].tenantType).toBe('all-apps');
    });
  });

  describe('get_vcf_automation_projects action', () => {
    it('should return projects successfully', async () => {
      (mockService.getProjects as jest.Mock).mockResolvedValue({
        content: [
          { id: 'project-1', name: 'Project 1' },
          { id: 'project-2', name: 'Project 2' },
        ],
      });

      const action = getAction('get_vcf_automation_projects');
      const result = await action.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.projects).toHaveLength(2);
      expect(result.output.projects[0].name).toBe('Project 1');
    });

    it('should throw InputError on service error response', async () => {
      (mockService.getProjects as jest.Mock).mockResolvedValue({
        error: 'Service unavailable',
      });

      const action = getAction('get_vcf_automation_projects');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getProjects as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_vcf_automation_projects');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_automation_project_details action', () => {
    it('should return project details', async () => {
      (mockService.getProjectDetails as jest.Mock).mockResolvedValue({
        id: 'project-1',
        name: 'Project 1',
        description: 'Test project',
      });

      const action = getAction('get_vcf_automation_project_details');
      const result = await action.action({
        input: { projectId: 'project-1' },
        credentials: undefined,
      });

      expect(result.output.project.name).toBe('Project 1');
    });

    it('should throw InputError on service error response', async () => {
      (mockService.getProjectDetails as jest.Mock).mockResolvedValue({
        error: 'Project not found',
      });

      const action = getAction('get_vcf_automation_project_details');
      await expect(
        action.action({ input: { projectId: 'non-existent' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getProjectDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_vcf_automation_project_details');
      await expect(
        action.action({ input: { projectId: 'project-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_supervisor_namespaces_from_vcf_automation action', () => {
    it('should return supervisor namespaces', async () => {
      (mockService.getSupervisorNamespaces as jest.Mock).mockResolvedValue({
        items: [{ id: 'ns-1', name: 'namespace-1' }],
      });

      const action = getAction('get_supervisor_namespaces_from_vcf_automation');
      const result = await action.action({ input: {}, credentials: undefined });

      expect(result.output.namespaces).toHaveLength(1);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getSupervisorNamespaces as jest.Mock).mockResolvedValue({
        error: 'Failed to fetch namespaces',
      });

      const action = getAction('get_supervisor_namespaces_from_vcf_automation');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getSupervisorNamespaces as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_supervisor_namespaces_from_vcf_automation');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_supervisor_namespace_from_vcf_automation action', () => {
    it('should return namespace details', async () => {
      (mockService.getSupervisorNamespace as jest.Mock).mockResolvedValue({
        id: 'ns-1',
        name: 'namespace-1',
      });

      const action = getAction('get_supervisor_namespace_from_vcf_automation');
      const result = await action.action({
        input: { namespaceId: 'ns-1' },
        credentials: undefined,
      });

      expect(result.output.namespace.name).toBe('namespace-1');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getSupervisorNamespace as jest.Mock).mockResolvedValue({
        error: 'Namespace not found',
      });

      const action = getAction('get_supervisor_namespace_from_vcf_automation');
      await expect(
        action.action({ input: { namespaceId: 'ns-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getSupervisorNamespace as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_supervisor_namespace_from_vcf_automation');
      await expect(
        action.action({ input: { namespaceId: 'ns-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_automation_deployments action', () => {
    it('should return deployments', async () => {
      (mockService.getDeployments as jest.Mock).mockResolvedValue({
        content: [{ id: 'dep-1', name: 'Deployment 1' }],
      });

      const action = getAction('get_vcf_automation_deployments');
      const result = await action.action({ input: {}, credentials: undefined });

      expect(result.output.deployments).toHaveLength(1);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getDeployments as jest.Mock).mockResolvedValue({
        error: 'Failed to fetch deployments',
      });

      const action = getAction('get_vcf_automation_deployments');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getDeployments as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_vcf_automation_deployments');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_automation_deployment_details action', () => {
    it('should return deployment details with history, events, and resources', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockResolvedValue({
        id: 'dep-1',
        name: 'Deployment 1',
      });
      (mockService.getDeploymentHistory as jest.Mock).mockResolvedValue({
        content: [{ id: 'history-1' }],
      });
      (mockService.getDeploymentEvents as jest.Mock).mockResolvedValue({
        content: [{ id: 'event-1' }],
      });
      (mockService.getDeploymentResources as jest.Mock).mockResolvedValue({
        content: [{ id: 'resource-1' }],
      });

      const action = getAction('get_vcf_automation_deployment_details');
      const result = await action.action({
        input: { deploymentId: 'dep-1' },
        credentials: undefined,
      });

      expect(result.output.deployment.name).toBe('Deployment 1');
      expect(result.output.history).toHaveLength(1);
      expect(result.output.events).toHaveLength(1);
      expect(result.output.resources).toHaveLength(1);
    });

    it('should throw InputError on deployment details error', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockResolvedValue({
        error: 'Deployment not found',
      });
      (mockService.getDeploymentHistory as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentEvents as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentResources as jest.Mock).mockResolvedValue({ content: [] });

      const action = getAction('get_vcf_automation_deployment_details');
      await expect(
        action.action({ input: { deploymentId: 'dep-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on history error', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockResolvedValue({ id: 'dep-1' });
      (mockService.getDeploymentHistory as jest.Mock).mockResolvedValue({ error: 'History error' });
      (mockService.getDeploymentEvents as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentResources as jest.Mock).mockResolvedValue({ content: [] });

      const action = getAction('get_vcf_automation_deployment_details');
      await expect(
        action.action({ input: { deploymentId: 'dep-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on events error', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockResolvedValue({ id: 'dep-1' });
      (mockService.getDeploymentHistory as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentEvents as jest.Mock).mockResolvedValue({ error: 'Events error' });
      (mockService.getDeploymentResources as jest.Mock).mockResolvedValue({ content: [] });

      const action = getAction('get_vcf_automation_deployment_details');
      await expect(
        action.action({ input: { deploymentId: 'dep-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on resources error', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockResolvedValue({ id: 'dep-1' });
      (mockService.getDeploymentHistory as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentEvents as jest.Mock).mockResolvedValue({ content: [] });
      (mockService.getDeploymentResources as jest.Mock).mockResolvedValue({ error: 'Resources error' });

      const action = getAction('get_vcf_automation_deployment_details');
      await expect(
        action.action({ input: { deploymentId: 'dep-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getDeploymentDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_vcf_automation_deployment_details');
      await expect(
        action.action({ input: { deploymentId: 'dep-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('vm_power_action_from_vcf_automation action', () => {
    it('should execute power action on deployment VM successfully', async () => {
      (mockService.checkVmPowerAction as jest.Mock).mockResolvedValue({ available: true });
      (mockService.executeVmPowerAction as jest.Mock).mockResolvedValue({ status: 'success' });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: { resourceId: 'res-1', action: 'PowerOn' },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
      expect(result.output.message).toContain('Successfully executed PowerOn');
    });

    it('should return failure when power check fails', async () => {
      (mockService.checkVmPowerAction as jest.Mock).mockResolvedValue({
        error: 'Power action not available',
      });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: { resourceId: 'res-1', action: 'PowerOff' },
        credentials: undefined,
      });

      expect(result.output.success).toBe(false);
      expect(result.output.message).toContain('Power action not available');
    });

    it('should return failure when execute power action fails', async () => {
      (mockService.checkVmPowerAction as jest.Mock).mockResolvedValue({ available: true });
      (mockService.executeVmPowerAction as jest.Mock).mockResolvedValue({
        error: 'Failed to power on',
      });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: { resourceId: 'res-1', action: 'PowerOn' },
        credentials: undefined,
      });

      expect(result.output.success).toBe(false);
    });

    it('should execute power action on standalone VM successfully', async () => {
      (mockService.getStandaloneVmStatus as jest.Mock).mockResolvedValue({
        powerState: 'POWERED_OFF',
      });
      (mockService.executeStandaloneVmPowerAction as jest.Mock).mockResolvedValue({
        status: 'success',
      });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: {
          namespaceUrnId: 'urn:123',
          namespaceName: 'test-ns',
          vmName: 'test-vm',
          action: 'PowerOn',
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
      expect(result.output.message).toContain('standalone VM test-vm');
    });

    it('should return failure when standalone VM status check fails', async () => {
      (mockService.getStandaloneVmStatus as jest.Mock).mockResolvedValue({
        error: 'VM not found',
      });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: {
          namespaceUrnId: 'urn:123',
          namespaceName: 'test-ns',
          vmName: 'test-vm',
          action: 'PowerOn',
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(false);
      expect(result.output.message).toContain('VM not found');
    });

    it('should return failure when standalone VM power action fails', async () => {
      (mockService.getStandaloneVmStatus as jest.Mock).mockResolvedValue({
        powerState: 'POWERED_OFF',
      });
      (mockService.executeStandaloneVmPowerAction as jest.Mock).mockResolvedValue({
        error: 'Power action failed',
      });

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: {
          namespaceUrnId: 'urn:123',
          namespaceName: 'test-ns',
          vmName: 'test-vm',
          action: 'PowerOff',
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(false);
    });

    it('should throw InputError when neither deployment nor standalone params provided', async () => {
      const action = getAction('vm_power_action_from_vcf_automation');
      await expect(
        action.action({
          input: { action: 'PowerOn' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError when both deployment and standalone params provided', async () => {
      const action = getAction('vm_power_action_from_vcf_automation');
      await expect(
        action.action({
          input: {
            resourceId: 'res-1',
            namespaceUrnId: 'urn:123',
            namespaceName: 'test-ns',
            vmName: 'test-vm',
            action: 'PowerOn',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should handle unexpected errors gracefully', async () => {
      (mockService.checkVmPowerAction as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const action = getAction('vm_power_action_from_vcf_automation');
      const result = await action.action({
        input: { resourceId: 'res-1', action: 'PowerOn' },
        credentials: undefined,
      });

      expect(result.output.success).toBe(false);
      expect(result.output.message).toContain('Unexpected error');
    });
  });

  describe('get_resource_details_from_vcf_automation action', () => {
    it('should return resource details', async () => {
      (mockService.getResourceDetails as jest.Mock).mockResolvedValue({
        id: 'res-1',
        name: 'Resource 1',
      });

      const action = getAction('get_resource_details_from_vcf_automation');
      const result = await action.action({
        input: { deploymentId: 'dep-1', resourceId: 'res-1' },
        credentials: undefined,
      });

      expect(result.output.resource.name).toBe('Resource 1');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getResourceDetails as jest.Mock).mockResolvedValue({
        error: 'Resource not found',
      });

      const action = getAction('get_resource_details_from_vcf_automation');
      await expect(
        action.action({
          input: { deploymentId: 'dep-1', resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getResourceDetails as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_resource_details_from_vcf_automation');
      await expect(
        action.action({
          input: { deploymentId: 'dep-1', resourceId: 'res-1' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_supervisor_resources_from_vcf_automation action', () => {
    it('should return supervisor resources', async () => {
      (mockService.getSupervisorResources as jest.Mock).mockResolvedValue({
        content: [{ id: 'sres-1', name: 'Supervisor Resource 1' }],
      });

      const action = getAction('get_supervisor_resources_from_vcf_automation');
      const result = await action.action({ input: {}, credentials: undefined });

      expect(result.output.resources).toHaveLength(1);
    });

    it('should throw InputError on service error', async () => {
      (mockService.getSupervisorResources as jest.Mock).mockResolvedValue({
        error: 'Failed to fetch resources',
      });

      const action = getAction('get_supervisor_resources_from_vcf_automation');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getSupervisorResources as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_supervisor_resources_from_vcf_automation');
      await expect(
        action.action({ input: {}, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_supervisor_resource_from_vcf_automation action', () => {
    it('should return supervisor resource details', async () => {
      (mockService.getSupervisorResource as jest.Mock).mockResolvedValue({
        id: 'sres-1',
        name: 'Supervisor Resource 1',
      });

      const action = getAction('get_supervisor_resource_from_vcf_automation');
      const result = await action.action({
        input: { resourceId: 'sres-1' },
        credentials: undefined,
      });

      expect(result.output.resource.name).toBe('Supervisor Resource 1');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getSupervisorResource as jest.Mock).mockResolvedValue({
        error: 'Resource not found',
      });

      const action = getAction('get_supervisor_resource_from_vcf_automation');
      await expect(
        action.action({ input: { resourceId: 'sres-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getSupervisorResource as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_supervisor_resource_from_vcf_automation');
      await expect(
        action.action({ input: { resourceId: 'sres-1' }, credentials: undefined })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_automation_supervisor_resource_manifest action', () => {
    it('should return resource manifest', async () => {
      (mockService.getSupervisorResourceManifest as jest.Mock).mockResolvedValue({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: { name: 'test-pod' },
      });

      const action = getAction('get_vcf_automation_supervisor_resource_manifest');
      const result = await action.action({
        input: {
          namespaceUrnId: 'urn:123',
          namespaceName: 'test-ns',
          resourceName: 'test-pod',
          apiVersion: 'v1',
          kind: 'Pod',
        },
        credentials: undefined,
      });

      expect(result.output.manifest.kind).toBe('Pod');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getSupervisorResourceManifest as jest.Mock).mockResolvedValue({
        error: 'Resource not found',
      });

      const action = getAction('get_vcf_automation_supervisor_resource_manifest');
      await expect(
        action.action({
          input: {
            namespaceUrnId: 'urn:123',
            namespaceName: 'test-ns',
            resourceName: 'test-pod',
            apiVersion: 'v1',
            kind: 'Pod',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.getSupervisorResourceManifest as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('get_vcf_automation_supervisor_resource_manifest');
      await expect(
        action.action({
          input: {
            namespaceUrnId: 'urn:123',
            namespaceName: 'test-ns',
            resourceName: 'test-pod',
            apiVersion: 'v1',
            kind: 'Pod',
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('update_vcf_automation_supervisor_resource_manifest action', () => {
    it('should update resource manifest successfully', async () => {
      (mockService.updateSupervisorResourceManifest as jest.Mock).mockResolvedValue({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: { name: 'test-pod' },
      });

      const action = getAction('update_vcf_automation_supervisor_resource_manifest');
      const result = await action.action({
        input: {
          namespaceUrnId: 'urn:123',
          namespaceName: 'test-ns',
          resourceName: 'test-pod',
          apiVersion: 'v1',
          kind: 'Pod',
          manifest: { spec: { replicas: 3 } },
        },
        credentials: undefined,
      });

      expect(result.output.success).toBe(true);
      expect(result.output.manifest.kind).toBe('Pod');
    });

    it('should throw InputError on service error', async () => {
      (mockService.updateSupervisorResourceManifest as jest.Mock).mockResolvedValue({
        error: 'Failed to update',
      });

      const action = getAction('update_vcf_automation_supervisor_resource_manifest');
      await expect(
        action.action({
          input: {
            namespaceUrnId: 'urn:123',
            namespaceName: 'test-ns',
            resourceName: 'test-pod',
            apiVersion: 'v1',
            kind: 'Pod',
            manifest: {},
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });

    it('should throw InputError on service exception', async () => {
      (mockService.updateSupervisorResourceManifest as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const action = getAction('update_vcf_automation_supervisor_resource_manifest');
      await expect(
        action.action({
          input: {
            namespaceUrnId: 'urn:123',
            namespaceName: 'test-ns',
            resourceName: 'test-pod',
            apiVersion: 'v1',
            kind: 'Pod',
            manifest: {},
          },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});
