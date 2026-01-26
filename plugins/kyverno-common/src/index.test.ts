import {
  viewOverviewPermission,
  viewPolicyYAMLPermission,
  showKyvernoReportsPermission,
  kyvernoPermissions,
} from './index';

describe('kyverno-common', () => {
  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(viewOverviewPermission).toBeDefined();
      expect(viewPolicyYAMLPermission).toBeDefined();
      expect(showKyvernoReportsPermission).toBeDefined();
    });

    it('should export kyvernoPermissions array', () => {
      expect(kyvernoPermissions).toBeDefined();
      expect(Array.isArray(kyvernoPermissions)).toBe(true);
      expect(kyvernoPermissions).toHaveLength(3);
    });
  });
});

