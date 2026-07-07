import type Database from 'better-sqlite3';

export type WorkItemStatus = 'active' | 'blocked' | 'completed';
export type WorkItemSource = 'seed' | 'manager';

export interface WorkItemRow {
  workItemId: string;
  employeeId: string;
  title: string;
  summary: string;
  status: WorkItemStatus;
  source: WorkItemSource;
  createdAt: string;
  updatedAt: string;
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, '-').toLowerCase();
}

export class WorkItemRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seedAssignments(employeeId: string, assignments: string[], nowIso: string) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO work_items (
        work_item_id,
        employee_id,
        title,
        summary,
        status,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    assignments.forEach((assignment, index) => {
      const title = assignment.trim();
      if (!title) return;

      statement.run(
        `seed-${employeeId}-${index}-${normalizeTitle(title)}`,
        employeeId,
        title,
        `${title}（初始种子任务）`,
        'active',
        'seed',
        nowIso,
        nowIso,
      );
    });
  }

  create(
    input: {
      employeeId: string;
      title: string;
      summary: string;
      status?: WorkItemStatus;
      source?: WorkItemSource;
    },
    nowIso: string = new Date().toISOString(),
  ): WorkItemRow {
    const workItem: WorkItemRow = {
      workItemId: `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      title: input.title.trim(),
      summary: input.summary.trim(),
      status: input.status ?? 'active',
      source: input.source ?? 'manager',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.sqlite.prepare(`
      INSERT INTO work_items (
        work_item_id,
        employee_id,
        title,
        summary,
        status,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workItem.workItemId,
      workItem.employeeId,
      workItem.title,
      workItem.summary,
      workItem.status,
      workItem.source,
      workItem.createdAt,
      workItem.updatedAt,
    );

    return workItem;
  }

  get(workItemId: string): WorkItemRow | undefined {
    return this.sqlite.prepare(`
      SELECT
        work_item_id as workItemId,
        employee_id as employeeId,
        title,
        summary,
        status,
        source,
        created_at as createdAt,
        updated_at as updatedAt
      FROM work_items
      WHERE work_item_id = ?
    `).get(workItemId) as WorkItemRow | undefined;
  }

  listForEmployee(employeeId: string): WorkItemRow[] {
    return this.sqlite.prepare(`
      SELECT
        work_item_id as workItemId,
        employee_id as employeeId,
        title,
        summary,
        status,
        source,
        created_at as createdAt,
        updated_at as updatedAt
      FROM work_items
      WHERE employee_id = ?
      ORDER BY created_at DESC, rowid DESC
    `).all(employeeId) as WorkItemRow[];
  }

  listOpenForEmployee(employeeId: string): WorkItemRow[] {
    return this.sqlite.prepare(`
      SELECT
        work_item_id as workItemId,
        employee_id as employeeId,
        title,
        summary,
        status,
        source,
        created_at as createdAt,
        updated_at as updatedAt
      FROM work_items
      WHERE employee_id = ?
        AND status != 'completed'
      ORDER BY created_at DESC, rowid DESC
    `).all(employeeId) as WorkItemRow[];
  }

  updateStatus(
    workItemId: string,
    status: WorkItemStatus,
    nowIso: string = new Date().toISOString(),
  ): WorkItemRow | undefined {
    this.sqlite.prepare(`
      UPDATE work_items
      SET status = ?, updated_at = ?
      WHERE work_item_id = ?
    `).run(status, nowIso, workItemId);

    return this.get(workItemId);
  }
}
