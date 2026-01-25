import { TerraformScaffolderClient } from './TerraformScaffolderClient';
import { ConfigReader } from '@backstage/config';

describe('TerraformScaffolderClient', () => {
  const mockConfigApi = {
    getString: jest.fn(),
    getStringArray: jest.fn(),
    getOptionalStringArray: jest.fn(),
    getConfigArray: jest.fn(),
    getBoolean: jest.fn(),
    has: jest.fn(),
    getOptionalBoolean: jest.fn(),
  };

  const mockCatalogApi = {
    getEntities: jest.fn(),
  };

  const mockIdentityApi = {
    getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
  };

  let client: TerraformScaffolderClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigApi.getString.mockReturnValue('http://localhost:7007');
    mockConfigApi.has.mockReturnValue(false);
    mockConfigApi.getBoolean.mockReturnValue(false);
    mockCatalogApi.getEntities.mockResolvedValue({ items: [] });

    client = new TerraformScaffolderClient({
      configApi: mockConfigApi as any,
      catalogApi: mockCatalogApi as any,
      identityApi: mockIdentityApi as any,
    });
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(client).toBeDefined();
    });
  });

  describe('getModuleReferences', () => {
    it('should return empty array when no modules configured', async () => {
      const result = await client.getModuleReferences();
      expect(result).toEqual([]);
    });

    it('should return modules from catalog', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [
          {
            kind: 'Resource',
            metadata: {
              name: 'test-module',
              description: 'A test module',
              annotations: {
                'terasky.backstage.io/terraform-module-url': 'https://github.com/org/module',
                'terasky.backstage.io/terraform-module-name': 'test-module',
                'terasky.backstage.io/terraform-module-ref': 'v1.0.0',
                'terasky.backstage.io/terraform-module-description': 'Test module description',
              },
            },
          },
        ],
      });

      const result = await client.getModuleReferences();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-module');
      expect(result[0].url).toBe('https://github.com/org/module');
      expect(result[0].refs).toEqual(['v1.0.0']);
    });

    it('should filter out entities without required annotations', async () => {
      mockCatalogApi.getEntities.mockResolvedValue({
        items: [
          {
            kind: 'Resource',
            metadata: {
              name: 'incomplete-module',
              annotations: {
                'terasky.backstage.io/terraform-module-url': 'https://github.com/org/module',
                // Missing terraform-module-name
              },
            },
          },
        ],
      });

      const result = await client.getModuleReferences();
      expect(result).toHaveLength(0);
    });

    it('should return modules from config', async () => {
      mockConfigApi.has.mockImplementation((key: string) => 
        key === 'terraformScaffolder.moduleReferences'
      );
      mockConfigApi.getConfigArray.mockReturnValue([
        {
          getString: (key: string) => {
            if (key === 'name') return 'config-module';
            if (key === 'url') return 'https://github.com/org/terraform-module';
            return '';
          },
          getOptionalString: (key: string) => {
            if (key === 'ref') return 'v2.0.0';
            if (key === 'description') return 'Config module';
            return undefined;
          },
          getOptionalStringArray: () => undefined,
        },
      ]);

      const result = await client.getModuleReferences();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('config-module');
    });

    it('should handle errors gracefully', async () => {
      mockCatalogApi.getEntities.mockRejectedValue(new Error('Catalog error'));

      const result = await client.getModuleReferences();
      expect(result).toEqual([]);
    });
  });

  describe('getModuleVersions', () => {
    it('should return refs for non-registry modules', async () => {
      const moduleRef = {
        name: 'test-module',
        url: 'https://github.com/org/module',
        refs: ['v1.0.0', 'v1.1.0'],
        isRegistryModule: false,
      };

      const result = await client.getModuleVersions(moduleRef);
      expect(result).toEqual(['v1.0.0', 'v1.1.0']);
    });

    it('should fetch versions for registry modules', async () => {
      const moduleRef = {
        name: 'registry-module',
        url: 'https://github.com/hashicorp/terraform-aws-vpc',
        moduleURL: 'hashicorp/vpc/aws',
        refs: [],
        isRegistryModule: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          modules: [{
            versions: [
              { version: '1.0.0' },
              { version: '2.0.0' },
              { version: '1.5.0' },
            ],
          }],
        }),
      });

      const result = await client.getModuleVersions(moduleRef);

      expect(result).toContain('v2.0.0');
      expect(result).toContain('v1.5.0');
      expect(result).toContain('v1.0.0');
    });

    it('should return empty array on fetch error', async () => {
      const moduleRef = {
        name: 'registry-module',
        url: 'https://github.com/hashicorp/terraform-aws-vpc',
        moduleURL: 'hashicorp/vpc/aws',
        refs: [],
        isRegistryModule: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await client.getModuleVersions(moduleRef);
      expect(result).toEqual([]);
    });
  });

  describe('getModuleVariables', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should fetch variables from GitHub raw URL', async () => {
      const moduleRef = {
        name: 'test-module',
        url: 'https://github.com/org/terraform-module',
        refs: ['v1.0.0'],
        isRegistryModule: false,
      };

      const tfContent = `
variable "name" {
  type        = string
  description = "The name of the resource"
  default     = "default-name"
}

variable "count" {
  type        = number
  description = "The count"
}
`;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(tfContent),
      });

      const result = await client.getModuleVariables(moduleRef, 'v1.0.0');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('name');
      expect(result[0].type).toBe('string');
      expect(result[0].description).toBe('The name of the resource');
      expect(result[0].default).toBe('default-name');
    });

    it('should throw error on fetch error', async () => {
      const moduleRef = {
        name: 'test-module',
        url: 'https://github.com/org/terraform-module',
        refs: ['v1.0.0'],
        isRegistryModule: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(client.getModuleVariables(moduleRef, 'v1.0.0')).rejects.toThrow();
    });

    it('should use proxy for GitHub when configured', async () => {
      mockConfigApi.getBoolean.mockReturnValue(true);

      const moduleRef = {
        name: 'test-module',
        url: 'https://github.com/org/terraform-module',
        refs: ['v1.0.0'],
        isRegistryModule: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      await client.getModuleVariables(moduleRef, 'v1.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/github-raw'),
        expect.any(Object)
      );
    });
  });
});

