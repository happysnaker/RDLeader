import { buildApp } from './app';

const port = Number(process.env.RDLEADER_PORT ?? 3001);
const databaseUrl = process.env.RDLEADER_DATABASE_URL ?? './dev.db';
const seedMode = process.env.RDLEADER_SEED_MODE === 'none' ? 'none' : 'default';
const autonomySchedulerEnabled = process.env.RDLEADER_AUTONOMY_SCHEDULER !== 'false';

const app = await buildApp({
  databaseUrl,
  seedMode,
  autonomyScheduler: {
    enabled: autonomySchedulerEnabled,
    intervalMs: 60_000,
  },
});

await app.listen({ port, host: '127.0.0.1' });
console.log(
  `RDLeader control plane listening on http://127.0.0.1:${port} database=${databaseUrl} seedMode=${seedMode}`,
);
