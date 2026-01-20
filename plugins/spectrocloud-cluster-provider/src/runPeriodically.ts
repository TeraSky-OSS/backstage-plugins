/**
 * Helper function to run a task periodically
 */
export function runPeriodically(
  fn: () => Promise<void>,
  intervalMs: number,
): void {
  setInterval(() => {
    fn().catch(err => {
      console.error('Periodic task failed:', err);
    });
  }, intervalMs);
  
  // Run immediately on startup
  fn().catch(err => {
    console.error('Initial task run failed:', err);
  });
}

