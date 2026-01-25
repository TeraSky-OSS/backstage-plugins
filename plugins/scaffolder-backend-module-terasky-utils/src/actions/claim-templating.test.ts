import { createCrossplaneClaimAction } from './claim-templating';
import { ConfigReader } from '@backstage/config';

const mockConfig = new ConfigReader({});

describe('createCrossplaneClaimAction', () => {
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
});
