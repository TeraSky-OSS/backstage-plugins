import { createSpringInitializerAction } from './spring-initializer';

describe('createSpringInitializerAction', () => {
  it('should create action', () => {
    const mockConfig = {
      getOptionalString: jest.fn().mockReturnValue('https://start.spring.io'),
    };
    
    const action = createSpringInitializerAction({ config: mockConfig });
    
    expect(action).toBeDefined();
    expect(action.id).toBe('terasky:spring-initializer');
  });
});
