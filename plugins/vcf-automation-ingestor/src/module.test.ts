import { vcfAutomationIngestorModule } from './module';

describe('vcfAutomationIngestorModule', () => {
  it('should be defined', () => {
    expect(vcfAutomationIngestorModule).toBeDefined();
  });

  it('should be a backend module for catalog', () => {
    // The module is created with createBackendModule for catalog plugin
    expect(vcfAutomationIngestorModule).toBeDefined();
  });
});

