import {
  viewOverviewPermission,
  viewPolicyYAMLPermission,
  showKyvernoReportsPermission,
  kyvernoPermissions,
  getPolicyPathsForSource,
  getAllPolicyFallbackPaths,
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

  describe('getPolicyPathsForSource', () => {
    it('resolves native ValidatingAdmissionPolicy sources to the admissionregistration.k8s.io API, not a Kyverno CRD path', () => {
      const paths = getPolicyPathsForSource('ValidatingAdmissionPolicy', 'deny-svc-binding', 'default');
      expect(paths).not.toBeNull();
      expect(paths).toContainEqual({ path: '/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies/deny-svc-binding' });
    });

    it('resolves native MutatingAdmissionPolicy sources to the admissionregistration.k8s.io API', () => {
      const paths = getPolicyPathsForSource('MutatingAdmissionPolicy', 'my-policy');
      expect(paths).not.toBeNull();
      expect(paths).toContainEqual({ path: '/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicies/my-policy' });
    });

    it('returns null for an unknown source so the caller falls back to getAllPolicyFallbackPaths', () => {
      expect(getPolicyPathsForSource('some-unknown-source', 'my-policy')).toBeNull();
    });
  });

  describe('getAllPolicyFallbackPaths', () => {
    it('includes native admission policy paths as a fallback', () => {
      const paths = getAllPolicyFallbackPaths('deny-svc-binding');
      expect(paths).toContainEqual({ path: '/apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies/deny-svc-binding' });
      expect(paths).toContainEqual({ path: '/apis/admissionregistration.k8s.io/v1/mutatingadmissionpolicies/deny-svc-binding' });
    });
  });
});

