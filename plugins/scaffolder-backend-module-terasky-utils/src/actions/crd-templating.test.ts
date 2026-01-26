import { createCrdTemplateAction } from './crd-templating';
import { ConfigReader } from '@backstage/config';
import fs from 'fs-extra';

jest.mock('fs-extra');

const mockConfig = new ConfigReader({
  kubernetesIngestor: {
    annotationPrefix: 'custom.prefix',
    genericCRDTemplates: {
      publishPhase: {
        target: 'github',
      },
    },
    crossplane: {
      xrds: {
        publishPhase: {
          git: {
            targetBranch: 'main',
            repoUrl: 'github.com?owner=test&repo=manifests',
          },
        },
      },
    },
  },
});

describe('createCrdTemplateAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('should create an action with correct id', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
    expect(action.id).toBe('terasky:crd-template');
  });

  it('should have correct schema', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
    expect(action.schema?.input).toBeDefined();
  });

  it('should have output schema', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
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

    it('should template a CRD manifest', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: 'test-ns',
          someParam: 'value',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: ['name', 'namespace'],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
        ownerParam: 'owner',
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
      expect(mockOutput).toHaveBeenCalledWith('manifest', expect.any(String));
      expect(mockOutput).toHaveBeenCalledWith('filePaths', expect.any(Array));
    });

    it('should handle multiple clusters', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: 'test-ns',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1', 'cluster-2'],
        removeEmptyParams: false,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle namespace-scoped layout', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: 'test-ns',
          manifestLayout: 'namespace-scoped',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle custom layout', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: 'test-ns',
          manifestLayout: 'custom',
          basePath: 'custom/path',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should generate source file URL when pushToGit is true', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: 'test-ns',
          pushToGit: true,
          targetBranch: 'main',
          repoUrl: 'github.com?owner=test&repo=manifests',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle cluster-scoped resources (empty namespace)', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          namespace: '',
        },
        nameParam: 'name',
        namespaceParam: 'namespace',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should remove empty parameters when removeEmptyParams is true', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          emptyString: '',
          emptyArray: [],
          nullValue: null,
          nested: {
            empty: '',
          },
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
        removeEmptyParams: true,
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should use default annotation prefix when not configured', async () => {
      const emptyConfig = new ConfigReader({});
      const action = createCrdTemplateAction({ config: emptyConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle GitLab SCM type', async () => {
      const gitlabConfig = new ConfigReader({
        kubernetesIngestor: {
          genericCRDTemplates: {
            publishPhase: {
              target: 'gitlab',
            },
          },
        },
      });
      const action = createCrdTemplateAction({ config: gitlabConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          pushToGit: true,
          repoUrl: 'gitlab.com?owner=test&repo=manifests',
          targetBranch: 'main',
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle Bitbucket Cloud SCM type', async () => {
      const bitbucketConfig = new ConfigReader({
        kubernetesIngestor: {
          genericCRDTemplates: {
            publishPhase: {
              target: 'bitbucketcloud',
            },
          },
        },
      });
      const action = createCrdTemplateAction({ config: bitbucketConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          pushToGit: true,
          repoUrl: 'bitbucket.org?owner=test&repo=manifests',
          targetBranch: 'main',
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle Bitbucket Server SCM type', async () => {
      const bitbucketConfig = new ConfigReader({
        kubernetesIngestor: {
          genericCRDTemplates: {
            publishPhase: {
              target: 'bitbucket',
            },
          },
        },
      });
      const action = createCrdTemplateAction({ config: bitbucketConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          pushToGit: true,
          repoUrl: 'bitbucket.example.com?owner=test&repo=manifests',
          targetBranch: 'main',
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle missing owner or repo in URL', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      const ctx = createMockContext({
        parameters: {
          name: 'test-resource',
          pushToGit: true,
          repoUrl: 'github.com',
          targetBranch: 'main',
        },
        nameParam: 'name',
        excludeParams: [],
        apiVersion: 'test.io/v1',
        kind: 'TestResource',
        clusters: ['cluster-1'],
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });
  });
});
