import { TerraformModuleSchema } from './TerraformModuleSchema';

describe('TerraformModuleSchema', () => {
  it('should be defined', () => {
    expect(TerraformModuleSchema).toBeDefined();
  });

  it('should have uiOptions property', () => {
    expect(TerraformModuleSchema.uiOptions).toBeDefined();
    expect(TerraformModuleSchema.uiOptions.type).toBe('object');
  });

  it('should have returnValue property', () => {
    expect(TerraformModuleSchema.returnValue).toBeDefined();
    expect(TerraformModuleSchema.returnValue.type).toBe('object');
  });
});

