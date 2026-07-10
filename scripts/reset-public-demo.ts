#!/usr/bin/env tsx
import path from 'node:path';
import { resetPublicDemoDatabase } from '../apps/server/src/demo/public-demo-reset';

function readDatabasePath() {
  const explicitArgIndex = process.argv.findIndex((arg) => arg === '--database' || arg === '--db');
  if (explicitArgIndex >= 0 && process.argv[explicitArgIndex + 1]) {
    return process.argv[explicitArgIndex + 1]!;
  }

  return process.env.RDLEADER_PUBLIC_DEMO_DB ?? path.join('data', 'public-demo.db');
}

const summary = resetPublicDemoDatabase({ databasePath: readDatabasePath() });
console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
