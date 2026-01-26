import {
  showKyvernoReportsPermission,
  viewPolicyYAMLPermission,
  kyvernoPermissions,
} from './permissions';

describe('permissions', () => {
  describe('showKyvernoReportsPermission', () => {
    it('should have correct name', () => {
      expect(showKyvernoReportsPermission.name).toBe('kyverno.reports.view');
    });

    it('should have read action attribute', () => {
      expect(showKyvernoReportsPermission.attributes.action).toBe('read');
    });

    it('should be a permission object', () => {
      expect(showKyvernoReportsPermission.type).toBe('basic');
    });
  });

  describe('viewPolicyYAMLPermission', () => {
    it('should have correct name', () => {
      expect(viewPolicyYAMLPermission.name).toBe('kyverno.policy.view-yaml');
    });

    it('should have read action attribute', () => {
      expect(viewPolicyYAMLPermission.attributes.action).toBe('read');
    });

    it('should be a permission object', () => {
      expect(viewPolicyYAMLPermission.type).toBe('basic');
    });
  });

  describe('kyvernoPermissions', () => {
    it('should export all permissions', () => {
      expect(kyvernoPermissions).toHaveLength(2);
      expect(kyvernoPermissions).toContain(showKyvernoReportsPermission);
      expect(kyvernoPermissions).toContain(viewPolicyYAMLPermission);
    });
  });
});

