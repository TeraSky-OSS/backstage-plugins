import { createCrdTemplateAction } from './crd-templating';
import { ConfigReader } from '@backstage/config';

describe('createCrdTemplateAction', () => {
  const mockConfig = new ConfigReader({});

  it('should create an action with correct id', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
    expect(action.id).toBe('terasky:crd:template');
  });

  it('should have correct schema', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
    expect(action.schema).toBeDefined();
    expect(action.schema?.input).toBeDefined();
    expect(action.schema?.output).toBeDefined();
  });

  it('should have handler function', () => {
    const action = createCrdTemplateAction({ config: mockConfig });
    expect(typeof action.handler).toBe('function');
  });

  describe('handler', () => {
    it('should process CRD template', async () => {
      const action = createCrdTemplateAction({ config: mockConfig });
      
      const mockContext = {
        input: {
          crdTemplate: {
            apiVersion: 'apiextensions.k8s.io/v1',
            kind: 'CustomResourceDefinition',
            metadata: { name: 'test-crd' },
            spec: {},
          },
          values: {},
        },
        output: jest.fn(),
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
        workspacePath: '/tmp/test',
        createTemporaryDirectory: jest.fn(),
        checkpoint: jest.fn(),
        getInitiatorCredentials: jest.fn(),
      };

      await action.handler(mockContext as any);

      expect(mockContext.output).toHaveBeenCalled();
    });
  });
});

