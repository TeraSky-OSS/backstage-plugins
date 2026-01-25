import { VcfAutomationClient, vcfAutomationApiRef } from './VcfAutomationClient';

// Mock global fetch
global.fetch = jest.fn();

describe('VcfAutomationApi', () => {
  describe('vcfAutomationApiRef', () => {
    it('should have correct id', () => {
      expect(vcfAutomationApiRef.id).toBe('plugin.vcf-automation.service');
    });
  });

  describe('VcfAutomationClient', () => {
    const mockDiscoveryApi = {
      getBaseUrl: jest.fn(),
    };

    const mockIdentityApi = {
      getCredentials: jest.fn(),
    };

    let client: VcfAutomationClient;

    beforeEach(() => {
      jest.clearAllMocks();
      mockDiscoveryApi.getBaseUrl.mockResolvedValue('http://vcf-automation-backend');
      mockIdentityApi.getCredentials.mockResolvedValue({ token: 'test-token' });

      client = new VcfAutomationClient({
        discoveryApi: mockDiscoveryApi as any,
        identityApi: mockIdentityApi as any,
      });
    });

    describe('getDeploymentEvents', () => {
      it('should fetch deployment events', async () => {
        const mockEvents = {
          content: {},
          pageable: {},
          config: [],
          history: [{ timestamp: '2024-01-01', status: 'SUCCESS' }],
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockEvents),
        });

        const result = await client.getDeploymentEvents('deployment-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments/deployment-1/events',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
        expect(result.history).toHaveLength(1);
      });

      it('should include instance name in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ content: {}, pageable: {}, config: [], history: [] }),
        });

        await client.getDeploymentEvents('deployment-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Internal Server Error',
        });

        await expect(client.getDeploymentEvents('deployment-1')).rejects.toThrow(
          'Failed to fetch deployment events'
        );
      });
    });

    describe('getVSphereVMDetails', () => {
      it('should fetch VM details', async () => {
        const mockVm = {
          id: 'vm-1',
          name: 'test-vm',
          type: 'Cloud.vSphere.Machine',
          properties: {},
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockVm),
        });

        const result = await client.getVSphereVMDetails('deployment-1', 'vm-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments/deployment-1/resources/vm-1',
          expect.any(Object)
        );
        expect(result.name).toBe('test-vm');
      });
    });

    describe('getProjectDetails', () => {
      it('should fetch project details', async () => {
        const mockProject = { id: 'project-1', name: 'Test Project' };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockProject),
        });

        const result = await client.getProjectDetails('project-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/projects/project-1',
          expect.any(Object)
        );
        expect(result.name).toBe('Test Project');
      });
    });

    describe('getProjects', () => {
      it('should fetch all projects', async () => {
        const mockProjects = { content: [{ id: 'p1' }, { id: 'p2' }] };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        });

        const result = await client.getProjects();

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/projects',
          expect.any(Object)
        );
        expect(result.content).toHaveLength(2);
      });
    });

    describe('getDeployments', () => {
      it('should fetch all deployments', async () => {
        const mockDeployments = { content: [{ id: 'd1' }] };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockDeployments),
        });

        const result = await client.getDeployments();

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments',
          expect.any(Object)
        );
        expect(result.content).toHaveLength(1);
      });
    });

    describe('getSupervisorResources', () => {
      it('should fetch supervisor resources', async () => {
        const mockResources = { content: [] };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResources),
        });

        const result = await client.getSupervisorResources('test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
        expect(result).toEqual(mockResources);
      });
    });

    describe('checkVmPowerAction', () => {
      it('should check power action availability', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        });

        const result = await client.checkVmPowerAction('vm-1', 'PowerOn');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/resources/vm-1/power-actions/PowerOn',
          expect.any(Object)
        );
        expect(result.available).toBe(true);
      });
    });

    describe('executeVmPowerAction', () => {
      it('should execute power action', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        const result = await client.executeVmPowerAction('vm-1', 'PowerOff');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/resources/vm-1/power-actions/PowerOff',
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('getStandaloneVmStatus', () => {
      it('should fetch standalone VM status', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ powerState: 'PoweredOn' }),
        });

        const result = await client.getStandaloneVmStatus(
          'urn:123',
          'test-ns',
          'test-vm'
        );

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/standalone-vms/urn:123/test-ns/test-vm/status',
          expect.any(Object)
        );
        expect(result.powerState).toBe('PoweredOn');
      });
    });

    describe('executeStandaloneVmPowerAction', () => {
      it('should execute standalone VM power action', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        const vmData = { spec: {}, metadata: {} };
        const result = await client.executeStandaloneVmPowerAction(
          'urn:123',
          'test-ns',
          'test-vm',
          'PoweredOff',
          vmData
        );

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/standalone-vms/urn:123/test-ns/test-vm/power-state',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ powerState: 'PoweredOff', vmData }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('getSupervisorResourceManifest', () => {
      it('should fetch supervisor resource manifest', async () => {
        const mockManifest = { apiVersion: 'v1', kind: 'Test', metadata: {} };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockManifest),
        });

        const result = await client.getSupervisorResourceManifest(
          'urn:123',
          'test-ns',
          'test-resource',
          'v1',
          'Test'
        );

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('apiVersion=v1'),
          expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('kind=Test'),
          expect.any(Object)
        );
        expect(result.kind).toBe('Test');
      });
    });

    describe('updateSupervisorResourceManifest', () => {
      it('should update supervisor resource manifest', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        const manifest = { apiVersion: 'v1', kind: 'Test', spec: {} };
        const result = await client.updateSupervisorResourceManifest(
          'urn:123',
          'test-ns',
          'test-resource',
          'v1',
          'Test',
          manifest
        );

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('supervisor-resource-manifest'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ manifest }),
          })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('authentication', () => {
      it('should not include Authorization header when no token', async () => {
        mockIdentityApi.getCredentials.mockResolvedValue({});

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getProjects();

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.not.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        );
      });
    });

    describe('getGenericResourceDetails', () => {
      it('should fetch generic resource details', async () => {
        const mockResource = { id: 'res-1', name: 'test-resource' };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });

        const result = await client.getGenericResourceDetails('dep-1', 'res-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments/dep-1/resources/res-1',
          expect.any(Object)
        );
        expect(result.name).toBe('test-resource');
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getGenericResourceDetails('dep-1', 'res-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getGenericResourceDetails('dep-1', 'res-1')).rejects.toThrow(
          'Failed to fetch resource details'
        );
      });
    });

    describe('getDeploymentDetails', () => {
      it('should fetch deployment details', async () => {
        const mockDeployment = { id: 'dep-1', name: 'test-deployment' };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockDeployment),
        });

        const result = await client.getDeploymentDetails('dep-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments/dep-1',
          expect.any(Object)
        );
        expect(result.name).toBe('test-deployment');
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getDeploymentDetails('dep-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getDeploymentDetails('dep-1')).rejects.toThrow(
          'Failed to fetch deployment details'
        );
      });
    });

    describe('getDeploymentResources', () => {
      it('should fetch deployment resources', async () => {
        const mockResources = { content: [{ id: 'res-1' }] };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResources),
        });

        const result = await client.getDeploymentResources('dep-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/deployments/dep-1/resources',
          expect.any(Object)
        );
        expect(result.content).toHaveLength(1);
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getDeploymentResources('dep-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getDeploymentResources('dep-1')).rejects.toThrow(
          'Failed to fetch deployment resources'
        );
      });
    });

    describe('getSupervisorResource', () => {
      it('should fetch a single supervisor resource', async () => {
        const mockResource = { id: 'sr-1', name: 'supervisor-resource-1' };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });

        const result = await client.getSupervisorResource('sr-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/supervisor-resources/sr-1',
          expect.any(Object)
        );
        expect(result.name).toBe('supervisor-resource-1');
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getSupervisorResource('sr-1')).rejects.toThrow(
          'Failed to fetch supervisor resource'
        );
      });
    });

    describe('getSupervisorNamespaces', () => {
      it('should fetch supervisor namespaces', async () => {
        const mockNamespaces = { items: [{ id: 'ns-1' }] };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockNamespaces),
        });

        const result = await client.getSupervisorNamespaces();

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/supervisor-namespaces',
          expect.any(Object)
        );
        expect(result.items).toHaveLength(1);
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getSupervisorNamespaces('test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getSupervisorNamespaces()).rejects.toThrow(
          'Failed to fetch supervisor namespaces'
        );
      });
    });

    describe('getSupervisorNamespace', () => {
      it('should fetch a single supervisor namespace', async () => {
        const mockNamespace = { id: 'ns-1', name: 'namespace-1' };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockNamespace),
        });

        const result = await client.getSupervisorNamespace('ns-1');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/supervisor-namespaces/ns-1',
          expect.any(Object)
        );
        expect(result.name).toBe('namespace-1');
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getSupervisorNamespace('ns-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getSupervisorNamespace('ns-1')).rejects.toThrow(
          'Failed to fetch supervisor namespace'
        );
      });
    });

    describe('getVSphereVMDetails - error handling', () => {
      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getVSphereVMDetails('dep-1', 'vm-1')).rejects.toThrow(
          'Failed to fetch resource details'
        );
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getVSphereVMDetails('dep-1', 'vm-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });
    });

    describe('getProjectDetails - error handling', () => {
      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });

        await expect(client.getProjectDetails('project-1')).rejects.toThrow(
          'Failed to fetch project details'
        );
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getProjectDetails('project-1', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });
    });

    describe('getProjects - error handling', () => {
      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.getProjects()).rejects.toThrow(
          'Failed to fetch projects'
        );
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getProjects('test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });
    });

    describe('getDeployments - error handling', () => {
      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.getDeployments()).rejects.toThrow(
          'Failed to fetch deployments'
        );
      });

      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getDeployments('test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });
    });

    describe('getSupervisorResources - error handling', () => {
      it('should fetch without instance name', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getSupervisorResources();

        expect(global.fetch).toHaveBeenCalledWith(
          'http://vcf-automation-backend/supervisor-resources',
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.getSupervisorResources()).rejects.toThrow(
          'Failed to fetch supervisor resources'
        );
      });
    });

    describe('checkVmPowerAction - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.checkVmPowerAction('vm-1', 'PowerOn', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.checkVmPowerAction('vm-1', 'PowerOn')).rejects.toThrow(
          'Failed to check VM power action'
        );
      });
    });

    describe('executeVmPowerAction - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.executeVmPowerAction('vm-1', 'PowerOff', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.executeVmPowerAction('vm-1', 'PowerOff')).rejects.toThrow(
          'Failed to execute VM power action'
        );
      });
    });

    describe('getStandaloneVmStatus - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getStandaloneVmStatus('urn:123', 'ns', 'vm', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.getStandaloneVmStatus('urn:123', 'ns', 'vm')).rejects.toThrow(
          'Failed to get standalone VM status'
        );
      });
    });

    describe('executeStandaloneVmPowerAction - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.executeStandaloneVmPowerAction('urn:123', 'ns', 'vm', 'PoweredOn', {}, 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.executeStandaloneVmPowerAction('urn:123', 'ns', 'vm', 'PoweredOff', {})).rejects.toThrow(
          'Failed to execute standalone VM power action'
        );
      });
    });

    describe('getSupervisorResourceManifest - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.getSupervisorResourceManifest('urn:123', 'ns', 'res', 'v1', 'Pod', 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.getSupervisorResourceManifest('urn:123', 'ns', 'res', 'v1', 'Pod')).rejects.toThrow(
          'Failed to get supervisor resource manifest'
        );
      });
    });

    describe('updateSupervisorResourceManifest - error handling', () => {
      it('should include instance in URL when provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await client.updateSupervisorResourceManifest('urn:123', 'ns', 'res', 'v1', 'Pod', {}, 'test-instance');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('instance=test-instance'),
          expect.any(Object)
        );
      });

      it('should throw error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        });

        await expect(client.updateSupervisorResourceManifest('urn:123', 'ns', 'res', 'v1', 'Pod', {})).rejects.toThrow(
          'Failed to update supervisor resource manifest'
        );
      });
    });
  });
});

