import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apiDir = path.join(repoRoot, 'apps/api');
const workerDir = path.join(repoRoot, 'apps/worker');

type RunningProcess = {
  child: ReturnType<typeof spawn>;
  stop: () => void;
};

async function startProcess(
  cwd: string,
  script: string,
  env: Record<string, string>,
): Promise<RunningProcess> {
  const child = spawn('node', [script], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stop = () => {
    child.stdout?.destroy();
    child.stderr?.destroy();
    if (child.pid !== undefined && !child.killed) {
      child.kill('SIGTERM');
    }
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const rl = createInterface({ input: child.stdout! });

    const cleanup = (killChild: boolean) => {
      clearTimeout(timeout);
      rl.close();
      child.removeAllListeners('exit');
      if (killChild) {
        stop();
      }
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup(true);
      reject(error);
    };

    const succeed = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup(false);
      resolve();
    };

    const timeout = setTimeout(() => {
      fail(new Error(`Process in ${cwd} did not log startup within 10s`));
    }, 10_000);

    rl.on('line', (line) => {
      if (
        line.includes('"message":"API listening"') ||
        line.includes('"message":"Worker started"')
      ) {
        succeed();
      }
    });

    child.once('exit', (code) => {
      fail(new Error(`Process in ${cwd} exited early with code ${code}`));
    });
  });

  return { child, stop };
}

describe('process startup smoke', () => {
  const processes: RunningProcess[] = [];

  afterEach(() => {
    for (const proc of processes.splice(0)) {
      proc.stop();
    }
  });

  it('starts API without provider credentials', async () => {
    const proc = await startProcess(apiDir, 'dist/index.js', {
      API_PORT: '39001',
      LOG_LEVEL: 'info',
    });
    processes.push(proc);

    const response = await fetch('http://127.0.0.1:39001/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('starts worker without provider credentials', async () => {
    const proc = await startProcess(workerDir, 'dist/index.js', {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://bih:bih@127.0.0.1:15432/bih_hub',
      WORKER_POLL_INTERVAL_MS: '60000',
      LOG_LEVEL: 'info',
    });
    processes.push(proc);
    expect(proc.child.pid).toBeGreaterThan(0);
  });
});
