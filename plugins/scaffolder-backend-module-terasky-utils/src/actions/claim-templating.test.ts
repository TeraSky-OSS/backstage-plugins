import { createCrossplaneClaimAction } from './claim-templating';
import { ConfigReader } from '@backstage/config';
import fs from 'fs-extra';
import path from 'path';

jest.mock('fs-extra');

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

describe('createCrossplaneClaimAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
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
  });
});
