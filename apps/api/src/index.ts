import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { checkDatabaseConnection, requireDatabaseUrl } from '@bih/db';
import { createLogger } from '@bih/observability';

import { loadApiConfig } from './config.js';

const log = createLogger('api');

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = req.url ?? '/';

  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'bih-api' }));
    return;
  }

  if (req.method === 'GET' && url === '/health/db') {
    try {
      const databaseUrl = requireDatabaseUrl();
      await checkDatabaseConnection(databaseUrl);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', database: 'connected' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Database health check failed', { error: message });
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', database: 'unavailable', message }));
    }
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

async function main(): Promise<void> {
  const config = loadApiConfig();
  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  server.listen(config.port, config.host, () => {
    log.info('API listening', { host: config.host, port: config.port });
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error('API failed to start', { error: message });
  process.exitCode = 1;
});
