import { CROSSPLANE_BACKEND_ROUTES } from './types';

describe('CROSSPLANE_BACKEND_ROUTES', () => {
  it('should export getResources route', () => {
    expect(CROSSPLANE_BACKEND_ROUTES.getResources).toBe('/resources');
  });

  it('should export getEvents route', () => {
    expect(CROSSPLANE_BACKEND_ROUTES.getEvents).toBe('/events');
  });

  it('should export getResourceGraph route', () => {
    expect(CROSSPLANE_BACKEND_ROUTES.getResourceGraph).toBe('/graph');
  });

  it('should export getV2ResourceGraph route', () => {
    expect(CROSSPLANE_BACKEND_ROUTES.getV2ResourceGraph).toBe('/v2/graph');
  });

  it('should have exactly 4 routes', () => {
    expect(Object.keys(CROSSPLANE_BACKEND_ROUTES)).toHaveLength(4);
  });
});



