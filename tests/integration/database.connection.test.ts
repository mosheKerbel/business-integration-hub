import { describe, expect, it } from 'vitest';

import { checkDatabaseConnection, requireDatabaseUrl } from '@bih/db';

const runDbIntegration = process.env.RUN_DB_INTEGRATION === '1';

describe('Hub PostgreSQL connectivity', () => {
  it.skipIf(!runDbIntegration)(
    'connects when RUN_DB_INTEGRATION=1 and DATABASE_URL is configured',
    async () => {
      const databaseUrl = requireDatabaseUrl();
      await expect(checkDatabaseConnection(databaseUrl)).resolves.toBeUndefined();
    },
  );

  it('requireDatabaseUrl fails when DATABASE_URL is missing', () => {
    expect(() => requireDatabaseUrl({})).toThrow(/DATABASE_URL is required/);
  });
});
