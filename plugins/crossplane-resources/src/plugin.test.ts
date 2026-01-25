import { 
  crossplaneResourcesPlugin, 
  CrossplaneResourcesTableSelector,
  CrossplaneResourceGraphSelector,
  CrossplaneOverviewCardSelector,
  CrossplaneV1OverviewCard,
  CrossplaneV1ResourceGraph,
  CrossplaneV1ResourcesTable,
  CrossplaneV2OverviewCard,
  CrossplaneV2ResourceGraph,
  CrossplaneV2ResourcesTable,
} from './plugin';

describe('crossplaneResourcesPlugin', () => {
  it('should be defined', () => {
    expect(crossplaneResourcesPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(crossplaneResourcesPlugin.getId()).toBe('crossplane-resources');
  });

  describe('selector components', () => {
    it('should export CrossplaneResourcesTableSelector', () => {
      expect(CrossplaneResourcesTableSelector).toBeDefined();
    });

    it('should export CrossplaneResourceGraphSelector', () => {
      expect(CrossplaneResourceGraphSelector).toBeDefined();
    });

    it('should export CrossplaneOverviewCardSelector', () => {
      expect(CrossplaneOverviewCardSelector).toBeDefined();
    });
  });

  describe('v1 components', () => {
    it('should export CrossplaneV1OverviewCard', () => {
      expect(CrossplaneV1OverviewCard).toBeDefined();
    });

    it('should export CrossplaneV1ResourceGraph', () => {
      expect(CrossplaneV1ResourceGraph).toBeDefined();
    });

    it('should export CrossplaneV1ResourcesTable', () => {
      expect(CrossplaneV1ResourcesTable).toBeDefined();
    });
  });

  describe('v2 components', () => {
    it('should export CrossplaneV2OverviewCard', () => {
      expect(CrossplaneV2OverviewCard).toBeDefined();
    });

    it('should export CrossplaneV2ResourceGraph', () => {
      expect(CrossplaneV2ResourceGraph).toBeDefined();
    });

    it('should export CrossplaneV2ResourcesTable', () => {
      expect(CrossplaneV2ResourcesTable).toBeDefined();
    });
  });
});

