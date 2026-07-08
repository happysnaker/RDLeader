import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import rootPackage from '../../../../package.json';
import { resetPublicDemoDatabase } from './public-demo-reset';

const sensitivePattern = /\/Users\/bytedance|bytedance\.larkoffice\.com|\.uploads\/|\b(?:cli|ou|oc|om)_[a-z0-9]{8,}|gho_[A-Za-z0-9_]+|sk-(?:proj|live|test|ant|org)-[A-Za-z0-9_-]{12,}/i;

describe('public demo reset', () => {
  it('creates an idempotent fake-data demo database with runtime, approval, and QA evidence surfaces', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rdleader-public-demo-'));
    const databasePath = path.join(tempDir, 'public-demo.db');

    try {
      const firstSummary = resetPublicDemoDatabase({
        databasePath,
        nowIso: '2026-07-09T00:00:00.000Z',
      });
      const secondSummary = resetPublicDemoDatabase({
        databasePath,
        nowIso: '2026-07-09T00:00:00.000Z',
      });

      expect(secondSummary).toEqual(firstSummary);
      expect(secondSummary).toMatchObject({
        databasePath,
        employees: 2,
        workItems: 4,
        runtimeDispatches: 2,
        runtimeResults: 2,
        approvalRequests: 2,
        qaEpisodes: 2,
      });

      const db = new Database(databasePath, { readonly: true });
      try {
        expect(db.prepare('SELECT employee_id FROM employees ORDER BY employee_id').pluck().all()).toEqual([
          'alex-runtime',
          'maya-systems',
        ]);
        expect(db.prepare('SELECT display_name FROM employees ORDER BY employee_id').pluck().all()).toEqual([
          'Alex Runtime',
          'Maya Systems',
        ]);
        expect(db.prepare('SELECT status FROM work_items ORDER BY status').pluck().all()).toEqual([
          'active',
          'active',
          'blocked',
          'completed',
        ]);
        expect(db.prepare('SELECT status FROM runtime_result_events ORDER BY status').pluck().all()).toEqual([
          'blocked',
          'completed',
        ]);
        expect(db.prepare('SELECT status FROM approval_requests ORDER BY status').pluck().all()).toEqual([
          'approved',
          'pending',
        ]);
        expect(db.prepare("SELECT COUNT(*) FROM work_episodes WHERE title LIKE 'QA evidence:%'").pluck().get()).toBe(2);

        const publicSurface = JSON.stringify({
          employees: db.prepare('SELECT * FROM employees').all(),
          profiles: db.prepare('SELECT * FROM employee_profiles').all(),
          workItems: db.prepare('SELECT * FROM work_items').all(),
          dispatches: db.prepare('SELECT * FROM runtime_dispatches').all(),
          results: db.prepare('SELECT * FROM runtime_result_events').all(),
          approvals: db.prepare('SELECT * FROM approval_requests').all(),
          episodes: db.prepare('SELECT * FROM work_episodes').all(),
        });
        expect(publicSurface).not.toMatch(sensitivePattern);
      } finally {
        db.close();
      }

      expect(rootPackage.scripts['demo:reset']).toBe('tsx scripts/reset-public-demo.ts');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
