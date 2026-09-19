export type WorkerConfig = {
  pollIntervalMs: number;
};

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const raw = env.WORKER_POLL_INTERVAL_MS ?? '5000';
  const pollIntervalMs = Number.parseInt(raw, 10);
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error(
      `WORKER_POLL_INTERVAL_MS must be an integer >= 1000, got "${raw}"`,
    );
  }
  return { pollIntervalMs };
}
