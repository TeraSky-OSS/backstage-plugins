import {
  EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE,
  EDUCATES_WORKSHOP_RESOURCE_TYPE,
  portalViewPermission,
  workshopStartPermission,
  educatesPermissions,
} from './index';

describe('educates-common', () => {
  describe('resource types', () => {
    it('should export EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE', () => {
      expect(EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE).toBe('educates-training-portal');
    });

    it('should export EDUCATES_WORKSHOP_RESOURCE_TYPE', () => {
      expect(EDUCATES_WORKSHOP_RESOURCE_TYPE).toBe('educates-workshop');
    });
  });

  describe('permissions', () => {
    it('should export portalViewPermission', () => {
      expect(portalViewPermission).toBeDefined();
      expect(portalViewPermission.name).toBe('educates.portal.view');
    });

    it('should export workshopStartPermission', () => {
      expect(workshopStartPermission).toBeDefined();
      expect(workshopStartPermission.name).toBe('educates.workshop.start');
    });

    it('should export educatesPermissions array', () => {
      expect(educatesPermissions).toBeDefined();
      expect(Array.isArray(educatesPermissions)).toBe(true);
      expect(educatesPermissions).toHaveLength(2);
      expect(educatesPermissions).toContain(portalViewPermission);
      expect(educatesPermissions).toContain(workshopStartPermission);
    });
  });
});

