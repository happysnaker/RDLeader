import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export interface RuntimeSessionRow {
  sessionId: string;
  employeeId: string;
  runtimeKind: string;
  status: 'running' | 'stopped';
  pid: number | null;
  startedAt: string;
  stoppedAt: string | null;
}

export class RuntimeSessionRepository {
  constructor(private readonly sqlite: Database.Database) {}

  listForEmployee(employeeId: string): RuntimeSessionRow[] {
    return this.sqlite.prepare(`
      SELECT
        session_id as sessionId,
        employee_id as employeeId,
        runtime_kind as runtimeKind,
        status,
        pid,
        started_at as startedAt,
        stopped_at as stoppedAt
      FROM runtime_sessions
      WHERE employee_id = ?
      ORDER BY started_at DESC, rowid DESC
    `).all(employeeId) as RuntimeSessionRow[];
  }

  latestActiveForEmployee(employeeId: string): RuntimeSessionRow | undefined {
    return this.sqlite.prepare(`
      SELECT
        session_id as sessionId,
        employee_id as employeeId,
        runtime_kind as runtimeKind,
        status,
        pid,
        started_at as startedAt,
        stopped_at as stoppedAt
      FROM runtime_sessions
      WHERE employee_id = ?
        AND status = 'running'
      ORDER BY started_at DESC, rowid DESC
      LIMIT 1
    `).get(employeeId) as RuntimeSessionRow | undefined;
  }

  createRunning(input: {
    employeeId: string;
    runtimeKind: string;
    pid: number | null;
    startedAt: string;
  }): RuntimeSessionRow {
    const session: RuntimeSessionRow = {
      sessionId: `runtime-session-${randomUUID()}`,
      employeeId: input.employeeId,
      runtimeKind: input.runtimeKind,
      status: 'running',
      pid: input.pid,
      startedAt: input.startedAt,
      stoppedAt: null,
    };

    this.sqlite.prepare(`
      INSERT INTO runtime_sessions (
        session_id,
        employee_id,
        runtime_kind,
        status,
        pid,
        started_at,
        stopped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.sessionId,
      session.employeeId,
      session.runtimeKind,
      session.status,
      session.pid,
      session.startedAt,
      session.stoppedAt,
    );

    return session;
  }

  stopSession(sessionId: string, stoppedAt: string): RuntimeSessionRow | undefined {
    this.sqlite.prepare(`
      UPDATE runtime_sessions
      SET status = 'stopped',
          stopped_at = ?,
          pid = NULL
      WHERE session_id = ?
    `).run(stoppedAt, sessionId);

    return this.sqlite.prepare(`
      SELECT
        session_id as sessionId,
        employee_id as employeeId,
        runtime_kind as runtimeKind,
        status,
        pid,
        started_at as startedAt,
        stopped_at as stoppedAt
      FROM runtime_sessions
      WHERE session_id = ?
    `).get(sessionId) as RuntimeSessionRow | undefined;
  }
}
