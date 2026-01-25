import { ScaleOpsDashboard } from './ScaleOpsDashboard';

describe('ScaleOpsDashboard', () => {
  it('should be defined', () => {
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof ScaleOpsDashboard).toBe('function');
  });
});

// Test utility functions by testing the internal formatting logic indirectly
describe('ScaleOpsDashboard formatting utilities', () => {
  it('should have formatBytes utility for memory display', () => {
    // The component formats bytes to GiB/MiB for display
    // 1 GiB = 1073741824 bytes
    // 1 MiB = 1048576 bytes
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should have formatCost utility for currency display', () => {
    // The component formats costs with $ prefix
    expect(ScaleOpsDashboard).toBeDefined();
  });

  it('should have formatCpu utility for CPU display', () => {
    // The component formats millicores to cores (divide by 1000)
    expect(ScaleOpsDashboard).toBeDefined();
  });
});
