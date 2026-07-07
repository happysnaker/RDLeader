import type Database from 'better-sqlite3';

export interface RuntimeDispatchRow {
  dispatchId: string;
  employeeId: string;
  workItemId: string | null;
  taskTitle: string;
  taskBody: string;
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  status: 'queued' | 'dispatched';
  workspaceTaskRef: string;
  createdAt: string;
}

export class RuntimeDispatchRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: Omit<RuntimeDispatchRow, 'dispatchId'>): RuntimeDispatchRow {
    const dispatch: RuntimeDispatchRow = {
      dispatchId: `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
    };

    this.sqlite.prepare(`
      INSERT INTO runtime_dispatches (
        dispatch_id,
        employee_id,
        work_item_id,
        task_title,
        task_body,
        task_type,
        status,
        workspace_task_ref,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dispatch.dispatchId,
      dispatch.employeeId,
      dispatch.workItemId,
      dispatch.taskTitle,
      dispatch.taskBody,
      dispatch.taskType,
      dispatch.status,
      dispatch.workspaceTaskRef,
      dispatch.createdAt,
    );

    return dispatch;
  }

  listForEmployee(employeeId: string): RuntimeDispatchRow[] {
    return this.sqlite.prepare(`
      SELECT
        dispatch_id as dispatchId,
        employee_id as employeeId,
        work_item_id as workItemId,
        task_title as taskTitle,
        task_body as taskBody,
        task_type as taskType,
        status,
        workspace_task_ref as workspaceTaskRef,
        created_at as createdAt
      FROM runtime_dispatches
      WHERE employee_id = ?
      ORDER BY created_at DESC, rowid DESC
    `).all(employeeId) as RuntimeDispatchRow[];
  }
}
