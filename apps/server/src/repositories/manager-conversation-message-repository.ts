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
      messageId?: string;
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
      messageId: input.messageId ?? `mgr-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  get(messageId: string): ManagerConversationMessageRow | undefined {
    const row = this.sqlite
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
          WHERE message_id = ?
        `,
      )
      .get(messageId) as
      | {
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
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      ...row,
      artifactRefs: JSON.parse(row.artifactRefs),
      approvalRequired: Boolean(row.approvalRequired),
    };
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

  update(
    messageId: string,
    input: {
      body?: string;
      taskType?: ManagerConversationTaskType;
      reasoningSummary?: string | null;
      artifactRefs?: string[];
      approvalRequired?: boolean;
      approvalSummary?: string | null;
    },
  ): ManagerConversationMessageRow | undefined {
    const existing = this.get(messageId);
    if (!existing) {
      return undefined;
    }

    const nextBody = typeof input.body === 'string' ? input.body : existing.body;
    const nextTaskType = input.taskType ?? existing.taskType;
    const nextReasoningSummary =
      input.reasoningSummary === undefined
        ? existing.reasoningSummary
        : input.reasoningSummary?.trim()
          ? input.reasoningSummary
          : null;
    const nextArtifactRefs = input.artifactRefs ?? existing.artifactRefs;
    const nextApprovalRequired = input.approvalRequired ?? existing.approvalRequired;
    const nextApprovalSummary =
      input.approvalSummary === undefined
        ? existing.approvalSummary
        : input.approvalSummary?.trim()
          ? input.approvalSummary
          : null;

    this.sqlite
      .prepare(
        `
          UPDATE manager_conversation_messages
          SET body = ?, task_type = ?, reasoning_summary = ?, artifact_refs = ?, approval_required = ?, approval_summary = ?
          WHERE message_id = ?
        `,
      )
      .run(
        nextBody,
        nextTaskType,
        nextReasoningSummary,
        JSON.stringify(nextArtifactRefs),
        nextApprovalRequired ? 1 : 0,
        nextApprovalSummary,
        messageId,
      );

    return {
      messageId: existing.messageId,
      employeeId: existing.employeeId,
      role: existing.role,
      body: nextBody,
      taskType: nextTaskType,
      reasoningSummary: nextReasoningSummary,
      artifactRefs: nextArtifactRefs,
      approvalRequired: nextApprovalRequired,
      approvalSummary: nextApprovalSummary,
      createdAt: existing.createdAt,
    };
  }
}
