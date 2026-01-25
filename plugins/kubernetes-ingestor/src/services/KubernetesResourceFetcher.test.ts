import { DefaultKubernetesResourceFetcher } from './KubernetesResourceFetcher';
import { mockServices } from '@backstage/backend-test-utils';

describe('DefaultKubernetesResourceFetcher', () => {
  const mockDiscovery = mockServices.discovery.mock();
  const mockAuth = mockServices.auth.mock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscovery.getBaseUrl.mockResolvedValue('http://kubernetes-backend');
    mockAuth.getOwnServiceCredentials.mockResolvedValue({ principal: { type: 'service' } });
    mockAuth.getPluginRequestToken.mockResolvedValue({ token: 'test-token' });
  });

  describe('constructor', () => {
    it('should create fetcher instance', () => {
      const fetcher = new DefaultKubernetesResourceFetcher(
        mockDiscovery,
        mockAuth,
      );

      expect(fetcher).toBeDefined();
    });
  });
});
