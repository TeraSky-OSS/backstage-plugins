import { createCrdTemplateAction } from './crd-templating';
import { ConfigReader } from '@backstage/config';

const mockConfig = new ConfigReader({});

describe('createCrdTemplateAction', () => {
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
});
