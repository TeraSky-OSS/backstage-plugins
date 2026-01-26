import {
  viewProjectDetailsPermission,
  viewDeploymentHistoryPermission,
  viewDeploymentsUserEventsPermission,
  showDeploymentResourcesDataPermission,
  vmPowerManagementPermission,
  supervisorResourceEditPermission,
  vcfAutomationPermissions,
} from './index';

describe('vcf-automation-common', () => {
  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(viewProjectDetailsPermission).toBeDefined();
      expect(viewDeploymentHistoryPermission).toBeDefined();
      expect(viewDeploymentsUserEventsPermission).toBeDefined();
      expect(showDeploymentResourcesDataPermission).toBeDefined();
      expect(vmPowerManagementPermission).toBeDefined();
      expect(supervisorResourceEditPermission).toBeDefined();
    });

    it('should export vcfAutomationPermissions array', () => {
      expect(vcfAutomationPermissions).toBeDefined();
      expect(Array.isArray(vcfAutomationPermissions)).toBe(true);
      expect(vcfAutomationPermissions).toHaveLength(6);
    });
  });
});

