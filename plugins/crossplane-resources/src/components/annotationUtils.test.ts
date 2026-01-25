import { getAnnotationPrefix } from './annotationUtils';
import { ConfigApi } from '@backstage/core-plugin-api';

describe('annotationUtils', () => {
  describe('getAnnotationPrefix', () => {
    it('should return custom prefix from config', () => {
      const mockConfig: Partial<ConfigApi> = {
        getOptionalString: jest.fn().mockReturnValue('custom.prefix.io'),
      };
      
      expect(getAnnotationPrefix(mockConfig as ConfigApi)).toBe('custom.prefix.io');
    });

    it('should return default prefix when config returns undefined', () => {
      const mockConfig: Partial<ConfigApi> = {
        getOptionalString: jest.fn().mockReturnValue(undefined),
      };
      
      expect(getAnnotationPrefix(mockConfig as ConfigApi)).toBe('terasky.backstage.io');
    });

    it('should return default prefix when config returns empty string', () => {
      const mockConfig: Partial<ConfigApi> = {
        getOptionalString: jest.fn().mockReturnValue(''),
      };
      
      // Empty string is falsy, so should return default
      expect(getAnnotationPrefix(mockConfig as ConfigApi)).toBe('terasky.backstage.io');
    });
  });
});
