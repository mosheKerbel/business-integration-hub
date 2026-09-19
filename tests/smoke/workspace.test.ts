import { describe, expect, it } from 'vitest';

import { CONTRACTS_PACKAGE } from '@bih/contracts';
import { loadApiConfig } from '../../apps/api/src/config.js';
import { loadWorkerConfig } from '../../apps/worker/src/config.js';

describe('workspace smoke', () => {
  it('loads API config defaults', () => {
    expect(loadApiConfig({ API_PORT: '3001' })).toEqual({
      host: '127.0.0.1',
      port: 3001,
    });
  });

  it('loads worker config', () => {
    expect(loadWorkerConfig({ WORKER_POLL_INTERVAL_MS: '2000' })).toEqual({
      pollIntervalMs: 2000,
    });
  });

  it('resolves scaffolded contract package', () => {
    expect(CONTRACTS_PACKAGE).toBe('@bih/contracts');
  });
});
