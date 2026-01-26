import {
  showResourceGraphPermission,
  listSecretsPermission,
  viewSecretsPermission,
  listResourcesPermission,
  showEventsResourcesPermission,
  viewYamlResourcesPermission,
  kubernetesResourcesPermissions,
} from './index';

describe('kubernetes-resources-common', () => {
  describe('permissions', () => {
    it('should export all permissions', () => {
      expect(showResourceGraphPermission).toBeDefined();
      expect(listSecretsPermission).toBeDefined();
      expect(viewSecretsPermission).toBeDefined();
      expect(listResourcesPermission).toBeDefined();
      expect(showEventsResourcesPermission).toBeDefined();
      expect(viewYamlResourcesPermission).toBeDefined();
    });

    it('should export kubernetesResourcesPermissions array', () => {
      expect(kubernetesResourcesPermissions).toBeDefined();
      expect(Array.isArray(kubernetesResourcesPermissions)).toBe(true);
      expect(kubernetesResourcesPermissions).toHaveLength(6);
    });
  });
});

