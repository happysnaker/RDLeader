import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { createDb } from '../db/client';

export interface PublicDemoResetInput {
  databasePath: string;
  nowIso?: string;
}

export interface PublicDemoResetSummary {
  databasePath: string;
  employees: number;
  workItems: number;
  runtimeDispatches: number;
  runtimeResults: number;
  approvalRequests: number;
  qaEpisodes: number;
}

const DEMO_DIRECTION_ID = 'demo-platform-reliability';
const DEMO_NOW = '2026-07-09T00:00:00.000Z';

function json(value: unknown) {
  return JSON.stringify(value);
}

function clearPublicDemoTables(sqlite: Database.Database) {
  const tables = [
    'autonomous_learning_runs',
    'autonomy_settings',
    'work_episodes',
    'runtime_result_events',
    'runtime_sessions',
    'runtime_dispatches',
    'approval_requests',
    'manager_conversation_messages',
    'work_items',
    'project_ops_events',
    'project_group_bindings',
    'direction_knowledge_records',
    'direction_configs',
    'employee_profiles',
    'employees',
  ];

  for (const table of tables) {
    sqlite.prepare(`DELETE FROM ${table}`).run();
  }
}

function insertEmployees(sqlite: Database.Database) {
  const employees = [
    {
      employeeId: 'alex-runtime',
      displayName: 'Alex Runtime',
      level: '2-1',
      recentDoneSummary: 'Completed demo runtime dispatch and result collection checks',
      nextStepSummary: 'Tighten stale recovery and approval handoff notes',
      workspacePath: 'demo://workers/alex-runtime',
      emotionCurrent: 'focused',
      emotionIntensity: 0.24,
      emotionSummary: 'Focused on runtime reliability evidence',
      deliveryTrend: 'up',
      communicationQuality: 'good',
      blockerHandling: 'good',
      reviewQuality: 'good',
      promotionReadiness: 'watch',
      retentionRisk: 'low',
      reliabilityScore: 0.86,
      personaProfile: {
        communicationTone: 'structured',
        ownershipBias: 'high',
        conflictTolerance: 'medium',
        pressureResponse: 'steady',
        confidenceBaseline: 'steady',
        collaborationStyle: 'proactive',
        escalationPreference: 'early',
      },
      emotionTriggers: ['demo stale task recovery'],
      feishuProfile: {
        dmPolicy: 'manager-only',
        botName: 'Alex Runtime Demo Bot',
        botOpenId: 'demo-bot-alex-runtime',
        bindingStatus: 'bound',
        chatMode: 'mention',
        identityPreset: 'bot-only',
        agentSource: 'openclaw',
        setupProfileName: 'public-demo',
      },
    },
    {
      employeeId: 'maya-systems',
      displayName: 'Maya Systems',
      level: '2-1',
      recentDoneSummary: 'Finished public QA evidence panel review',
      nextStepSummary: 'Prepare one-command demo reset walkthrough',
      workspacePath: 'demo://workers/maya-systems',
      emotionCurrent: 'calm',
      emotionIntensity: 0.18,
      emotionSummary: 'Calm and focused on public packaging polish',
      deliveryTrend: 'up',
      communicationQuality: 'good',
      blockerHandling: 'good',
      reviewQuality: 'excellent',
      promotionReadiness: 'watch',
      retentionRisk: 'low',
      reliabilityScore: 0.88,
      personaProfile: {
        communicationTone: 'direct',
        ownershipBias: 'high',
        conflictTolerance: 'medium',
        pressureResponse: 'steady',
        confidenceBaseline: 'steady',
        collaborationStyle: 'proactive',
        escalationPreference: 'normal',
      },
      emotionTriggers: ['public demo packaging'],
      feishuProfile: {
        dmPolicy: 'manager-only',
        botName: 'Maya Systems Demo Bot',
        botOpenId: 'demo-bot-maya-systems',
        bindingStatus: 'bound',
        chatMode: 'mention',
        identityPreset: 'bot-only',
        agentSource: 'openclaw',
        setupProfileName: 'public-demo',
      },
    },
  ];

  const employeeStatement = sqlite.prepare(`
    INSERT INTO employees (
      employee_id,
      display_name,
      level,
      employment_status,
      direction_id,
      recent_done_summary,
      next_step_summary,
      workspace_path,
      runtime_kind,
      resignation_intent,
      emotion_current,
      emotion_intensity,
      emotion_summary,
      delivery_trend,
      communication_quality,
      blocker_handling,
      review_quality,
      promotion_readiness,
      retention_risk,
      reliability_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const profileStatement = sqlite.prepare(`
    INSERT INTO employee_profiles (
      employee_id,
      manager_id,
      risk_flags,
      persona_profile,
      emotion_triggers,
      feishu_profile
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const employee of employees) {
    employeeStatement.run(
      employee.employeeId,
      employee.displayName,
      employee.level,
      'active',
      DEMO_DIRECTION_ID,
      employee.recentDoneSummary,
      employee.nextStepSummary,
      employee.workspacePath,
      'trae_acp',
      'low',
      employee.emotionCurrent,
      employee.emotionIntensity,
      employee.emotionSummary,
      employee.deliveryTrend,
      employee.communicationQuality,
      employee.blockerHandling,
      employee.reviewQuality,
      employee.promotionReadiness,
      employee.retentionRisk,
      employee.reliabilityScore,
    );
    profileStatement.run(
      employee.employeeId,
      'demo-lead',
      json([]),
      json(employee.personaProfile),
      json(employee.emotionTriggers),
      json(employee.feishuProfile),
    );
  }
}

function insertDirectionAndGroup(sqlite: Database.Database, nowIso: string) {
  sqlite.prepare(`
    INSERT INTO direction_configs (
      direction_id,
      display_name,
      default_knowledge_base_ids,
      default_repo_ids,
      common_document_refs,
      routing_hints
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    DEMO_DIRECTION_ID,
    'Demo Platform Reliability',
    json(['demo-kb-runtime-ops', 'demo-kb-approval-boundaries']),
    json(['demo-repo-rdleader-public']),
    json(['demo://docs/runtime-approval-deep-dive']),
    json(['public-demo', 'fake-data-only', 'approval-required-for-external-mutation']),
  );

  const groupStatement = sqlite.prepare(`
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
  `);

  for (const employeeId of ['alex-runtime', 'maya-systems']) {
    groupStatement.run(
      `demo-group-${employeeId}`,
      employeeId,
      'demo-group-control-plane',
      'Demo Control Plane QA',
      'active',
      1,
      1,
      nowIso,
    );
  }
}

function insertWorkItems(sqlite: Database.Database, nowIso: string) {
  const rows = [
    {
      workItemId: 'work-demo-runtime-recovery',
      employeeId: 'alex-runtime',
      title: 'Validate stale runtime recovery',
      summary: 'Confirm stale tasks become blocked and visible to the lead.',
      status: 'blocked',
    },
    {
      workItemId: 'work-demo-approval-boundary',
      employeeId: 'alex-runtime',
      title: 'Review approval boundary copy',
      summary: 'Check that external mutations require explicit lead approval.',
      status: 'active',
    },
    {
      workItemId: 'work-demo-qa-evidence',
      employeeId: 'maya-systems',
      title: 'Publish QA evidence summary',
      summary: 'Keep the public QA panel synthetic and reproducible.',
      status: 'completed',
    },
    {
      workItemId: 'work-demo-reset-path',
      employeeId: 'maya-systems',
      title: 'Document public demo reset path',
      summary: 'Make the fake-data demo state reproducible for outside reviewers.',
      status: 'active',
    },
  ];
  const statement = sqlite.prepare(`
    INSERT INTO work_items (
      work_item_id,
      employee_id,
      title,
      summary,
      status,
      source,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((row, index) => {
    const createdAt = new Date(new Date(nowIso).getTime() + index * 60_000).toISOString();
    statement.run(row.workItemId, row.employeeId, row.title, row.summary, row.status, 'seed', createdAt, createdAt);
  });
}

function insertRuntimeState(sqlite: Database.Database, nowIso: string) {
  sqlite.prepare(`
    INSERT INTO runtime_sessions (
      session_id,
      employee_id,
      runtime_kind,
      status,
      pid,
      started_at,
      stopped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('runtime-session-demo-alex', 'alex-runtime', 'trae_acp', 'running', null, nowIso, null);

  const dispatchStatement = sqlite.prepare(`
    INSERT INTO runtime_dispatches (
      dispatch_id,
      employee_id,
      work_item_id,
      task_title,
      task_body,
      task_type,
      status,
      workspace_task_ref,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  dispatchStatement.run(
    'dispatch-demo-runtime-recovery',
    'alex-runtime',
    'work-demo-runtime-recovery',
    'Validate stale runtime recovery',
    'Use the fake demo runtime outbox and confirm stale tasks become blocked.',
    'coding',
    'dispatched',
    'demo://workers/alex-runtime/.rdleader/tasks/dispatch-demo-runtime-recovery.json',
    nowIso,
  );
  dispatchStatement.run(
    'dispatch-demo-qa-evidence',
    'maya-systems',
    'work-demo-qa-evidence',
    'Publish QA evidence summary',
    'Summarize public smoke and endurance checks without exposing raw logs.',
    'status',
    'dispatched',
    'demo://workers/maya-systems/.rdleader/tasks/dispatch-demo-qa-evidence.json',
    new Date(new Date(nowIso).getTime() + 60_000).toISOString(),
  );

  const resultStatement = sqlite.prepare(`
    INSERT INTO runtime_result_events (
      event_id,
      employee_id,
      dispatch_id,
      work_item_id,
      status,
      summary,
      next_step_summary,
      artifact_refs,
      source_file_path,
      processed_file_path,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  resultStatement.run(
    'runtime-result-demo-runtime-recovery',
    'alex-runtime',
    'dispatch-demo-runtime-recovery',
    'work-demo-runtime-recovery',
    'blocked',
    'Recovery check found one stale task without a result event.',
    'Ask the lead whether to retry or reassign the fake work item.',
    json(['artifact://demo/runtime-recovery-report']),
    'demo://workers/alex-runtime/.rdleader/results/result-demo-runtime-recovery.json',
    'demo://workers/alex-runtime/.rdleader/results-processed/result-demo-runtime-recovery.json',
    new Date(new Date(nowIso).getTime() + 5 * 60_000).toISOString(),
  );
  resultStatement.run(
    'runtime-result-demo-qa-evidence',
    'maya-systems',
    'dispatch-demo-qa-evidence',
    'work-demo-qa-evidence',
    'completed',
    'Public QA evidence summary is ready for review.',
    'Link the reset command from README and sponsor updates.',
    json(['artifact://demo/qa-evidence-summary']),
    'demo://workers/maya-systems/.rdleader/results/result-demo-qa-evidence.json',
    'demo://workers/maya-systems/.rdleader/results-processed/result-demo-qa-evidence.json',
    new Date(new Date(nowIso).getTime() + 6 * 60_000).toISOString(),
  );
}

function insertApprovalsAndQa(sqlite: Database.Database, nowIso: string) {
  const messageStatement = sqlite.prepare(`
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
  `);
  messageStatement.run(
    'manager-demo-approval-001',
    'alex-runtime',
    'manager',
    'Please send the demo runtime recovery summary to the shared project room.',
    'coordination',
    null,
    json([]),
    1,
    'External project-room updates require explicit lead approval.',
    nowIso,
  );
  messageStatement.run(
    'manager-demo-approval-002',
    'maya-systems',
    'manager',
    'Create the public QA evidence note from sanitized demo data.',
    'status',
    null,
    json([]),
    1,
    'Shared document creation requires explicit lead approval.',
    nowIso,
  );

  const approvalStatement = sqlite.prepare(`
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
  `);
  approvalStatement.run(
    'approval-demo-project-room-update',
    'alex-runtime',
    'manager-demo-approval-001',
    'Send runtime recovery summary to the shared demo project room.',
    'high',
    'pending',
    'External group updates require lead approval before execution.',
    nowIso,
    null,
  );
  approvalStatement.run(
    'approval-demo-public-qa-note',
    'maya-systems',
    'manager-demo-approval-002',
    'Create a public QA evidence note from sanitized demo data.',
    'high',
    'approved',
    'Approved because it uses fake demo data only.',
    nowIso,
    new Date(new Date(nowIso).getTime() + 2 * 60_000).toISOString(),
  );

  const episodeStatement = sqlite.prepare(`
    INSERT INTO work_episodes (
      episode_id,
      employee_id,
      title,
      summary,
      status,
      blocker,
      reasoning_summary,
      artifact_refs,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  episodeStatement.run(
    'episode-demo-qa-smoke',
    'maya-systems',
    'QA evidence: smoke suite',
    'Public smoke checks cover overview, runtime dispatch, approval requests, and reset command output.',
    'completed',
    null,
    'Use the fake-data demo database to prove the public control-plane shape.',
    json(['artifact://demo/smoke-summary']),
    nowIso,
  );
  episodeStatement.run(
    'episode-demo-qa-endurance',
    'alex-runtime',
    'QA evidence: runtime endurance',
    'Demo runtime state includes completed and blocked result events for reviewer inspection.',
    'blocked',
    'One fake stale task is intentionally blocked to show recovery posture.',
    'Blocked work should be visible without exposing private runtime transcripts.',
    json(['artifact://demo/endurance-summary']),
    nowIso,
  );
}

function count(sqlite: Database.Database, table: string) {
  return sqlite.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() as number;
}

export function resetPublicDemoDatabase(input: PublicDemoResetInput): PublicDemoResetSummary {
  const databasePath = path.resolve(input.databasePath);
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const nowIso = input.nowIso ?? DEMO_NOW;
  const sqlite = createDb(databasePath);

  try {
    sqlite.transaction(() => {
      clearPublicDemoTables(sqlite);
      insertDirectionAndGroup(sqlite, nowIso);
      insertEmployees(sqlite);
      insertWorkItems(sqlite, nowIso);
      insertRuntimeState(sqlite, nowIso);
      insertApprovalsAndQa(sqlite, nowIso);
    })();

    return {
      databasePath,
      employees: count(sqlite, 'employees'),
      workItems: count(sqlite, 'work_items'),
      runtimeDispatches: count(sqlite, 'runtime_dispatches'),
      runtimeResults: count(sqlite, 'runtime_result_events'),
      approvalRequests: count(sqlite, 'approval_requests'),
      qaEpisodes: sqlite
        .prepare("SELECT COUNT(*) FROM work_episodes WHERE title LIKE 'QA evidence:%'")
        .pluck()
        .get() as number,
    };
  } finally {
    sqlite.close();
  }
}
