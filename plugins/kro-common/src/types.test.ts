import { KRO_BACKEND_ROUTES } from './types';

describe('KRO_BACKEND_ROUTES', () => {
  it('should export getResources route', () => {
    expect(KRO_BACKEND_ROUTES.getResources).toBe('/api/kro/resources');
  });

  it('should export getEvents route', () => {
    expect(KRO_BACKEND_ROUTES.getEvents).toBe('/api/kro/events');
  });

  it('should export getResourceGraph route', () => {
    expect(KRO_BACKEND_ROUTES.getResourceGraph).toBe('/api/kro/graph');
  });

  it('should have exactly 3 routes', () => {
    expect(Object.keys(KRO_BACKEND_ROUTES)).toHaveLength(3);
  });
});


