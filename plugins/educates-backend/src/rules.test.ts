import {
  rules,
  isPortalOwner,
  hasPortalAccess,
  isWorkshopOwner,
  hasWorkshopAccess,
  educatesPortalPermissionResourceRef,
  educatesWorkshopPermissionResourceRef,
  EducatesPortalResource,
  EducatesWorkshopResource,
} from './rules';

describe('rules', () => {
  describe('resource references', () => {
    it('should export educatesPortalPermissionResourceRef', () => {
      expect(educatesPortalPermissionResourceRef).toBeDefined();
    });

    it('should export educatesWorkshopPermissionResourceRef', () => {
      expect(educatesWorkshopPermissionResourceRef).toBeDefined();
    });
  });

  describe('rules object', () => {
    it('should have portal rules', () => {
      expect(rules.portal).toBeDefined();
      expect(rules.portal.isPortalOwner).toBeDefined();
      expect(rules.portal.hasPortalAccess).toBeDefined();
    });

    it('should have workshop rules', () => {
      expect(rules.workshop).toBeDefined();
      expect(rules.workshop.isWorkshopOwner).toBeDefined();
      expect(rules.workshop.hasWorkshopAccess).toBeDefined();
    });
  });

  describe('isPortalOwner rule', () => {
    it('should have correct name', () => {
      expect(isPortalOwner.name).toBe('IS_PORTAL_OWNER');
    });

    it('should have correct description', () => {
      expect(isPortalOwner.description).toBe('Allow users who are owners of a training portal');
    });

    it('should return true when userRefs has items', () => {
      const resource: EducatesPortalResource = { portalName: 'test-portal' };
      const result = isPortalOwner.apply(resource, { userRefs: ['user:default/test-user'] });
      expect(result).toBe(true);
    });

    it('should return false when userRefs is empty', () => {
      const resource: EducatesPortalResource = { portalName: 'test-portal' };
      const result = isPortalOwner.apply(resource, { userRefs: [] });
      expect(result).toBe(false);
    });

    it('should return empty query', () => {
      const query = isPortalOwner.toQuery({ userRefs: ['user:default/test-user'] });
      expect(query).toEqual({ anyOf: [] });
    });
  });

  describe('hasPortalAccess rule', () => {
    it('should have correct name', () => {
      expect(hasPortalAccess.name).toBe('HAS_PORTAL_ACCESS');
    });

    it('should return true when portal matches and userRefs has items', () => {
      const resource: EducatesPortalResource = { portalName: 'test-portal' };
      const result = hasPortalAccess.apply(resource, {
        userRefs: ['user:default/test-user'],
        portalName: 'test-portal',
      });
      expect(result).toBe(true);
    });

    it('should return false when portal does not match', () => {
      const resource: EducatesPortalResource = { portalName: 'test-portal' };
      const result = hasPortalAccess.apply(resource, {
        userRefs: ['user:default/test-user'],
        portalName: 'other-portal',
      });
      expect(result).toBe(false);
    });

    it('should return false when userRefs is empty', () => {
      const resource: EducatesPortalResource = { portalName: 'test-portal' };
      const result = hasPortalAccess.apply(resource, {
        userRefs: [],
        portalName: 'test-portal',
      });
      expect(result).toBe(false);
    });

    it('should return query with portal name', () => {
      const query = hasPortalAccess.toQuery({
        userRefs: ['user:default/test-user'],
        portalName: 'test-portal',
      });
      expect(query).toEqual({ anyOf: ['test-portal'] });
    });
  });

  describe('isWorkshopOwner rule', () => {
    it('should have correct name', () => {
      expect(isWorkshopOwner.name).toBe('IS_WORKSHOP_OWNER');
    });

    it('should return true when userRefs has items', () => {
      const resource: EducatesWorkshopResource = {
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      };
      const result = isWorkshopOwner.apply(resource, { userRefs: ['user:default/test-user'] });
      expect(result).toBe(true);
    });

    it('should return false when userRefs is empty', () => {
      const resource: EducatesWorkshopResource = {
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      };
      const result = isWorkshopOwner.apply(resource, { userRefs: [] });
      expect(result).toBe(false);
    });
  });

  describe('hasWorkshopAccess rule', () => {
    it('should have correct name', () => {
      expect(hasWorkshopAccess.name).toBe('HAS_WORKSHOP_ACCESS');
    });

    it('should return true when portal and workshop match and userRefs has items', () => {
      const resource: EducatesWorkshopResource = {
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      };
      const result = hasWorkshopAccess.apply(resource, {
        userRefs: ['user:default/test-user'],
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      });
      expect(result).toBe(true);
    });

    it('should return false when portal does not match', () => {
      const resource: EducatesWorkshopResource = {
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      };
      const result = hasWorkshopAccess.apply(resource, {
        userRefs: ['user:default/test-user'],
        portalName: 'other-portal',
        workshopName: 'test-workshop',
      });
      expect(result).toBe(false);
    });

    it('should return false when workshop does not match', () => {
      const resource: EducatesWorkshopResource = {
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      };
      const result = hasWorkshopAccess.apply(resource, {
        userRefs: ['user:default/test-user'],
        portalName: 'test-portal',
        workshopName: 'other-workshop',
      });
      expect(result).toBe(false);
    });

    it('should return query with portal:workshop format', () => {
      const query = hasWorkshopAccess.toQuery({
        userRefs: ['user:default/test-user'],
        portalName: 'test-portal',
        workshopName: 'test-workshop',
      });
      expect(query).toEqual({ anyOf: ['test-portal:test-workshop'] });
    });
  });
});

