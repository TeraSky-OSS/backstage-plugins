import { rootRouteRef } from './routes';

describe('spectrocloud routes', () => {
  describe('rootRouteRef', () => {
    it('should be defined', () => {
      expect(rootRouteRef).toBeDefined();
    });

    it('should have correct id', () => {
      expect(rootRouteRef.toString()).toContain('spectrocloud');
    });
  });
});

