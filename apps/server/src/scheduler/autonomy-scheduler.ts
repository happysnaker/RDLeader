export function startAutonomyScheduler(input: {
  enabled: boolean;
  intervalMs: number;
  runDueCycles: () => Promise<unknown>;
  onError?: (error: unknown) => void;
}) {
  if (!input.enabled) {
    return () => {};
  }

  const timer = setInterval(() => {
    void input.runDueCycles().catch((error) => {
      input.onError?.(error);
    });
  }, input.intervalMs);

  return () => {
    clearInterval(timer);
  };
}
