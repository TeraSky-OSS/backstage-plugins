import { KNOWN_FIELD_EXTENSIONS, DISABLE_AUTO_DISCOVERY } from './fieldExtensions';

describe('fieldExtensions', () => {
  it('should export known field extensions', () => {
    expect(KNOWN_FIELD_EXTENSIONS).toBeDefined();
    expect(Array.isArray(KNOWN_FIELD_EXTENSIONS)).toBe(true);
  });

  it('should include common field extensions', () => {
    expect(KNOWN_FIELD_EXTENSIONS).toContain('EntityPicker');
    expect(KNOWN_FIELD_EXTENSIONS).toContain('RepoUrlPicker');
    expect(KNOWN_FIELD_EXTENSIONS).toContain('OwnerPicker');
  });

  it('should have auto-discovery flag', () => {
    expect(typeof DISABLE_AUTO_DISCOVERY).toBe('boolean');
  });

  it('should have at least 10 known extensions', () => {
    expect(KNOWN_FIELD_EXTENSIONS.length).toBeGreaterThanOrEqual(10);
  });
});
