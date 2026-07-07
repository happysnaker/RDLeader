import { buildApp } from './app';

const port = 3001;
const app = await buildApp({
  databaseUrl: './dev.db',
  autonomyScheduler: {
    enabled: true,
    intervalMs: 60_000,
  },
});

await app.listen({ port, host: '127.0.0.1' });
console.log(`RDLeader control plane listening on http://127.0.0.1:${port}`);
