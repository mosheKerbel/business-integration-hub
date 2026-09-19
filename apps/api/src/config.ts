export type ApiConfig = {
  host: string;
  port: number;
};

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const host = env.API_HOST ?? '127.0.0.1';
  const portRaw = env.API_PORT ?? '3000';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`API_PORT must be a positive integer, got "${portRaw}"`);
  }
  return { host, port };
}
