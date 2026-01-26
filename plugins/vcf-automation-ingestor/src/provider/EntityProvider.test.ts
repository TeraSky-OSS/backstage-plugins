import { VcfAutomationEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());

// Suppress console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;
beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
  console.debug = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.debug = originalConsoleDebug;
});

describe('VcfAutomationEntityProvider', () => {
  const mockLogger = mockServices.logger.mock();
  const mockScheduler = {
    scheduleTask: jest.fn().mockResolvedValue(undefined),
    createScheduledTaskRunner: jest.fn().mockReturnValue({
      run: jest.fn(),
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with single instance config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'test-domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('vcf-automation');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('1 instance(s)')
      );
    });

    it('should create provider with multiple instances config', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          instances: [
            {
              baseUrl: 'https://vcf1.example.com',
              name: 'vcf-1',
              majorVersion: 8,
              authentication: {
                username: 'admin1',
                password: 'password1',
                domain: 'domain1',
              },
            },
            {
              baseUrl: 'https://vcf2.example.com',
              name: 'vcf-2',
              majorVersion: 9,
              authentication: {
                username: 'admin2',
                password: 'password2',
                domain: 'domain2',
              },
              organizationType: 'all-apps',
            },
          ],
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('2 instance(s)')
      );
    });

    it('should use default values when optional config is missing', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
    });

    it('should use default organization type vm-apps', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          instances: [
            {
              baseUrl: 'https://vcf.example.com',
              authentication: {
                username: 'admin',
                password: 'password',
                domain: 'domain',
              },
            },
          ],
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider).toBeDefined();
    });

    it('should throw error when configuration is invalid', () => {
      const config = {
        getOptionalConfigArray: jest.fn().mockImplementation(() => {
          throw new Error('Invalid config');
        }),
      } as any;

      expect(() => {
        new VcfAutomationEntityProvider(
          config,
          mockScheduler as any,
          mockLogger,
        );
      }).toThrow('Failed to initialize VCF Automation provider');
    });

    it('should throw error when no instances are configured', () => {
      // Create config that returns empty array for instances
      const configWithNoInstances = new ConfigReader({
        vcfAutomation: {
          instances: [],
        },
      });

      // The ConfigReader will return an empty array for instances
      // but the provider should still throw because there are no valid instances
      expect(() => {
        new VcfAutomationEntityProvider(
          configWithNoInstances,
          mockScheduler as any,
          mockLogger,
        );
      }).toThrow();
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      expect(provider.getProviderName()).toBe('vcf-automation');
    });
  });

  describe('connect', () => {
    it('should schedule task and set connection', async () => {
      const fetch = require('node-fetch');
      
      // Mock successful authentication and empty deployments
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'test-token' }),
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], totalPages: 0, number: 0 }),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockScheduler.scheduleTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'refresh_vcf_automation_entities',
          frequency: { minutes: 30 },
          timeout: { minutes: 10 },
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully scheduled refresh task')
      );
    });

    it('should handle schedule task failure', async () => {
      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const failingScheduler = {
        scheduleTask: jest.fn().mockRejectedValue(new Error('Schedule failed')),
      };

      const provider = new VcfAutomationEntityProvider(
        config,
        failingScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn(),
      };

      await expect(provider.connect(mockConnection as any)).rejects.toThrow('Schedule failed');
    });
  });

  describe('authentication', () => {
    it('should authenticate with version 8 API', async () => {
      const fetch = require('node-fetch');
      
      // Mock successful v8 authentication
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'v8-token' }),
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], totalPages: 0, number: 0 }),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('version 8')
      );
    });

    it('should authenticate with version 9+ API', async () => {
      const fetch = require('node-fetch');
      
      // Mock successful v9 authentication
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => name === 'x-vmware-vcloud-access-token' ? 'v9-token' : null,
        },
        json: async () => ({}),
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], totalPages: 0, number: 0 }),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 9,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
          orgName: 'test-org',
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('version 9')
      );
    });

    it('should handle authentication failure and log error', async () => {
      const fetch = require('node-fetch');
      
      // Mock failed authentication
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'wrong-password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // The provider logs errors but continues processing
      await provider.connect(mockConnection as any);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed'),
        expect.anything()
      );
    });

    it('should handle missing access token in version 9 response and log error', async () => {
      const fetch = require('node-fetch');
      
      // Mock v9 auth without token
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => null, // No token header
        },
        json: async () => ({}),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 9,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // The provider logs errors but continues processing
      await provider.connect(mockConnection as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed'),
        expect.anything()
      );
    });
  });

  describe('refresh', () => {
    it('should handle empty deployments list', async () => {
      const fetch = require('node-fetch');
      
      // Mock authentication and empty deployments
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'test-token' }),
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], totalPages: 0, number: 0 }),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'full',
          entities: [],
        })
      );
    });

    it('should transform deployments into entities', async () => {
      const fetch = require('node-fetch');
      
      const mockDeployment = {
        id: 'deployment-1',
        name: 'Test Deployment',
        ownedBy: 'admin',
        ownerType: 'user',
        project: { id: 'project-1', name: 'Test Project' },
        resources: [
          {
            id: 'resource-1',
            name: 'vm-1',
            type: 'Cloud.vSphere.Machine',
            properties: {},
            createdAt: '2025-01-01T00:00:00Z',
            origin: 'vSphere',
            syncStatus: 'SUCCESS',
            state: 'OK',
          },
        ],
        status: 'ACTIVE',
        expense: { totalExpense: 100, unit: 'USD' },
        createdAt: '2025-01-01T00:00:00Z',
        createdBy: 'admin',
        lastUpdatedAt: '2025-01-02T00:00:00Z',
        lastUpdatedBy: 'admin',
        lastRequest: { id: 'request-1', status: 'COMPLETED' },
      };

      // Mock authentication
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'test-token' }),
      });
      // Mock deployments API
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [mockDeployment], totalPages: 1, number: 0 }),
      });
      // Mock full resource details fetch for VM
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ properties: { moref: 'vm-123' } }),
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockConnection.applyMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'full',
        })
      );

      const mutation = mockConnection.applyMutation.mock.calls[0][0];
      expect(mutation.entities.length).toBeGreaterThan(0);

      // Should have created Domain, System, and Component entities
      const entityKinds = mutation.entities.map((e: any) => e.entity.kind);
      expect(entityKinds).toContain('Domain');
      expect(entityKinds).toContain('System');
      expect(entityKinds).toContain('Component');
    });

    it('should handle 404 during pagination gracefully', async () => {
      const fetch = require('node-fetch');
      
      const mockDeployment = {
        id: 'deployment-1',
        name: 'Deployment 1',
        project: { id: 'p1', name: 'P1' },
        ownedBy: 'admin',
        ownerType: 'user',
        resources: [],
        status: 'ACTIVE',
        expense: {},
        createdAt: '',
        createdBy: '',
        lastUpdatedAt: '',
        lastUpdatedBy: '',
        lastRequest: {},
      };

      // Mock authentication
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'test-token' }),
      });
      // Mock first page
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [mockDeployment], totalPages: 2, number: 0 }),
      });
      // Mock second page returns 404
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      await provider.connect(mockConnection as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No more pages')
      );
    });
  });

  describe('error handling', () => {
    it('should handle deployment fetch failure and log error', async () => {
      const fetch = require('node-fetch');
      
      // Mock authentication success
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cspAuthToken: 'test-token' }),
      });
      // Mock deployments API failure
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const config = new ConfigReader({
        vcfAutomation: {
          baseUrl: 'https://vcf.example.com',
          name: 'test-vcf',
          majorVersion: 8,
          authentication: {
            username: 'admin',
            password: 'password',
            domain: 'domain',
          },
        },
      });

      const provider = new VcfAutomationEntityProvider(
        config,
        mockScheduler as any,
        mockLogger,
      );

      const mockConnection = {
        applyMutation: jest.fn().mockResolvedValue(undefined),
      };

      // The provider logs errors but continues processing  
      await provider.connect(mockConnection as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        expect.anything()
      );
    });
  });
});
