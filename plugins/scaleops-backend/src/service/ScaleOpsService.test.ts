import { ScaleOpsService } from './ScaleOpsService';
import { mockServices } from '@backstage/backend-test-utils';

// Mock node-fetch
jest.mock('node-fetch', () => {
  const mockFetch = jest.fn();
  return {
    __esModule: true,
    default: mockFetch,
  };
});

describe('ScaleOpsService', () => {
  const mockLogger = mockServices.logger.mock();

  const scaleOpsConfig = {
    baseUrl: 'http://scaleops.example.com',
    authType: 'basic' as const,
    username: 'admin',
    password: 'password',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with basic auth config', () => {
      const service = new ScaleOpsService(scaleOpsConfig, mockLogger);
      expect(service).toBeDefined();
    });

    it('should create service with token auth config', () => {
      const tokenConfig = {
        baseUrl: 'http://scaleops.example.com',
        authType: 'token' as const,
        token: 'test-token',
      };
      const service = new ScaleOpsService(tokenConfig, mockLogger);
      expect(service).toBeDefined();
    });
  });

  describe('generateDashboardUrl', () => {
    it('should generate dashboard URL', () => {
      const service = new ScaleOpsService(scaleOpsConfig, mockLogger);
      const url = service.generateDashboardUrl('default', 'test-workload', 'Deployment');
      
      expect(url).toContain('scaleops.example.com');
      expect(url).toContain('default');
      expect(url).toContain('test-workload');
    });
  });
});
