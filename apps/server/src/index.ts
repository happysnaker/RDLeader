import { buildApp } from './app';

const port = 3001;
const app = await buildApp({ databaseUrl: './dev.db' });

await app.listen({ port, host: '127.0.0.1' });
console.log(`RDLeader control plane listening on http://127.0.0.1:${port}`);
