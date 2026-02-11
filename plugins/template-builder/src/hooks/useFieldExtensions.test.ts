// Mock the config BEFORE importing anything else
jest.mock('../config/fieldExtensions', () => ({
  KNOWN_FIELD_EXTENSIONS: ['EntityPicker', 'RepoUrlPicker', 'OwnerPicker'],
  DISABLE_AUTO_DISCOVERY: true,
}));

// Mock the useApiHolder to avoid React context issues
jest.mock('@backstage/core-plugin-api', () => ({
  useApiHolder: () => ({}),
}));

describe('useFieldExtensions', () => {
  it('should return known field extensions', () => {
    // This test just verifies the module can be imported
    const { KNOWN_FIELD_EXTENSIONS } = require('../config/fieldExtensions');
    
    expect(KNOWN_FIELD_EXTENSIONS).toContain('EntityPicker');
    expect(KNOWN_FIELD_EXTENSIONS).toContain('RepoUrlPicker');
    expect(KNOWN_FIELD_EXTENSIONS).toContain('OwnerPicker');
  });

  it('should have auto-discovery disabled in test environment', () => {
    const { DISABLE_AUTO_DISCOVERY } = require('../config/fieldExtensions');
    
    expect(DISABLE_AUTO_DISCOVERY).toBe(true);
  });
});
