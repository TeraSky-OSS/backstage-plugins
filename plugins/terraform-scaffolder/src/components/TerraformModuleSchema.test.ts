import { TerraformModuleSchema } from './TerraformModuleSchema';

describe('TerraformModuleSchema', () => {
  it('should be defined', () => {
    expect(TerraformModuleSchema).toBeDefined();
  });

  it('should be a valid schema object', () => {
    expect(typeof TerraformModuleSchema).toBe('object');
  });

  it('should have uiOptions property', () => {
    expect(TerraformModuleSchema).toHaveProperty('uiOptions');
  });

  it('should have returnValue property', () => {
    expect(TerraformModuleSchema).toHaveProperty('returnValue');
  });

  it('should have returnValue type as object', () => {
    expect(TerraformModuleSchema.returnValue?.type).toBe('object');
  });
});
