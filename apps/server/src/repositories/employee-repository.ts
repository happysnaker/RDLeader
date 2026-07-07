import type Database from 'better-sqlite3';
import type { EmployeeRecord } from '@rdleader/domain';

export interface EmployeeRow {
  employeeId: string;
  displayName: string;
  level: string;
  employmentStatus: string;
  directionId: string;
  recentDoneSummary: string;
  nextStepSummary: string;
  workspacePath: string;
  runtimeKind: string;
  emotionCurrent: string;
  emotionIntensity: number;
  emotionSummary: string;
  reliabilityScore: number;
}

export class EmployeeRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seed(employees: EmployeeRecord[]) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO employees (
        employee_id,
        display_name,
        level,
        employment_status,
        direction_id,
        recent_done_summary,
        next_step_summary,
        workspace_path,
        runtime_kind,
        emotion_current,
        emotion_intensity,
        emotion_summary,
        reliability_score
      ) VALUES (
        @employeeId,
        @displayName,
        @level,
        @employmentStatus,
        @directionId,
        @recentDoneSummary,
        @nextStepSummary,
        @workspacePath,
        @runtimeKind,
        @emotionCurrent,
        @emotionIntensity,
        @emotionSummary,
        @reliabilityScore
      )
    `);

    for (const employee of employees) {
      statement.run({
        employeeId: employee.employeeId,
        displayName: employee.displayName,
        level: employee.level,
        employmentStatus: employee.employmentStatus,
        directionId: employee.directionId,
        recentDoneSummary: employee.recentDoneSummary,
        nextStepSummary: employee.nextStepSummary,
        workspacePath: employee.workspacePath,
        runtimeKind: employee.runtimeKind,
        emotionCurrent: employee.emotionState.current,
        emotionIntensity: employee.emotionState.intensity,
        emotionSummary: employee.emotionState.summary,
        reliabilityScore: employee.performanceState.reliabilityScore,
      });
    }
  }

  list(): EmployeeRow[] {
    return this.sqlite.prepare(`
      SELECT
        employee_id as employeeId,
        display_name as displayName,
        level,
        employment_status as employmentStatus,
        direction_id as directionId,
        recent_done_summary as recentDoneSummary,
        next_step_summary as nextStepSummary,
        workspace_path as workspacePath,
        runtime_kind as runtimeKind,
        emotion_current as emotionCurrent,
        emotion_intensity as emotionIntensity,
        emotion_summary as emotionSummary,
        reliability_score as reliabilityScore
      FROM employees
      ORDER BY employee_id ASC
    `).all() as EmployeeRow[];
  }

  get(employeeId: string): EmployeeRow | undefined {
    return this.sqlite.prepare(`
      SELECT
        employee_id as employeeId,
        display_name as displayName,
        level,
        employment_status as employmentStatus,
        direction_id as directionId,
        recent_done_summary as recentDoneSummary,
        next_step_summary as nextStepSummary,
        workspace_path as workspacePath,
        runtime_kind as runtimeKind,
        emotion_current as emotionCurrent,
        emotion_intensity as emotionIntensity,
        emotion_summary as emotionSummary,
        reliability_score as reliabilityScore
      FROM employees
      WHERE employee_id = ?
    `).get(employeeId) as EmployeeRow | undefined;
  }

  updateLevel(employeeId: string, level: '1-2' | '2-1' | '2-2') {
    this.sqlite.prepare(`UPDATE employees SET level = ? WHERE employee_id = ?`).run(level, employeeId);
  }

  updateEmploymentStatus(employeeId: string, employmentStatus: 'candidate' | 'active' | 'probation' | 'resigned' | 'fired') {
    this.sqlite.prepare(`UPDATE employees SET employment_status = ? WHERE employee_id = ?`).run(employmentStatus, employeeId);
  }

  updateEmotion(employeeId: string, input: { emotionCurrent: string; emotionIntensity: number; emotionSummary: string }) {
    this.sqlite
      .prepare(
        `UPDATE employees SET emotion_current = ?, emotion_intensity = ?, emotion_summary = ? WHERE employee_id = ?`,
      )
      .run(input.emotionCurrent, input.emotionIntensity, input.emotionSummary, employeeId);
  }
}
