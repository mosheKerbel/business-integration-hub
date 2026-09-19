import pg from 'pg';

const { Pool } = pg;

export type DatabasePool = pg.Pool;

export function createPool(connectionString: string): DatabasePool {
  return new Pool({ connectionString });
}

/** Verifies Hub PostgreSQL is reachable (connectivity smoke test). */
export async function checkDatabaseConnection(
  connectionString: string,
): Promise<void> {
  const pool = createPool(connectionString);
  try {
    const result = await pool.query<{ ok: number }>('SELECT 1 AS ok');
    const row = result.rows[0];
    if (row?.ok !== 1) {
      throw new Error('Unexpected result from database connectivity check');
    }
  } finally {
    await pool.end();
  }
}

export function requireDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error(
      'DATABASE_URL is required. Copy .env.example to .env and start local PostgreSQL (pnpm db:up).',
    );
  }
  return url;
}
