export type ApiConfig = {
  host: string;
  port: number;
};

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const host = env.API_HOST ?? '127.0.0.1';
  const portRaw = env.API_PORT ?? '3000';
  if (!/^\d+$/.test(portRaw)) {
    throw new Error(`API_PORT must be a positive integer, got "${portRaw}"`);
  }
  const port = Number(portRaw);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`API_PORT must be a positive integer, got "${portRaw}"`);
  }
  return { host, port };
}
