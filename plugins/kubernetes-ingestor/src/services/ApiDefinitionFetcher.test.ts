import { ApiDefinitionFetcher } from './ApiDefinitionFetcher';
import { ApiFromResourceRef } from '../types';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiDefinitionFetcher', () => {
  const mockResourceFetcher = {
    proxyKubernetesRequest: jest.fn(),
    fetchResource: jest.fn(),
    fetchResources: jest.fn(),
    getClusters: jest.fn(),
  };

  const mockConfig = {
    getOptionalString: jest.fn().mockReturnValue('terasky.backstage.io'),
  };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockUrlReader = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  let fetcher: ApiDefinitionFetcher;
  let fetcherWithUrlReader: ApiDefinitionFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    fetcher = new ApiDefinitionFetcher(
      mockResourceFetcher as any,
      mockConfig as any,
      mockLogger as any,
    );
    fetcherWithUrlReader = new ApiDefinitionFetcher(
      mockResourceFetcher as any,
      mockConfig as any,
      mockLogger as any,
      mockUrlReader as any,
    );
  });

  describe('fetchFromUrl', () => {
    it('should fetch and return JSON API definition converted to YAML', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
      expect(result.definition).toContain('title: Test API');
    });

    it('should fetch and return YAML API definition as-is', async () => {
      const yamlContent = `openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/yaml',
        },
        text: () => Promise.resolve(yamlContent),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.yaml');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
    });

    it('should return error when fetch fails with non-200 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch API definition');
      expect(result.error).toContain('404');
    });

    it('should return error when content is invalid YAML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/plain',
        },
        text: () => Promise.resolve('{ invalid yaml: ['),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API definition format');
    });

    it('should return error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error fetching API definition');
      expect(result.error).toContain('Network error');
    });

    it('should detect JSON by content even without proper content-type', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/plain',
        },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
    });

    it('should include fetchUrl in the result', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'http://example.com' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(true);
      expect(result.fetchUrl).toBe('http://example.com/swagger.json');
    });

    it('should convert relative servers[0].url to full URL', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: '/api/v1' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://api.example.com:8080/swagger.json');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('http://api.example.com:8080/api/v1');
    });

    it('should preserve full URL in servers[0].url and add second entry if different', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'https://external.example.com/api' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://internal.example.com:8080/swagger.json');

      expect(result.success).toBe(true);
      // Should preserve the original URL
      expect(result.definition).toContain('https://external.example.com/api');
      // Should add a second entry based on fetch URL
      expect(result.definition).toContain('http://internal.example.com:8080/api');
      expect(result.definition).toContain('Server based on API fetch location');
    });

    it('should not add duplicate server entry if URLs match', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [{ url: 'http://example.com/api' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://example.com/swagger.json');

      expect(result.success).toBe(true);
      // Should only have one server entry
      const serverMatches = result.definition!.match(/- url:/g);
      expect(serverMatches).toHaveLength(1);
    });

    it('should add server entry when servers array is empty', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://api.example.com:8080/swagger.json');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('http://api.example.com:8080');
    });

    it('should add server entry when servers field is missing', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromUrl('http://api.example.com/swagger.json');

      expect(result.success).toBe(true);
      expect(result.definition).toContain('servers:');
      expect(result.definition).toContain('http://api.example.com');
    });
  });

  describe('UrlReaderService integration', () => {
    it('should use UrlReaderService for GitHub URLs when available', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'GitHub API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://raw.githubusercontent.com/owner/repo/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
      expect(mockUrlReader.readUrl).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/owner/repo/main/openapi.json'
      );
      // Should NOT call node-fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use UrlReaderService for GitLab URLs', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'GitLab API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://gitlab.com/owner/repo/-/raw/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use UrlReaderService for Bitbucket URLs', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Bitbucket API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://bitbucket.org/owner/repo/raw/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use UrlReaderService for Azure DevOps URLs', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Azure API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://dev.azure.com/org/project/_git/repo?path=/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fall back to node-fetch when UrlReaderService fails', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Fallback API', version: '1.0.0' },
      };

      mockUrlReader.readUrl.mockRejectedValueOnce(new Error('No integration configured'));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://github.com/owner/repo/blob/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled(); // Fallback was used
    });

    it('should use node-fetch for non-Git URLs even when UrlReaderService is available', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'Internal API', version: '1.0.0' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'http://internal-service.default.svc.cluster.local/swagger.json'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockUrlReader.readUrl).not.toHaveBeenCalled();
    });

    it('should use node-fetch when UrlReaderService is not provided', async () => {
      const jsonContent = {
        openapi: '3.0.0',
        info: { title: 'GitHub API', version: '1.0.0' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      // Using fetcher without UrlReaderService
      const result = await fetcher.fetchFromUrl(
        'https://raw.githubusercontent.com/owner/repo/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockUrlReader.readUrl).not.toHaveBeenCalled();
    });

    it('should detect self-hosted GitLab URLs', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Self-hosted GitLab API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://gitlab.mycompany.com/group/project/-/raw/main/openapi.yaml'
      );

      expect(result.success).toBe(true);
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should detect GitHub Enterprise URLs', async () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'GHE API', version: '1.0.0' },
      });

      mockUrlReader.readUrl.mockResolvedValueOnce({
        buffer: () => Promise.resolve(Buffer.from(jsonContent)),
      });

      const result = await fetcherWithUrlReader.fetchFromUrl(
        'https://github.mycompany.com/org/repo/blob/main/openapi.json'
      );

      expect(result.success).toBe(true);
      expect(mockUrlReader.readUrl).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchFromResourceRef', () => {
    const baseResourceRef: ApiFromResourceRef = {
      kind: 'Service',
      name: 'my-service',
      apiVersion: 'v1',
      path: '/swagger/openapi.json',
      'target-protocol': 'http',
      'target-port': '80',
      'target-field': '.status.loadBalancer.ingress[0].ip',
    };

    it('should fetch API definition from Service LoadBalancer IP', async () => {
      // Mock the Kubernetes resource fetch
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        metadata: { name: 'my-service' },
        status: {
          loadBalancer: {
            ingress: [{ ip: '10.0.0.1' }],
          },
        },
      });

      // Mock the API definition fetch
      const jsonContent = { openapi: '3.0.0', info: { title: 'Test API' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(jsonContent)),
      } as any);

      const result = await fetcher.fetchFromResourceRef(
        baseResourceRef,
        'test-cluster',
        'default',
      );

      expect(result.success).toBe(true);
      expect(result.definition).toContain('openapi: 3.0.0');
      
      // Verify the correct Kubernetes API path was used for core API
      expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith(
        'test-cluster',
        { path: '/api/v1/namespaces/default/services/my-service' },
      );
      
      // Verify the correct URL was constructed
      expect(mockFetch).toHaveBeenCalledWith(
        'http://10.0.0.1:80/swagger/openapi.json',
        expect.any(Object),
      );
    });

    it('should use custom namespace from resourceRef', async () => {
      const resourceRefWithNamespace: ApiFromResourceRef = {
        ...baseResourceRef,
        namespace: 'custom-namespace',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        status: { loadBalancer: { ingress: [{ ip: '10.0.0.1' }] } },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      await fetcher.fetchFromResourceRef(
        resourceRefWithNamespace,
        'test-cluster',
        'default',
      );

      expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith(
        'test-cluster',
        { path: '/api/v1/namespaces/custom-namespace/services/my-service' },
      );
    });

    it('should handle API group resources correctly (e.g., networking.k8s.io/v1)', async () => {
      const ingressRef: ApiFromResourceRef = {
        kind: 'Ingress',
        name: 'my-ingress',
        apiVersion: 'networking.k8s.io/v1',
        path: '/swagger.json',
        'target-protocol': 'https',
        'target-port': '443',
        'target-field': '.spec.rules[0].host',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        spec: { rules: [{ host: 'api.example.com' }] },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      await fetcher.fetchFromResourceRef(ingressRef, 'test-cluster', 'default');

      // Verify the correct path for API group resources
      expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalledWith(
        'test-cluster',
        { path: '/apis/networking.k8s.io/v1/namespaces/default/ingresses/my-ingress' },
      );

      // Verify HTTPS URL was constructed correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com:443/swagger.json',
        expect.any(Object),
      );
    });

    it('should return error when Kubernetes resource fetch fails', async () => {
      mockResourceFetcher.proxyKubernetesRequest.mockRejectedValueOnce(
        new Error('Resource not found'),
      );

      const result = await fetcher.fetchFromResourceRef(
        baseResourceRef,
        'test-cluster',
        'default',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch Kubernetes resource');
    });

    it('should return error when target-field cannot be extracted', async () => {
      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        status: { loadBalancer: { ingress: [] } }, // Empty ingress array
      });

      const result = await fetcher.fetchFromResourceRef(
        baseResourceRef,
        'test-cluster',
        'default',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not extract endpoint');
    });

    it('should extract hostname from loadBalancer', async () => {
      const hostnameRef: ApiFromResourceRef = {
        ...baseResourceRef,
        'target-field': '.status.loadBalancer.ingress[0].hostname',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        status: {
          loadBalancer: {
            ingress: [{ hostname: 'my-lb.example.com' }],
          },
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      await fetcher.fetchFromResourceRef(hostnameRef, 'test-cluster', 'default');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://my-lb.example.com:80/swagger/openapi.json',
        expect.any(Object),
      );
    });

    it('should extract clusterIP from Service', async () => {
      const clusterIPRef: ApiFromResourceRef = {
        ...baseResourceRef,
        'target-field': '.spec.clusterIP',
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        spec: { clusterIP: '10.96.0.100' },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      await fetcher.fetchFromResourceRef(clusterIPRef, 'test-cluster', 'default');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://10.96.0.100:80/swagger/openapi.json',
        expect.any(Object),
      );
    });
  });

  describe('parseResourceRefAnnotation', () => {
    it('should parse valid JSON annotation', () => {
      const annotation = JSON.stringify({
        kind: 'Service',
        name: 'my-service',
        apiVersion: 'v1',
        path: '/swagger.json',
        'target-protocol': 'http',
        'target-port': '80',
        'target-field': '.spec.clusterIP',
      });

      const result = fetcher.parseResourceRefAnnotation(annotation);

      expect(result).not.toBeNull();
      expect(result?.kind).toBe('Service');
      expect(result?.name).toBe('my-service');
    });

    it('should return null for invalid JSON', () => {
      const result = fetcher.parseResourceRefAnnotation('{ invalid json }');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return null for missing required fields', () => {
      const annotation = JSON.stringify({
        kind: 'Service',
        name: 'my-service',
        // Missing other required fields
      });

      const result = fetcher.parseResourceRefAnnotation(annotation);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field'),
      );
    });

    it('should return null for invalid target-protocol', () => {
      const annotation = JSON.stringify({
        kind: 'Service',
        name: 'my-service',
        apiVersion: 'v1',
        path: '/swagger.json',
        'target-protocol': 'ftp', // Invalid
        'target-port': '80',
        'target-field': '.spec.clusterIP',
      });

      const result = fetcher.parseResourceRefAnnotation(annotation);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid target-protocol'),
      );
    });
  });

  describe('fetchApiFromAnnotations', () => {
    it('should return null when no API annotations are present', async () => {
      const annotations = {
        'some-other-annotation': 'value',
      };

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result).toBeNull();
    });

    it('should return $text reference for provides-api-from-def annotation', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-def': 'http://example.com/api/v3/openapi.json',
      };

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result?.success).toBe(true);
      expect(result?.definition).toBe('http://example.com/api/v3/openapi.json');
      expect(result?.useTextReference).toBe(true);
      // Should NOT call node-fetch - no fetching required
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should prioritize provides-api-from-def over provides-api-from-url', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-def': 'http://example.com/api/v3/openapi.json',
        'terasky.backstage.io/provides-api-from-url': 'http://example.com/swagger.json',
      };

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result?.success).toBe(true);
      expect(result?.useTextReference).toBe(true);
      expect(result?.definition).toBe('http://example.com/api/v3/openapi.json');
      // Should NOT fetch - $text reference takes priority
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from URL annotation when present', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-url': 'http://example.com/swagger.json',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result?.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://example.com/swagger.json',
        expect.any(Object),
      );
    });

    it('should prefer URL annotation over resource-ref annotation', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-url': 'http://example.com/swagger.json',
        'terasky.backstage.io/provides-api-from-resource-ref': JSON.stringify({
          kind: 'Service',
          name: 'my-service',
          apiVersion: 'v1',
          path: '/swagger.json',
          'target-protocol': 'http',
          'target-port': '80',
          'target-field': '.spec.clusterIP',
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      await fetcher.fetchApiFromAnnotations(annotations, 'test-cluster', 'default');

      // Should use URL, not resource-ref
      expect(mockFetch).toHaveBeenCalledWith(
        'http://example.com/swagger.json',
        expect.any(Object),
      );
      expect(mockResourceFetcher.proxyKubernetesRequest).not.toHaveBeenCalled();
    });

    it('should fetch from resource-ref annotation when URL is not present', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-resource-ref': JSON.stringify({
          kind: 'Service',
          name: 'my-service',
          apiVersion: 'v1',
          path: '/swagger.json',
          'target-protocol': 'http',
          'target-port': '80',
          'target-field': '.spec.clusterIP',
        }),
      };

      mockResourceFetcher.proxyKubernetesRequest.mockResolvedValueOnce({
        spec: { clusterIP: '10.96.0.100' },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"openapi": "3.0.0"}'),
      } as any);

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result?.success).toBe(true);
      expect(mockResourceFetcher.proxyKubernetesRequest).toHaveBeenCalled();
    });

    it('should return error for invalid resource-ref annotation', async () => {
      const annotations = {
        'terasky.backstage.io/provides-api-from-resource-ref': '{ invalid json }',
      };

      const result = await fetcher.fetchApiFromAnnotations(
        annotations,
        'test-cluster',
        'default',
      );

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('Invalid provides-api-from-resource-ref');
    });
  });

  describe('extractValueFromPath', () => {
    // Access the private method through the class prototype
    const extractValue = (obj: any, path: string) => {
      return (fetcher as any).extractValueFromPath(obj, path);
    };

    it('should extract simple nested property', () => {
      const obj = { spec: { clusterIP: '10.0.0.1' } };
      expect(extractValue(obj, '.spec.clusterIP')).toBe('10.0.0.1');
    });

    it('should extract array element', () => {
      const obj = { status: { ingress: [{ ip: '10.0.0.1' }, { ip: '10.0.0.2' }] } };
      expect(extractValue(obj, '.status.ingress[0].ip')).toBe('10.0.0.1');
      expect(extractValue(obj, '.status.ingress[1].ip')).toBe('10.0.0.2');
    });

    it('should handle path without leading dot', () => {
      const obj = { spec: { clusterIP: '10.0.0.1' } };
      expect(extractValue(obj, 'spec.clusterIP')).toBe('10.0.0.1');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { spec: {} };
      expect(extractValue(obj, '.spec.clusterIP')).toBeUndefined();
    });

    it('should return undefined for out-of-bounds array index', () => {
      const obj = { items: [{ name: 'first' }] };
      expect(extractValue(obj, '.items[5].name')).toBeUndefined();
    });

    it('should convert non-string values to string', () => {
      const obj = { port: 8080 };
      expect(extractValue(obj, '.port')).toBe('8080');
    });

    it('should handle complex nested paths with arrays', () => {
      const obj = {
        status: {
          loadBalancer: {
            ingress: [
              { ip: '10.0.0.1', ports: [{ port: 80 }] },
            ],
          },
        },
      };
      expect(extractValue(obj, '.status.loadBalancer.ingress[0].ip')).toBe('10.0.0.1');
    });
  });
});
