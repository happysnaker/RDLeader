import type Database from 'better-sqlite3';

export interface FeishuAgentOnboardingSessionRow {
  sessionId: string;
  employeeId: string;
  domain: 'feishu' | 'lark';
  verificationUrl: string;
  deviceCode: string;
  qrImagePath: string | null;
  qrDataUrl: string | null;
  expiresAt: string;
  createdAt: string;
}

export class FeishuAgentOnboardingSessionRepository {
  constructor(private readonly sqlite: Database.Database) {}

  upsert(input: Omit<FeishuAgentOnboardingSessionRow, 'sessionId'> & { sessionId?: string }) {
    const session: FeishuAgentOnboardingSessionRow = {
      sessionId: input.sessionId ?? `feishu-agent-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
    };

    this.sqlite.prepare(`
      DELETE FROM feishu_agent_onboarding_sessions
      WHERE employee_id = ?
    `).run(session.employeeId);

    this.sqlite.prepare(`
      INSERT INTO feishu_agent_onboarding_sessions (
        session_id,
        employee_id,
        domain,
        verification_url,
        device_code,
        qr_image_path,
        qr_data_url,
        expires_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.sessionId,
      session.employeeId,
      session.domain,
      session.verificationUrl,
      session.deviceCode,
      session.qrImagePath,
      session.qrDataUrl,
      session.expiresAt,
      session.createdAt,
    );

    return session;
  }

  getByEmployee(employeeId: string) {
    return this.sqlite.prepare(`
      SELECT
        session_id as sessionId,
        employee_id as employeeId,
        domain,
        verification_url as verificationUrl,
        device_code as deviceCode,
        qr_image_path as qrImagePath,
        qr_data_url as qrDataUrl,
        expires_at as expiresAt,
        created_at as createdAt
      FROM feishu_agent_onboarding_sessions
      WHERE employee_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `).get(employeeId) as FeishuAgentOnboardingSessionRow | undefined;
  }

  deleteByEmployee(employeeId: string) {
    this.sqlite.prepare(`
      DELETE FROM feishu_agent_onboarding_sessions
      WHERE employee_id = ?
    `).run(employeeId);
  }
}
