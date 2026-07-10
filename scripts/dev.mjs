import { spawn } from 'node:child_process';

const rootDir = '/Users/bytedance/GolandProjects/DevPlan/RdLeader';
const services = [
  {
    name: 'server',
    healthUrl: 'http://127.0.0.1:3001/employees',
    verify: async (response) => {
      if (!response.ok) return false;
      const payload = await response.json().catch(() => null);
      return Array.isArray(payload);
    },
    command: ['pnpm', '--filter', '@rdleader/server', 'dev'],
  },
  {
    name: 'web',
    healthUrl: 'http://127.0.0.1:5173/',
    verify: async (response) => {
      if (!response.ok) return false;
      const text = await response.text().catch(() => '');
      return text.includes('RDLeader');
    },
    command: ['pnpm', '--filter', '@rdleader/web', 'dev'],
  },
];

async function isHealthy(service) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(service.healthUrl, { signal: controller.signal });
    clearTimeout(timer);
    return await service.verify(response);
  } catch {
    return false;
  }
}

function startService(service) {
  const [command, ...args] = service.command;
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
  return child;
}

const children = [];

async function main() {
  const healthy = await Promise.all(services.map((service) => isHealthy(service)));
  const missing = services.filter((_, index) => !healthy[index]);

  if (missing.length === 0) {
    console.log('RDLeader dev services already running:');
    console.log('- server: http://127.0.0.1:3001');
    console.log('- web:    http://127.0.0.1:5173');
    return;
  }

  console.log(
    `Starting missing RDLeader dev services: ${missing.map((service) => service.name).join(', ')}`,
  );

  for (const service of missing) {
    children.push(startService(service));
  }

  const shutdown = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve, reject) => {
          child.on('exit', (code, signal) => {
            if (signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
              resolve();
              return;
            }
            reject(new Error(`dev child exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`));
          });
          child.on('error', reject);
        }),
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
