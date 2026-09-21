import { describe, expect, it } from 'vitest';

import { v1 } from '@bih/contracts';
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

  it('resolves v1 contract package', () => {
    expect(v1.CONTRACT_API_VERSION).toBe('v1');
    expect(v1.UuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });
});
