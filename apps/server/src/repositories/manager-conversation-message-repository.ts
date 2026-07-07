import type Database from 'better-sqlite3';

export type ManagerConversationRole = 'manager' | 'employee';
export type ManagerConversationTaskType = 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';

export interface ManagerConversationMessageRow {
  messageId: string;
  employeeId: string;
  role: ManagerConversationRole;
  body: string;
  taskType: ManagerConversationTaskType;
  reasoningSummary: string | null;
  artifactRefs: string[];
  approvalRequired: boolean;
  approvalSummary: string | null;
  createdAt: string;
}

export class ManagerConversationMessageRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      employeeId: string;
      role: ManagerConversationRole;
      body: string;
      taskType: ManagerConversationTaskType;
      reasoningSummary?: string | null;
      artifactRefs?: string[];
      approvalRequired?: boolean;
      approvalSummary?: string | null;
    },
    createdAt: string = new Date().toISOString(),
  ): ManagerConversationMessageRow {
    const message: ManagerConversationMessageRow = {
      messageId: `mgr-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      role: input.role,
      body: input.body,
      taskType: input.taskType,
      reasoningSummary: input.reasoningSummary?.trim() ? input.reasoningSummary : null,
      artifactRefs: input.artifactRefs ?? [],
      approvalRequired: input.approvalRequired ?? false,
      approvalSummary: input.approvalSummary?.trim() ? input.approvalSummary : null,
      createdAt,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO manager_conversation_messages (
            message_id,
            employee_id,
            role,
            body,
            task_type,
            reasoning_summary,
            artifact_refs,
            approval_required,
            approval_summary,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        message.messageId,
        message.employeeId,
        message.role,
        message.body,
        message.taskType,
        message.reasoningSummary,
        JSON.stringify(message.artifactRefs),
        message.approvalRequired ? 1 : 0,
        message.approvalSummary,
        message.createdAt,
      );

    return message;
  }

  listForEmployee(employeeId: string): ManagerConversationMessageRow[] {
    const rows = this.sqlite
      .prepare(
        `
          SELECT
            message_id as messageId,
            employee_id as employeeId,
            role,
            body,
            task_type as taskType,
            reasoning_summary as reasoningSummary,
            artifact_refs as artifactRefs,
            approval_required as approvalRequired,
            approval_summary as approvalSummary,
            created_at as createdAt
          FROM manager_conversation_messages
          WHERE employee_id = ?
          ORDER BY created_at ASC, rowid ASC
        `,
      )
      .all(employeeId) as Array<{
      messageId: string;
      employeeId: string;
      role: ManagerConversationRole;
      body: string;
      taskType: ManagerConversationTaskType;
      reasoningSummary: string | null;
      artifactRefs: string;
      approvalRequired: number;
      approvalSummary: string | null;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      ...row,
      artifactRefs: JSON.parse(row.artifactRefs),
      approvalRequired: Boolean(row.approvalRequired),
    }));
  }
}
