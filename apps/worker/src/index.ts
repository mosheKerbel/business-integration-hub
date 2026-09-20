import { checkDatabaseConnection, requireDatabaseUrl } from '@bih/db';
import { createLogger } from '@bih/observability';

import { loadWorkerConfig } from './config.js';

const log = createLogger('worker');

let shuttingDown = false;

async function tick(databaseUrl: string): Promise<void> {
  await checkDatabaseConnection(databaseUrl);
  log.debug('Worker database connectivity check succeeded');
}

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const databaseUrl = requireDatabaseUrl();
  log.info('Worker started', { pollIntervalMs: config.pollIntervalMs });

  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  const run = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    try {
      await tick(databaseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn('Worker tick failed', { error: message });
    }
    if (!shuttingDown) {
      pollTimer = setTimeout(() => {
        pollTimer = undefined;
        void run();
      }, config.pollIntervalMs);
    }
  };

  void run();

  const shutdown = (signal: string) => {
    log.info('Worker shutting down', { signal });
    shuttingDown = true;
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer);
      pollTimer = undefined;
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error('Worker failed to start', { error: message });
  process.exitCode = 1;
});
