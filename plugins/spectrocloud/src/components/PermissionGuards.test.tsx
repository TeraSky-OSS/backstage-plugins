import {
  useCanDownloadKubeconfig,
  useCanViewPackValues,
  useCanViewPackManifests,
} from './PermissionGuards';

// Mock the dependencies
jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getOptionalBoolean: jest.fn().mockReturnValue(false),
  }),
  configApiRef: { id: 'config' },
}));

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn().mockReturnValue({ allowed: true, loading: false }),
}));

describe('PermissionGuards', () => {
  describe('useCanDownloadKubeconfig', () => {
    it('should be defined', () => {
      expect(useCanDownloadKubeconfig).toBeDefined();
    });
  });

  describe('useCanViewPackValues', () => {
    it('should be defined', () => {
      expect(useCanViewPackValues).toBeDefined();
    });
  });

  describe('useCanViewPackManifests', () => {
    it('should be defined', () => {
      expect(useCanViewPackManifests).toBeDefined();
    });
  });
});

