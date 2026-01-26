import { rootRouteRef, deploymentRouteRef, resourceRouteRef, projectRouteRef } from './routes';

describe('vcf-automation routes', () => {
  describe('rootRouteRef', () => {
    it('should be defined', () => {
      expect(rootRouteRef).toBeDefined();
    });
  });

  describe('deploymentRouteRef', () => {
    it('should be defined', () => {
      expect(deploymentRouteRef).toBeDefined();
    });
  });

  describe('resourceRouteRef', () => {
    it('should be defined', () => {
      expect(resourceRouteRef).toBeDefined();
    });
  });

  describe('projectRouteRef', () => {
    it('should be defined', () => {
      expect(projectRouteRef).toBeDefined();
    });
  });
});

