import type Database from 'better-sqlite3';
import type { EmployeeRecord, FeishuProfile, PersonaProfile } from '@rdleader/domain';

export interface EmployeeProfileRow {
  employeeId: string;
  managerId: string;
  riskFlags: string[];
  personaProfile: PersonaProfile;
  emotionTriggers: string[];
  feishuProfile: FeishuProfile;
}

export class EmployeeProfileRepository {
  constructor(private readonly sqlite: Database.Database) {}

  seed(employees: EmployeeRecord[]) {
    const statement = this.sqlite.prepare(`
      INSERT OR IGNORE INTO employee_profiles (
        employee_id,
        manager_id,
        risk_flags,
        persona_profile,
        emotion_triggers,
        feishu_profile
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const employee of employees) {
      statement.run(
        employee.employeeId,
        employee.managerId,
        JSON.stringify(employee.riskFlags),
        JSON.stringify(employee.personaProfile),
        JSON.stringify(employee.emotionState.triggers),
        JSON.stringify(employee.feishuProfile),
      );
    }
  }

  create(profile: EmployeeProfileRow) {
    this.sqlite.prepare(`
      INSERT INTO employee_profiles (
        employee_id,
        manager_id,
        risk_flags,
        persona_profile,
        emotion_triggers,
        feishu_profile
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      profile.employeeId,
      profile.managerId,
      JSON.stringify(profile.riskFlags),
      JSON.stringify(profile.personaProfile),
      JSON.stringify(profile.emotionTriggers),
      JSON.stringify(profile.feishuProfile),
    );

    return profile;
  }
  get(employeeId: string): EmployeeProfileRow | undefined {
    const row = this.sqlite.prepare(`
      SELECT
        employee_id as employeeId,
        manager_id as managerId,
        risk_flags as riskFlags,
        persona_profile as personaProfile,
        emotion_triggers as emotionTriggers,
        feishu_profile as feishuProfile
      FROM employee_profiles
      WHERE employee_id = ?
    `).get(employeeId) as
      | {
          employeeId: string;
          managerId: string;
          riskFlags: string;
          personaProfile: string;
          emotionTriggers: string;
          feishuProfile: string;
        }
      | undefined;

    if (!row) return undefined;

    return {
      employeeId: row.employeeId,
      managerId: row.managerId,
      riskFlags: JSON.parse(row.riskFlags),
      personaProfile: JSON.parse(row.personaProfile),
      emotionTriggers: JSON.parse(row.emotionTriggers),
      feishuProfile: JSON.parse(row.feishuProfile),
    };
  }

  updateFeishuProfile(employeeId: string, feishuProfile: FeishuProfile): EmployeeProfileRow | undefined {
    this.sqlite
      .prepare(
        `
          UPDATE employee_profiles
          SET feishu_profile = ?
          WHERE employee_id = ?
        `,
      )
      .run(JSON.stringify(feishuProfile), employeeId);

    return this.get(employeeId);
  }
}
