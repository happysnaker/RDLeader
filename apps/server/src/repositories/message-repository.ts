import type Database from 'better-sqlite3';

export interface InternalMessageRow {
  senderEmployeeId: string;
  recipientEmployeeId: string;
  body: string;
}

export class MessageRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(message: InternalMessageRow) {
    this.sqlite
      .prepare(
        `INSERT INTO messages (sender_employee_id, recipient_employee_id, body) VALUES (?, ?, ?)`,
      )
      .run(message.senderEmployeeId, message.recipientEmployeeId, message.body);
  }

  listForEmployee(employeeId: string): InternalMessageRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            sender_employee_id as senderEmployeeId,
            recipient_employee_id as recipientEmployeeId,
            body
          FROM messages
          WHERE sender_employee_id = ? OR recipient_employee_id = ?
          ORDER BY id ASC
        `,
      )
      .all(employeeId, employeeId) as InternalMessageRow[];
  }
}
