import type Database from 'better-sqlite3';

export type ProjectGroupBindingStatus = 'active' | 'watching' | 'archived';

export interface ProjectGroupBindingRow {
  bindingId: string;
  employeeId: string;
  chatId: string;
  chatName: string;
  status: ProjectGroupBindingStatus;
  isDefault: boolean;
  managerProxyRequired: boolean;
  lastSyncedAt: string | null;
}

export class ProjectGroupBindingRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seed(bindings: ProjectGroupBindingRow[]) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO project_group_bindings (
        binding_id,
        employee_id,
        chat_id,
        chat_name,
        status,
        is_default,
        manager_proxy_required,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const binding of bindings) {
      statement.run(
        binding.bindingId,
        binding.employeeId,
        binding.chatId,
        binding.chatName,
        binding.status,
        binding.isDefault ? 1 : 0,
        binding.managerProxyRequired ? 1 : 0,
        binding.lastSyncedAt,
      );
    }
  }

  listForEmployee(employeeId: string): ProjectGroupBindingRow[] {
    const rows = this.sqlite.prepare(`
      SELECT
        binding_id as bindingId,
        employee_id as employeeId,
        chat_id as chatId,
        chat_name as chatName,
        status,
        is_default as isDefault,
        manager_proxy_required as managerProxyRequired,
        last_synced_at as lastSyncedAt
      FROM project_group_bindings
      WHERE employee_id = ?
      ORDER BY is_default DESC, rowid ASC
    `).all(employeeId) as Array<{
      bindingId: string;
      employeeId: string;
      chatId: string;
      chatName: string;
      status: ProjectGroupBindingStatus;
      isDefault: number;
      managerProxyRequired: number;
      lastSyncedAt: string | null;
    }>;

    return rows.map((row) => ({
      ...row,
      isDefault: Boolean(row.isDefault),
      managerProxyRequired: Boolean(row.managerProxyRequired),
    }));
  }

  create(input: {
    employeeId: string;
    chatId: string;
    chatName: string;
    status?: ProjectGroupBindingStatus;
    isDefault?: boolean;
    managerProxyRequired?: boolean;
    lastSyncedAt?: string | null;
  }): ProjectGroupBindingRow {
    if (input.isDefault) {
      this.sqlite.prepare(`UPDATE project_group_bindings SET is_default = 0 WHERE employee_id = ?`).run(input.employeeId);
    }

    const binding: ProjectGroupBindingRow = {
      bindingId: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      chatId: input.chatId,
      chatName: input.chatName,
      status: input.status ?? 'active',
      isDefault: input.isDefault ?? false,
      managerProxyRequired: input.managerProxyRequired ?? true,
      lastSyncedAt: input.lastSyncedAt ?? null,
    };

    this.sqlite.prepare(`
      INSERT INTO project_group_bindings (
        binding_id,
        employee_id,
        chat_id,
        chat_name,
        status,
        is_default,
        manager_proxy_required,
        last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      binding.bindingId,
      binding.employeeId,
      binding.chatId,
      binding.chatName,
      binding.status,
      binding.isDefault ? 1 : 0,
      binding.managerProxyRequired ? 1 : 0,
      binding.lastSyncedAt,
    );

    return binding;
  }

  get(bindingId: string): ProjectGroupBindingRow | undefined {
    const row = this.sqlite.prepare(`
      SELECT
        binding_id as bindingId,
        employee_id as employeeId,
        chat_id as chatId,
        chat_name as chatName,
        status,
        is_default as isDefault,
        manager_proxy_required as managerProxyRequired,
        last_synced_at as lastSyncedAt
      FROM project_group_bindings
      WHERE binding_id = ?
    `).get(bindingId) as
      | {
          bindingId: string;
          employeeId: string;
          chatId: string;
          chatName: string;
          status: ProjectGroupBindingStatus;
          isDefault: number;
          managerProxyRequired: number;
          lastSyncedAt: string | null;
        }
      | undefined;

    return row
      ? {
          ...row,
          isDefault: Boolean(row.isDefault),
          managerProxyRequired: Boolean(row.managerProxyRequired),
        }
      : undefined;
  }

  updateStatus(bindingId: string, status: ProjectGroupBindingStatus, lastSyncedAt: string | null = null) {
    this.sqlite
      .prepare(`UPDATE project_group_bindings SET status = ?, last_synced_at = ? WHERE binding_id = ?`)
      .run(status, lastSyncedAt, bindingId);
    return this.get(bindingId);
  }

  setDefault(bindingId: string) {
    const binding = this.get(bindingId);
    if (!binding) return undefined;
    this.sqlite.prepare(`UPDATE project_group_bindings SET is_default = 0 WHERE employee_id = ?`).run(binding.employeeId);
    this.sqlite.prepare(`UPDATE project_group_bindings SET is_default = 1 WHERE binding_id = ?`).run(bindingId);
    return this.get(bindingId);
  }
}
