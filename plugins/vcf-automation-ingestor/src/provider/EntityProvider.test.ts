import { VcfAutomationEntityProvider } from './EntityProvider';
import { mockServices } from '@backstage/backend-test-utils';
import { ConfigReader } from '@backstage/config';

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

    it('should throw error when configuration is invalid', () => {
      const config = new ConfigReader({
        vcfAutomation: {},
      });

      expect(() => {
        new VcfAutomationEntityProvider(
          config,
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
});
