import { VcfAutomationClient, vcfAutomationApiRef } from './index';

describe('vcf-automation api exports', () => {
  it('should export VcfAutomationClient', () => {
    expect(VcfAutomationClient).toBeDefined();
  });

  it('should export vcfAutomationApiRef', () => {
    expect(vcfAutomationApiRef).toBeDefined();
    expect(vcfAutomationApiRef.id).toBe('plugin.vcf-automation.service');
  });
});

