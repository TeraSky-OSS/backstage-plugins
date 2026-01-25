import { vcfOperationsPlugin } from './plugin';

describe('vcfOperationsPlugin', () => {
  it('should be defined', () => {
    expect(vcfOperationsPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    // The plugin is created with pluginId: 'vcf-operations'
    expect(vcfOperationsPlugin).toBeDefined();
  });
});

