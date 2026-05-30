import { createCrossplaneClaimAction } from './claim-templating';
import { ConfigReader } from '@backstage/config';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as httpsModule from 'https';

jest.mock('fs-extra');
jest.mock('https', () => ({ get: jest.fn() }));

const mockConfig = new ConfigReader({
  kubernetesIngestor: {
    annotationPrefix: 'custom.prefix',
    crossplane: {
      xrds: {
        publishPhase: {
          target: 'github',
          git: {
            targetBranch: 'main',
            repoUrl: 'github.com?owner=test&repo=manifests',
          },
        },
      },
    },
  },
});

// Helper: make https.get behave as if the remote kustomization.yaml returns given content (or 404)
function mockHttpsGet(statusCode: number, body?: string) {
  (httpsModule.get as jest.Mock).mockImplementation((_url, _opts, callback) => {
    const res = {
      statusCode,
      resume: jest.fn(),
      on: jest.fn((event, handler) => {
        if (statusCode === 200) {
          if (event === 'data') handler(body ?? '');
          if (event === 'end') handler();
        }
      }),
    };
    callback(res);
    return { on: jest.fn() };
  });
}

describe('createCrossplaneClaimAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
    // default: no existing kustomization.yaml in remote
    mockHttpsGet(404);
  });

  it('should create an action with correct id', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(action.id).toBe('terasky:claim-template');
  });

  it('should have correct schema', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(action.schema?.input).toBeDefined();
  });

  it('should have output schema', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(action.schema?.output).toBeDefined();
  });

  describe('handler', () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const mockOutput = jest.fn();

    const createMockContext = (input: any) => ({
      input,
      logger: mockLogger,
      output: mockOutput,
      workspacePath: '/tmp/workspace',
    });

    it('should throw error when name is foo', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: { xrName: 'foo', xrNamespace: 'default' },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await expect(action.handler!(ctx as any)).rejects.toThrow(
        "myParameter cannot be 'foo'"
      );
    });

    it('should template a claim manifest', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          someParam: 'value',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
        ownerParam: 'owner',
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
      expect(mockOutput).toHaveBeenCalledWith('manifest', expect.any(String));
      expect(mockOutput).toHaveBeenCalledWith('manifestEncoded', expect.any(String));
      expect(mockOutput).toHaveBeenCalledWith('filePaths', expect.any(Array));
    });

    it('should handle multiple clusters', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1', 'cluster-2'],
        removeEmptyParams: false,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle namespace-scoped layout', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          manifestLayout: 'namespace-scoped',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle custom layout', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          manifestLayout: 'custom',
          basePath: 'custom/path',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should generate source file URL when pushToGit is true', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'github.com?owner=test&repo=manifests',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle empty namespace', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: '',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should remove nested excluded params', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          nested: {
            param: 'value',
          },
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['nested.param'],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should generate GitLab URL when scmType is gitlab', async () => {
      const gitlabConfig = new ConfigReader({
        kubernetesIngestor: {
          annotationPrefix: 'custom.prefix',
          crossplane: {
            xrds: {
              publishPhase: {
                target: 'gitlab',
                git: {
                  targetBranch: 'main',
                  repoUrl: 'gitlab.com?owner=test&repo=manifests',
                },
              },
            },
          },
        },
      });
      const action = createCrossplaneClaimAction({ config: gitlabConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'gitlab.com?owner=test&repo=manifests',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should generate Bitbucket Cloud URL when scmType is bitbucketcloud', async () => {
      const bitbucketCloudConfig = new ConfigReader({
        kubernetesIngestor: {
          annotationPrefix: 'custom.prefix',
          crossplane: {
            xrds: {
              publishPhase: {
                target: 'bitbucketcloud',
                git: {
                  targetBranch: 'main',
                  repoUrl: 'bitbucket.org?owner=test&repo=manifests',
                },
              },
            },
          },
        },
      });
      const action = createCrossplaneClaimAction({ config: bitbucketCloudConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'bitbucket.org?owner=test&repo=manifests',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should generate Bitbucket Server URL when scmType is bitbucket', async () => {
      const bitbucketServerConfig = new ConfigReader({
        kubernetesIngestor: {
          annotationPrefix: 'custom.prefix',
          crossplane: {
            xrds: {
              publishPhase: {
                target: 'bitbucket',
                git: {
                  targetBranch: 'main',
                  repoUrl: 'bitbucket.example.com?owner=test&repo=manifests',
                },
              },
            },
          },
        },
      });
      const action = createCrossplaneClaimAction({ config: bitbucketServerConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'bitbucket.example.com?owner=test&repo=manifests',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle invalid repoUrl without owner/repo params', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'github.com', // No owner/repo params
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should always exclude showAdvancedSettings from the manifest spec', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          showAdvancedSettings: true,
          someParam: 'value',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: false,
        ownerParam: 'owner',
      });

      await action.handler!(ctx as any);

      const writtenContent: string = (fs.outputFileSync as jest.Mock).mock.calls[0][1];
      const manifest = yaml.load(writtenContent) as any;
      expect(manifest.spec).not.toHaveProperty('showAdvancedSettings');
      expect(manifest.spec).toHaveProperty('someParam', 'value');
    });

    it('should order spec fields according to specFieldOrder', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          gamma: 'g',
          alpha: 'a',
          beta: 'b',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: false,
        ownerParam: 'owner',
        specFieldOrder: ['alpha', 'beta', 'gamma'],
      });

      await action.handler!(ctx as any);

      const writtenContent: string = (fs.outputFileSync as jest.Mock).mock.calls[0][1];
      const manifest = yaml.load(writtenContent) as any;
      const specKeys = Object.keys(manifest.spec);
      expect(specKeys).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should place fields not in specFieldOrder after ordered fields', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'test-claim',
          xrNamespace: 'test-ns',
          extra: 'e',
          first: 'f',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1',
        kind: 'TestClaim',
        clusters: ['cluster-1'],
        removeEmptyParams: false,
        ownerParam: 'owner',
        specFieldOrder: ['first'],
      });

      await action.handler!(ctx as any);

      const writtenContent: string = (fs.outputFileSync as jest.Mock).mock.calls[0][1];
      const manifest = yaml.load(writtenContent) as any;
      const specKeys = Object.keys(manifest.spec);
      expect(specKeys).toEqual(['first', 'extra']);
    });
  });

  // ── xrdPathTemplate: path resolution ────────────────────────────────────────

  describe('xrdPathTemplate – path resolution from terasky.backstage.io/target-path XRD annotation', () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockOutput = jest.fn();
    const createMockContext = (input: any) => ({
      input,
      logger: mockLogger,
      output: mockOutput,
      workspacePath: '/tmp/workspace',
    });

    beforeEach(() => {
      jest.clearAllMocks();
      (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
      mockHttpsGet(404);
    });

    it('writes manifest to workspace root when xrdPathTemplate is set (targetPath controls repo location)', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: { xrName: 'my-db', dc: 'eu-west-1', owner: 'group:default/team' },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'Database',
        clusters: ['temp'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        xrdPathTemplate: 'presets/{dc}/{xrName}',
      });

      await action.handler!(ctx as any);

      const [[writtenPath]] = (fs.outputFileSync as jest.Mock).mock.calls;
      // file goes to workspace root — targetPath in the publish step puts it at the correct repo path
      // this prevents path doubling: targetPath="presets/eu-west-1/my-db" + "presets/eu-west-1/my-db/my-db.yaml"
      expect(writtenPath).toBe('/tmp/workspace/my-db.yaml');
    });

    it('does NOT double the path when xrdPathTemplate matches the annotation value', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: { xrName: 'test-vm', dc: 'va4', env: 'sm-stage', owner: 'group:default/team' },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'VirtualMachine',
        clusters: ['temp'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        xrdPathTemplate: 'clusters/{dc}/{env}/virtualmachine-parent',
      });

      await action.handler!(ctx as any);

      const [[writtenPath]] = (fs.outputFileSync as jest.Mock).mock.calls;
      // must be just workspaceRoot/test-vm.yaml — NOT workspaceRoot/clusters/va4/.../test-vm.yaml
      expect(writtenPath).toBe('/tmp/workspace/test-vm.yaml');
      expect(writtenPath).not.toContain('clusters');
    });

    it('overrides manifestLayout: cluster-scoped — file still goes to workspace root', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'my-db',
          dc: 'eu-west-1',
          manifestLayout: 'cluster-scoped',
          owner: 'group:default/team',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'Database',
        clusters: ['cluster-prod'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        xrdPathTemplate: 'presets/{dc}/{xrName}',
      });

      await action.handler!(ctx as any);

      const [[writtenPath]] = (fs.outputFileSync as jest.Mock).mock.calls;
      // annotation overrides cluster-scoped layout → file at workspace root
      expect(writtenPath).toBe('/tmp/workspace/my-db.yaml');
    });

    it('still writes the manifest file (action completes successfully) for any template', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'app-v2',
          dc: 'us-east',
          env: 'production',
          owner: 'group:default/team',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'App',
        clusters: ['temp'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        xrdPathTemplate: 'clusters/{dc}/{env}/apps/{xrName}',
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
      const [[writtenPath]] = (fs.outputFileSync as jest.Mock).mock.calls;
      expect(writtenPath).toBe('/tmp/workspace/app-v2.yaml');
    });

    it('source-file-url annotation uses resolved repo path, not workspace root path', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: { xrName: 'my-db', dc: 'eu-west-1', owner: 'group:default/team', pushToGit: true },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'Database',
        clusters: ['temp'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        xrdPathTemplate: 'presets/{dc}/{xrName}',
      });

      await action.handler!(ctx as any);

      const [[, content]] = (fs.outputFileSync as jest.Mock).mock.calls;
      // source-file-url must include the full resolved repo path
      expect(content).toContain('presets/eu-west-1/my-db/my-db.yaml');
      // must NOT be just the bare filename without the directory prefix
      expect(content).not.toContain('source-file-url: https://github.com/test/manifests/blob/main/my-db.yaml');
    });

    it('falls back to manifestLayout when xrdPathTemplate is absent', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          xrName: 'my-db',
          xrNamespace: 'default',
          manifestLayout: 'namespace-scoped',
          owner: 'group:default/team',
        },
        nameParam: 'xrName',
        namespaceParam: 'xrNamespace',
        excludeParams: ['xrName', 'xrNamespace'],
        apiVersion: 'test.io/v1alpha1',
        kind: 'Database',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
        ownerParam: 'owner',
        // no xrdPathTemplate
      });

      await action.handler!(ctx as any);

      const [[writtenPath]] = (fs.outputFileSync as jest.Mock).mock.calls;
      // namespace-scoped: {namespace}/{kind}/{name}.yaml
      expect(writtenPath).toBe('/tmp/workspace/default/Database/my-db.yaml');
    });
  });

  // ── generateKustomization ────────────────────────────────────────────────────

  describe('generateKustomization – kustomization.yaml creation and merge', () => {
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    const mockOutput = jest.fn();
    const createMockContext = (input: any) => ({
      input,
      logger: mockLogger,
      output: mockOutput,
      workspacePath: '/tmp/workspace',
    });

    const baseInput = {
      parameters: { xrName: 'my-db', dc: 'eu-west-1', owner: 'group:default/team' },
      nameParam: 'xrName',
      namespaceParam: 'xrNamespace',
      excludeParams: ['xrName', 'xrNamespace'],
      apiVersion: 'test.io/v1alpha1',
      kind: 'Database',
      clusters: ['temp'],
      removeEmptyParams: true,
      ownerParam: 'owner',
      xrdPathTemplate: 'presets/{dc}/{xrName}',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
      mockHttpsGet(404);
    });

    it('creates kustomization.yaml in the same directory as the manifest', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: true });

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const kustomizationCall = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      expect(kustomizationCall).toBeDefined();
      // kustomization.yaml sits next to the manifest in the workspace root
      expect(kustomizationCall[0]).toBe('/tmp/workspace/kustomization.yaml');
    });

    it('kustomization.yaml contains reference to the generated manifest file', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: true });

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const [, kustomizationContent] = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      expect(kustomizationContent).toContain('my-db.yaml');
      expect(kustomizationContent).toContain('Kustomization');
    });

    it('fetches kustomization.yaml using resolved xrdPathTemplate repo path (not empty basePath)', async () => {
      mockHttpsGet(404);
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({
        ...baseInput,
        generateKustomization: true,
        // xrdPathTemplate with {dc} and {xrName} → resolves to presets/eu-west-1/my-db
        xrdPathTemplate: 'presets/{dc}/{xrName}',
        parameters: { xrName: 'my-db', dc: 'eu-west-1', owner: 'group:default/team' },
      });

      await action.handler!(ctx as any);

      const getCall = (httpsModule.get as jest.Mock).mock.calls[0];
      const fetchUrl: string = getCall[0];
      // must include the resolved path, NOT start with '/kustomization.yaml'
      expect(fetchUrl).toContain('presets/eu-west-1/my-db/kustomization.yaml');
    });

    it('merges new entry into existing kustomization.yaml fetched from GitHub', async () => {
      const existingKustomization = `---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - existing-resource.yaml
`;
      mockHttpsGet(200, existingKustomization);

      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: true });

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const [, kustomizationContent] = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      // must keep existing entry
      expect(kustomizationContent).toContain('existing-resource.yaml');
      // must add new entry
      expect(kustomizationContent).toContain('my-db.yaml');
    });

    it('does NOT duplicate an entry already present in kustomization.yaml', async () => {
      const existingKustomization = `---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - my-db.yaml
`;
      mockHttpsGet(200, existingKustomization);

      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: true });

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const [, kustomizationContent] = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      const occurrences = (kustomizationContent.match(/my-db\.yaml/g) ?? []).length;
      expect(occurrences).toBe(1);
    });

    it('does NOT write kustomization.yaml when generateKustomization is false', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: false });

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const kustomizationCall = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      expect(kustomizationCall).toBeUndefined();
    });

    it('does NOT write kustomization.yaml when generateKustomization is absent', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput });  // no generateKustomization

      await action.handler!(ctx as any);

      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const kustomizationCall = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      expect(kustomizationCall).toBeUndefined();
    });

    it('gracefully continues if GitHub fetch fails', async () => {
      (httpsModule.get as jest.Mock).mockImplementation(() => {
        const emitter = { on: jest.fn((event: string, handler: () => void) => { if (event === 'error') handler(); }) };
        return emitter;
      });

      const action = createCrossplaneClaimAction({ config: mockConfig });
      const ctx = createMockContext({ ...baseInput, generateKustomization: true });

      await expect(action.handler!(ctx as any)).resolves.not.toThrow();

      // kustomization.yaml is still written with at least the new file
      const calls = (fs.outputFileSync as jest.Mock).mock.calls;
      const kustomizationCall = calls.find(([p]: [string]) =>
        p.endsWith('kustomization.yaml'),
      );
      expect(kustomizationCall).toBeDefined();
      expect(kustomizationCall[1]).toContain('my-db.yaml');
    });
  });
});
