import {
  DEFAULT_ANNOTATION_PREFIX,
  getAnnotation,
  hasCrossplaneResourceAnnotation,
  listClaimsPermission,
  listCompositeResourcesPermission,
  listManagedResourcesPermission,
  crossplanePermissions,
} from './index';

describe('crossplane-common', () => {
  describe('annotation utilities', () => {
    it('should export DEFAULT_ANNOTATION_PREFIX', () => {
      expect(DEFAULT_ANNOTATION_PREFIX).toBe('terasky.backstage.io');
    });

    describe('getAnnotation', () => {
      it('should return annotation value when present', () => {
        const annotations = { 'terasky.backstage.io/test': 'value' };
        expect(getAnnotation(annotations, 'terasky.backstage.io', 'test')).toBe('value');
      });
    });

    describe('hasCrossplaneResourceAnnotation', () => {
      it('should return true when crossplane-resource annotation exists', () => {
        const annotations = { 'terasky.backstage.io/crossplane-resource': 'true' };
        expect(hasCrossplaneResourceAnnotation(annotations)).toBe(true);
      });

      it('should return false when crossplane-resource annotation does not exist', () => {
        const annotations = {};
        expect(hasCrossplaneResourceAnnotation(annotations)).toBe(false);
      });
    });
  });

  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(listClaimsPermission).toBeDefined();
      expect(listCompositeResourcesPermission).toBeDefined();
      expect(listManagedResourcesPermission).toBeDefined();
    });

    it('should export crossplanePermissions array', () => {
      expect(crossplanePermissions).toBeDefined();
      expect(Array.isArray(crossplanePermissions)).toBe(true);
      expect(crossplanePermissions.length).toBeGreaterThan(0);
    });
  });
});

