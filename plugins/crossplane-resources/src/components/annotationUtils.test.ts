import { getAnnotationPrefix } from './annotationUtils';

describe('annotationUtils', () => {
  describe('getAnnotationPrefix', () => {
    it('should return custom prefix from config', () => {
      const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue('custom.prefix.io'),
      };

      const result = getAnnotationPrefix(mockConfig as any);
      expect(result).toBe('custom.prefix.io');
    });

    it('should return default prefix when config is not set', () => {
      const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue(undefined),
      };

      const result = getAnnotationPrefix(mockConfig as any);
      expect(result).toBe('terasky.backstage.io');
    });
  });
});

