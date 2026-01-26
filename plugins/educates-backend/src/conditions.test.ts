import {
  educatesPortalConditions,
  educatesWorkshopConditions,
  createEducatesPortalConditionalDecision,
  createEducatesWorkshopConditionalDecision,
} from './conditions';

describe('conditions', () => {
  describe('educatesPortalConditions', () => {
    it('should export portal conditions', () => {
      expect(educatesPortalConditions).toBeDefined();
    });

    it('should have isPortalOwner condition', () => {
      expect(educatesPortalConditions.isPortalOwner).toBeDefined();
    });

    it('should have hasPortalAccess condition', () => {
      expect(educatesPortalConditions.hasPortalAccess).toBeDefined();
    });
  });

  describe('educatesWorkshopConditions', () => {
    it('should export workshop conditions', () => {
      expect(educatesWorkshopConditions).toBeDefined();
    });

    it('should have isWorkshopOwner condition', () => {
      expect(educatesWorkshopConditions.isWorkshopOwner).toBeDefined();
    });

    it('should have hasWorkshopAccess condition', () => {
      expect(educatesWorkshopConditions.hasWorkshopAccess).toBeDefined();
    });
  });

  describe('createEducatesPortalConditionalDecision', () => {
    it('should be a function', () => {
      expect(typeof createEducatesPortalConditionalDecision).toBe('function');
    });
  });

  describe('createEducatesWorkshopConditionalDecision', () => {
    it('should be a function', () => {
      expect(typeof createEducatesWorkshopConditionalDecision).toBe('function');
    });
  });
});

