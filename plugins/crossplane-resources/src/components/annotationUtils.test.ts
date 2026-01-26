import { getAnnotationPrefix, getAnnotation, hasCrossplaneResourceAnnotation, DEFAULT_ANNOTATION_PREFIX } from './annotationUtils';

describe('annotationUtils', () => {
  describe('getAnnotationPrefix', () => {
    it('should return custom prefix when configured', () => {
      const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue('custom.prefix'),
      };
      expect(getAnnotationPrefix(mockConfig as any)).toBe('custom.prefix');
    });

    it('should return default prefix when not configured', () => {
      const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue(undefined),
      };
      expect(getAnnotationPrefix(mockConfig as any)).toBe(DEFAULT_ANNOTATION_PREFIX);
    });

    it('should call config with correct key', () => {
      const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue(undefined),
      };
      getAnnotationPrefix(mockConfig as any);
      expect(mockConfig.getOptionalString).toHaveBeenCalledWith('kubernetesIngestor.annotationPrefix');
    });
  });

  describe('getAnnotation', () => {
    it('should be defined', () => {
      expect(getAnnotation).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof getAnnotation).toBe('function');
    });
  });

  describe('hasCrossplaneResourceAnnotation', () => {
    it('should be defined', () => {
      expect(hasCrossplaneResourceAnnotation).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof hasCrossplaneResourceAnnotation).toBe('function');
    });
  });

  describe('DEFAULT_ANNOTATION_PREFIX', () => {
    it('should be defined', () => {
      expect(DEFAULT_ANNOTATION_PREFIX).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof DEFAULT_ANNOTATION_PREFIX).toBe('string');
    });
  });
});
