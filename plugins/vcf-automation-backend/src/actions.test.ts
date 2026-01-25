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
    getCatalogItems: jest.fn(),
    getCatalogItemDetails: jest.fn(),
    requestCatalogItem: jest.fn(),
    getRequests: jest.fn(),
    getRequestDetails: jest.fn(),
    getResources: jest.fn(),
    getResourceDetails: jest.fn(),
    getResourceActions: jest.fn(),
    runResourceAction: jest.fn(),
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

  it('should register all MCP actions', () => {
    registerMcpActions(mockActionsRegistry as any, mockService);

    // VCF Automation has many actions
    expect(mockActionsRegistry.register).toHaveBeenCalled();

    const registeredActions = mockActionsRegistry.register.mock.calls.map(
      (call: any[]) => call[0].name
    );

    expect(registeredActions).toContain('get_vcf_automation_instances');
    expect(registeredActions).toContain('get_vcf_automation_projects');
    expect(registeredActions).toContain('get_vcf_automation_project_details');
  });

  describe('get_vcf_automation_instances action', () => {
    let instancesAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockService);
      instancesAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_vcf_automation_instances'
      )?.[0];
    });

    it('should return configured instances', async () => {
      const result = await instancesAction.action({ credentials: undefined });

      expect(result.output.instances).toHaveLength(1);
      expect(result.output.instances[0].name).toBe('test-instance');
      expect(result.output.instances[0].url).toBe('http://vcfa.example.com');
    });
  });

  describe('get_vcf_automation_projects action', () => {
    let projectsAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockService);
      projectsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_vcf_automation_projects'
      )?.[0];
    });

    it('should return projects successfully', async () => {
      (mockService.getProjects as jest.Mock).mockResolvedValue({
        content: [
          { id: 'project-1', name: 'Project 1' },
          { id: 'project-2', name: 'Project 2' },
        ],
      });

      const result = await projectsAction.action({
        input: {},
        credentials: undefined,
      });

      expect(result.output.projects).toHaveLength(2);
      expect(result.output.projects[0].name).toBe('Project 1');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getProjects as jest.Mock).mockResolvedValue({
        error: 'Service unavailable',
      });

      await expect(
        projectsAction.action({
          input: {},
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });

  describe('get_vcf_automation_project_details action', () => {
    let detailsAction: any;

    beforeEach(() => {
      registerMcpActions(mockActionsRegistry as any, mockService);
      detailsAction = mockActionsRegistry.register.mock.calls.find(
        (call: any[]) => call[0].name === 'get_vcf_automation_project_details'
      )?.[0];
    });

    it('should return project details', async () => {
      (mockService.getProjectDetails as jest.Mock).mockResolvedValue({
        id: 'project-1',
        name: 'Project 1',
        description: 'Test project',
      });

      const result = await detailsAction.action({
        input: { projectId: 'project-1' },
        credentials: undefined,
      });

      expect(result.output.project.name).toBe('Project 1');
    });

    it('should throw InputError on service error', async () => {
      (mockService.getProjectDetails as jest.Mock).mockResolvedValue({
        error: 'Project not found',
      });

      await expect(
        detailsAction.action({
          input: { projectId: 'non-existent' },
          credentials: undefined,
        })
      ).rejects.toThrow(InputError);
    });
  });
});

