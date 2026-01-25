import { runPeriodically } from './runPeriodically';

describe('runPeriodically', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should run the function immediately on call', () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);

    runPeriodically(mockFn, 1000);

    // The function should be called immediately
    expect(mockFn).toHaveBeenCalled();
  });

  it('should run the function periodically via setInterval', () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);

    runPeriodically(mockFn, 1000);
    
    // Clear the immediate call count
    const initialCalls = mockFn.mock.calls.length;

    // Advance timers by interval
    jest.advanceTimersByTime(1000);
    expect(mockFn.mock.calls.length).toBeGreaterThan(initialCalls);

    // Advance timers again
    jest.advanceTimersByTime(1000);
    expect(mockFn.mock.calls.length).toBeGreaterThan(initialCalls + 1);
  });

  it('should handle function errors gracefully on initial run', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));

    runPeriodically(mockFn, 1000);

    // Wait for promise to settle
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Initial task run failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should handle function errors gracefully on periodic runs', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    let callCount = 0;
    const mockFn = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount > 1) {
        return Promise.reject(new Error('Periodic error'));
      }
      return Promise.resolve();
    });

    runPeriodically(mockFn, 1000);

    // Wait for initial call to complete
    await Promise.resolve();

    // Trigger periodic run
    jest.advanceTimersByTime(1000);
    
    // Wait for promise to settle
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Periodic task failed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should continue running even after errors', () => {
    jest.spyOn(console, 'error').mockImplementation();
    const mockFn = jest.fn().mockRejectedValue(new Error('Error'));

    runPeriodically(mockFn, 1000);

    const initialCalls = mockFn.mock.calls.length;

    // First interval
    jest.advanceTimersByTime(1000);
    expect(mockFn.mock.calls.length).toBeGreaterThan(initialCalls);

    // Second interval - should still run despite errors
    jest.advanceTimersByTime(1000);
    expect(mockFn.mock.calls.length).toBeGreaterThan(initialCalls + 1);
  });
});
