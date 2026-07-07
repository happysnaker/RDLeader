import type Database from 'better-sqlite3';

export type ApprovalRequestRiskLevel = 'high';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequestRow {
  requestId: string;
  employeeId: string;
  sourceMessageId: string;
  summary: string;
  riskLevel: ApprovalRequestRiskLevel;
  status: ApprovalRequestStatus;
  approvalSummary: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export class ApprovalRequestRepository {
  constructor(private readonly sqlite: Database.Database) {}

  create(
    input: {
      employeeId: string;
      sourceMessageId: string;
      summary: string;
      riskLevel?: ApprovalRequestRiskLevel;
      approvalSummary?: string | null;
    },
    createdAt: string = new Date().toISOString(),
  ): ApprovalRequestRow {
    const request: ApprovalRequestRow = {
      requestId: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: input.employeeId,
      sourceMessageId: input.sourceMessageId,
      summary: input.summary.trim(),
      riskLevel: input.riskLevel ?? 'high',
      status: 'pending',
      approvalSummary: input.approvalSummary?.trim() ? input.approvalSummary.trim() : null,
      createdAt,
      resolvedAt: null,
    };

    this.sqlite
      .prepare(
        `
          INSERT INTO approval_requests (
            request_id,
            employee_id,
            source_message_id,
            summary,
            risk_level,
            status,
            approval_summary,
            created_at,
            resolved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        request.requestId,
        request.employeeId,
        request.sourceMessageId,
        request.summary,
        request.riskLevel,
        request.status,
        request.approvalSummary,
        request.createdAt,
        request.resolvedAt,
      );

    return request;
  }

  get(requestId: string): ApprovalRequestRow | undefined {
    return this.sqlite
      .prepare(
        `
          SELECT
            request_id as requestId,
            employee_id as employeeId,
            source_message_id as sourceMessageId,
            summary,
            risk_level as riskLevel,
            status,
            approval_summary as approvalSummary,
            created_at as createdAt,
            resolved_at as resolvedAt
          FROM approval_requests
          WHERE request_id = ?
        `,
      )
      .get(requestId) as ApprovalRequestRow | undefined;
  }

  listForEmployee(employeeId: string): ApprovalRequestRow[] {
    return this.sqlite
      .prepare(
        `
          SELECT
            request_id as requestId,
            employee_id as employeeId,
            source_message_id as sourceMessageId,
            summary,
            risk_level as riskLevel,
            status,
            approval_summary as approvalSummary,
            created_at as createdAt,
            resolved_at as resolvedAt
          FROM approval_requests
          WHERE employee_id = ?
          ORDER BY created_at DESC, rowid DESC
        `,
      )
      .all(employeeId) as ApprovalRequestRow[];
  }

  decide(
    requestId: string,
    input: {
      status: Exclude<ApprovalRequestStatus, 'pending'>;
      approvalSummary?: string | null;
    },
    resolvedAt: string = new Date().toISOString(),
  ): ApprovalRequestRow | undefined {
    const current = this.get(requestId);
    if (!current) {
      return undefined;
    }

    const nextApprovalSummary = input.approvalSummary?.trim()
      ? input.approvalSummary.trim()
      : current.approvalSummary;

    this.sqlite
      .prepare(
        `
          UPDATE approval_requests
          SET status = ?, approval_summary = ?, resolved_at = ?
          WHERE request_id = ?
        `,
      )
      .run(input.status, nextApprovalSummary, resolvedAt, requestId);

    return this.get(requestId);
  }
}
