import type Database from 'better-sqlite3';

export interface AutonomySettingsRow {
  employeeId: string;
  enabled: boolean;
  cadenceHours: number;
  autoPromoteToDirectionKnowledge: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastOutcome: string | null;
  lastSummary: string | null;
}

function addHours(isoDate: string, hours: number) {
  return new Date(new Date(isoDate).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export class AutonomySettingsRepository {
  constructor(private readonly sqlite: Database.Database) {}

  private normalizeRow(
    row:
      | {
          employeeId: string;
          enabled: number;
          cadenceHours: number;
          autoPromoteToDirectionKnowledge: number;
          lastRunAt: string | null;
          nextRunAt: string | null;
          runCount: number;
          lastOutcome: string | null;
          lastSummary: string | null;
        }
      | undefined,
  ): AutonomySettingsRow | undefined {
    if (!row) {
      return undefined;
    }

    return {
      employeeId: row.employeeId,
      enabled: row.enabled === 1,
      cadenceHours: row.cadenceHours,
      autoPromoteToDirectionKnowledge: row.autoPromoteToDirectionKnowledge === 1,
      lastRunAt: row.lastRunAt,
      nextRunAt: row.nextRunAt,
      runCount: row.runCount,
      lastOutcome: row.lastOutcome,
      lastSummary: row.lastSummary,
    };
  }

  private insert(row: AutonomySettingsRow) {
    this.sqlite
      .prepare(
        `
          INSERT OR REPLACE INTO autonomy_settings (
            employee_id,
            enabled,
            cadence_hours,
            auto_promote_to_direction_knowledge,
            last_run_at,
            next_run_at,
            run_count,
            last_outcome,
            last_summary
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        row.employeeId,
        row.enabled ? 1 : 0,
        row.cadenceHours,
        row.autoPromoteToDirectionKnowledge ? 1 : 0,
        row.lastRunAt,
        row.nextRunAt,
        row.runCount,
        row.lastOutcome,
        row.lastSummary,
      );
  }

  get(employeeId: string): AutonomySettingsRow | undefined {
    return this.normalizeRow(
      this.sqlite
        .prepare(
          `
            SELECT
              employee_id as employeeId,
              enabled,
              cadence_hours as cadenceHours,
              auto_promote_to_direction_knowledge as autoPromoteToDirectionKnowledge,
              last_run_at as lastRunAt,
              next_run_at as nextRunAt,
              run_count as runCount,
              last_outcome as lastOutcome,
              last_summary as lastSummary
            FROM autonomy_settings
            WHERE employee_id = ?
          `,
        )
        .get(employeeId) as
        | {
            employeeId: string;
            enabled: number;
            cadenceHours: number;
            autoPromoteToDirectionKnowledge: number;
            lastRunAt: string | null;
            nextRunAt: string | null;
            runCount: number;
            lastOutcome: string | null;
            lastSummary: string | null;
          }
        | undefined,
    );
  }

  getOrCreate(employeeId: string, nowIso: string): AutonomySettingsRow {
    const existing = this.get(employeeId);
    if (existing) {
      return existing;
    }

    const created: AutonomySettingsRow = {
      employeeId,
      enabled: true,
      cadenceHours: 24,
      autoPromoteToDirectionKnowledge: false,
      lastRunAt: null,
      nextRunAt: addHours(nowIso, 24),
      runCount: 0,
      lastOutcome: null,
      lastSummary: null,
    };
    this.insert(created);
    return created;
  }

  update(employeeId: string, patch: Partial<AutonomySettingsRow>, nowIso: string): AutonomySettingsRow {
    const current = this.getOrCreate(employeeId, nowIso);
    const next: AutonomySettingsRow = {
      employeeId,
      enabled: patch.enabled ?? current.enabled,
      cadenceHours: patch.cadenceHours ?? current.cadenceHours,
      autoPromoteToDirectionKnowledge:
        patch.autoPromoteToDirectionKnowledge ?? current.autoPromoteToDirectionKnowledge,
      lastRunAt: patch.lastRunAt === undefined ? current.lastRunAt : patch.lastRunAt,
      nextRunAt: patch.nextRunAt === undefined ? current.nextRunAt : patch.nextRunAt,
      runCount: patch.runCount ?? current.runCount,
      lastOutcome: patch.lastOutcome === undefined ? current.lastOutcome : patch.lastOutcome,
      lastSummary: patch.lastSummary === undefined ? current.lastSummary : patch.lastSummary,
    };

    this.insert(next);
    return next;
  }

  listDue(nowIso: string): AutonomySettingsRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            employee_id as employeeId,
            enabled,
            cadence_hours as cadenceHours,
            auto_promote_to_direction_knowledge as autoPromoteToDirectionKnowledge,
            last_run_at as lastRunAt,
            next_run_at as nextRunAt,
            run_count as runCount,
            last_outcome as lastOutcome,
            last_summary as lastSummary
          FROM autonomy_settings
          WHERE enabled = 1
            AND next_run_at IS NOT NULL
            AND next_run_at <= ?
          ORDER BY next_run_at ASC, employee_id ASC
        `,
      )
      .all(nowIso) as Array<{
      employeeId: string;
      enabled: number;
      cadenceHours: number;
      autoPromoteToDirectionKnowledge: number;
      lastRunAt: string | null;
      nextRunAt: string | null;
      runCount: number;
      lastOutcome: string | null;
      lastSummary: string | null;
    }>;

    return rows
      .map((row) => this.normalizeRow(row))
      .filter((row): row is AutonomySettingsRow => Boolean(row));
  }
}
