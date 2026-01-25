import {
  viewMetricsPermission,
  vcfOperationsPermissions,
} from './index';

describe('vcf-operations-common', () => {
  describe('permissions', () => {
    it('should export viewMetricsPermission', () => {
      expect(viewMetricsPermission).toBeDefined();
      expect(viewMetricsPermission.name).toBe('vcf-operations.metrics.view');
    });

    it('should export vcfOperationsPermissions array', () => {
      expect(vcfOperationsPermissions).toBeDefined();
      expect(Array.isArray(vcfOperationsPermissions)).toBe(true);
      expect(vcfOperationsPermissions).toHaveLength(1);
      expect(vcfOperationsPermissions).toContain(viewMetricsPermission);
    });
  });
});

