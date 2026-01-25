import { createCrossplaneClaimAction } from './claim-templating';
import { ConfigReader } from '@backstage/config';

describe('createCrossplaneClaimAction', () => {
  const mockConfig = new ConfigReader({});

  it('should create an action with correct id', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(action.id).toBe('terasky:crossplane:claim:template');
  });

  it('should have correct schema', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(action.schema).toBeDefined();
    expect(action.schema?.input).toBeDefined();
    expect(action.schema?.output).toBeDefined();
  });

  it('should have handler function', () => {
    const action = createCrossplaneClaimAction({ config: mockConfig });
    expect(typeof action.handler).toBe('function');
  });

  describe('handler', () => {
    it('should process claim template', async () => {
      const action = createCrossplaneClaimAction({ config: mockConfig });
      
      const mockContext = {
        input: {
          claimTemplate: {
            apiVersion: 'test.example.com/v1',
            kind: 'TestClaim',
            metadata: { name: 'test-claim' },
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

