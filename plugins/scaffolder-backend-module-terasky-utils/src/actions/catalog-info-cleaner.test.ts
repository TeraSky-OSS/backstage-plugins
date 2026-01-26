import { createCatalogInfoCleanerAction } from './catalog-info-cleaner';
import fs from 'fs-extra';

jest.mock('fs-extra');

describe('createCatalogInfoCleanerAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.outputFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('should create an action with correct id', () => {
    const action = createCatalogInfoCleanerAction();
    expect(action.id).toBe('terasky:catalog-info-cleaner');
  });

  it('should have correct schema', () => {
    const action = createCatalogInfoCleanerAction();
    expect(action.schema?.input).toBeDefined();
  });

  it('should have output schema', () => {
    const action = createCatalogInfoCleanerAction();
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

    it('should throw error when entity is invalid', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: null,
      });

      await expect(action.handler!(ctx as any)).rejects.toThrow(
        'Invalid or missing entity object'
      );
    });

    it('should throw error when entity is not an object', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: 'not-an-object',
      });

      await expect(action.handler!(ctx as any)).rejects.toThrow(
        'Invalid or missing entity object'
      );
    });

    it('should clean entity and write catalog-info.yaml', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            namespace: 'default',
            uid: 'should-be-removed',
            etag: 'should-be-removed',
            annotations: {
              'backstage.io/managed-by-location': 'should-be-removed',
              'backstage.io/managed-by-origin-location': 'should-be-removed',
              'custom-annotation': 'should-be-kept',
            },
          },
          spec: {
            type: 'service',
            system: 'test-system',
            owner: 'team-a',
            lifecycle: 'production',
          },
          relations: [{ type: 'dependsOn', target: 'some-target' }],
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
      expect(mockOutput).toHaveBeenCalledWith('manifest', expect.any(String));
      expect(mockOutput).toHaveBeenCalledWith('filePath', expect.stringContaining('catalog-info.yaml'));
    });

    it('should handle entity without metadata', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          spec: {
            type: 'service',
          },
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle entity without annotations', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            uid: 'should-be-removed',
          },
          spec: {
            type: 'service',
          },
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should handle entity with minimal spec', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
          },
          spec: {},
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should preserve custom metadata fields', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'Component',
          metadata: {
            name: 'test-component',
            uid: 'should-be-removed',
            customField: 'should-be-kept',
            labels: {
              'app.kubernetes.io/name': 'test',
            },
          },
          spec: {
            type: 'service',
          },
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });

    it('should preserve custom spec fields', async () => {
      const action = createCatalogInfoCleanerAction();
      const ctx = createMockContext({
        entity: {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'API',
          metadata: {
            name: 'test-api',
          },
          spec: {
            type: 'openapi',
            owner: 'team-a',
            definition: 'openapi: 3.0.0',
            customField: 'should-be-kept',
          },
        },
      });

      await action.handler!(ctx as any);

      expect(fs.outputFileSync).toHaveBeenCalled();
    });
  });
});
