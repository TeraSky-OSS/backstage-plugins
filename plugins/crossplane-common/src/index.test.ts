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

      it('should return undefined when annotations is undefined', () => {
        expect(getAnnotation(undefined, 'terasky.backstage.io', 'test')).toBeUndefined();
      });

      it('should fallback to DEFAULT_ANNOTATION_PREFIX when custom prefix annotation not found', () => {
        const annotations = { 'terasky.backstage.io/test': 'fallback-value' };
        expect(getAnnotation(annotations, 'custom.prefix', 'test')).toBe('fallback-value');
      });

      it('should return undefined when neither custom nor default prefix annotation exists', () => {
        const annotations = { 'other.prefix/test': 'value' };
        expect(getAnnotation(annotations, 'custom.prefix', 'test')).toBeUndefined();
      });

      it('should not fallback when prefix is DEFAULT_ANNOTATION_PREFIX', () => {
        const annotations = {};
        expect(getAnnotation(annotations, DEFAULT_ANNOTATION_PREFIX, 'test')).toBeUndefined();
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

      it('should return false when annotations is undefined', () => {
        expect(hasCrossplaneResourceAnnotation(undefined)).toBe(false);
      });

      it('should fallback to DEFAULT_ANNOTATION_PREFIX when custom prefix annotation not found', () => {
        const annotations = { 'terasky.backstage.io/crossplane-resource': 'true' };
        expect(hasCrossplaneResourceAnnotation(annotations, 'custom.prefix')).toBe(true);
      });

      it('should return false when neither custom nor default prefix annotation exists', () => {
        const annotations = { 'other.prefix/crossplane-resource': 'true' };
        expect(hasCrossplaneResourceAnnotation(annotations, 'custom.prefix')).toBe(false);
      });

      it('should not fallback when prefix is DEFAULT_ANNOTATION_PREFIX', () => {
        const annotations = {};
        expect(hasCrossplaneResourceAnnotation(annotations, DEFAULT_ANNOTATION_PREFIX)).toBe(false);
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

