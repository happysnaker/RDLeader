import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const sqlite = new Database(databaseUrl);
  return drizzle(sqlite, { schema });
}
