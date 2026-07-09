export const createMetricsRecorder = () => {
  const stages = new Map();

  return {
    observe(stage, durationMs, failed = false) {
      const current = stages.get(stage) ?? {
        count: 0,
        failureCount: 0,
        totalLatencyMs: 0,
        maxLatencyMs: 0,
      };

      stages.set(stage, {
        count: current.count + 1,
        failureCount: current.failureCount + (failed ? 1 : 0),
        totalLatencyMs: current.totalLatencyMs + durationMs,
        maxLatencyMs: Math.max(current.maxLatencyMs, durationMs),
      });
    },

    snapshot() {
      return Object.fromEntries(
        Array.from(stages.entries()).map(([stage, value]) => [
          stage,
          {
            ...value,
            averageLatencyMs:
              value.count === 0 ? 0 : Math.round(value.totalLatencyMs / value.count),
          },
        ])
      );
    },
  };
};

export const createStageTimer = ({ metrics, stage, now = Date.now }) => {
  const startedAt = now();
  let completed = false;

  return {
    complete(failed = false) {
      if (completed) return;
      completed = true;
      metrics.observe(stage, now() - startedAt, failed);
    },
  };
};
