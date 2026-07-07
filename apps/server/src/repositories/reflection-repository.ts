import type Database from 'better-sqlite3';

export interface ReflectionRow {
  reflectionId: string;
  employeeId: string;
  createdAt: string;
  summary: string;
}

export class ReflectionRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(input: { employeeId: string; summary: string }): ReflectionRow {
    const reflection: ReflectionRow = {
      reflectionId: `reflection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      createdAt: new Date().toISOString(),
      summary: input.summary,
    };

    this.sqlite
      .prepare(
        `INSERT INTO reflections (reflection_id, employee_id, created_at, summary) VALUES (?, ?, ?, ?)`,
      )
      .run(reflection.reflectionId, reflection.employeeId, reflection.createdAt, reflection.summary);

    return reflection;
  }

  listForEmployee(employeeId: string): ReflectionRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            reflection_id as reflectionId,
            employee_id as employeeId,
            created_at as createdAt,
            summary
          FROM reflections
          WHERE employee_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(employeeId) as ReflectionRow[];
  }

  latestForEmployee(employeeId: string): ReflectionRow | undefined {
    return this.sqlite
      .prepare(
        `
          SELECT
            reflection_id as reflectionId,
            employee_id as employeeId,
            created_at as createdAt,
            summary
          FROM reflections
          WHERE employee_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `,
      )
      .get(employeeId) as ReflectionRow | undefined;
  }
}
