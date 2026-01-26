import {
  portalViewPermission,
  workshopStartPermission,
  educatesPermissions,
  EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE,
  EDUCATES_WORKSHOP_RESOURCE_TYPE,
  EDUCATES_VIEW_PORTAL,
  EDUCATES_START_WORKSHOP,
} from './permissions';

describe('educates permissions', () => {
  describe('resource types', () => {
    it('should export EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE', () => {
      expect(EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE).toBe('educates-training-portal');
    });

    it('should export EDUCATES_WORKSHOP_RESOURCE_TYPE', () => {
      expect(EDUCATES_WORKSHOP_RESOURCE_TYPE).toBe('educates-workshop');
    });
  });

  describe('portalViewPermission', () => {
    it('should have correct name', () => {
      expect(portalViewPermission.name).toBe('educates.portal.view');
    });

    it('should have read action', () => {
      expect(portalViewPermission.attributes.action).toBe('read');
    });

    it('should have correct resource type', () => {
      expect(portalViewPermission.resourceType).toBe(EDUCATES_TRAINING_PORTAL_RESOURCE_TYPE);
    });
  });

  describe('workshopStartPermission', () => {
    it('should have correct name', () => {
      expect(workshopStartPermission.name).toBe('educates.workshop.start');
    });

    it('should have create action', () => {
      expect(workshopStartPermission.attributes.action).toBe('create');
    });

    it('should have correct resource type', () => {
      expect(workshopStartPermission.resourceType).toBe(EDUCATES_WORKSHOP_RESOURCE_TYPE);
    });
  });

  describe('educatesPermissions', () => {
    it('should contain both permissions', () => {
      expect(educatesPermissions).toHaveLength(2);
      expect(educatesPermissions).toContain(portalViewPermission);
      expect(educatesPermissions).toContain(workshopStartPermission);
    });
  });

  describe('deprecated exports', () => {
    it('EDUCATES_VIEW_PORTAL should equal portalViewPermission', () => {
      expect(EDUCATES_VIEW_PORTAL).toBe(portalViewPermission);
    });

    it('EDUCATES_START_WORKSHOP should equal workshopStartPermission', () => {
      expect(EDUCATES_START_WORKSHOP).toBe(workshopStartPermission);
    });
  });
});

