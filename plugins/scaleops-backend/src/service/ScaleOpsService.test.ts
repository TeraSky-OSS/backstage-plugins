import { ScaleOpsService } from './ScaleOpsService';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

describe('ScaleOpsService', () => {
  const mockLogger = mockServices.logger.mock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with basic config', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      expect(service).toBeDefined();
    });

    it('should create service with authentication config', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: false,
          authentication: {
            enabled: true,
            user: 'admin',
            password: 'password',
          },
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      expect(service).toBeDefined();
    });
  });

  describe('generateDashboardUrl', () => {
    it('should generate dashboard URL when linkToDashboard is true', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload');
      
      expect(url).not.toBeNull();
      expect(url).toContain('scaleops.example.com');
      expect(url).toContain('test-workload');
    });

    it('should return null when linkToDashboard is false', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: false,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload');
      
      expect(url).toBeNull();
    });

    it('should include labels in URL when provided', () => {
      const config = new ConfigReader({
        scaleops: {
          baseUrl: 'http://scaleops.example.com',
          linkToDashboard: true,
        },
      });

      const service = new ScaleOpsService(config, mockLogger);
      const url = service.generateDashboardUrl('test-workload', ['app=test', 'env=prod']);
      
      expect(url).not.toBeNull();
      expect(url).toContain('labels=');
    });
  });
});
