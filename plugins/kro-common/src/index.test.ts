import {
  listInstancesPermission,
  listRGDsPermission,
  listResourcesPermission,
  showResourceGraph,
  showOverview,
  kroPermissions,
} from './index';

describe('kro-common', () => {
  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(listInstancesPermission).toBeDefined();
      expect(listRGDsPermission).toBeDefined();
      expect(listResourcesPermission).toBeDefined();
      expect(showResourceGraph).toBeDefined();
      expect(showOverview).toBeDefined();
    });

    it('should export kroPermissions array', () => {
      expect(kroPermissions).toBeDefined();
      expect(Array.isArray(kroPermissions)).toBe(true);
      expect(kroPermissions.length).toBeGreaterThan(0);
    });
  });
});

