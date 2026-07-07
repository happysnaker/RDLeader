import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const employeesTable = sqliteTable('employees', {
  employeeId: text('employee_id').primaryKey(),
  displayName: text('display_name').notNull(),
  level: text('level').notNull(),
  employmentStatus: text('employment_status').notNull(),
  directionId: text('direction_id').notNull(),
  recentDoneSummary: text('recent_done_summary').notNull(),
  nextStepSummary: text('next_step_summary').notNull(),
  workspacePath: text('workspace_path').notNull(),
  runtimeKind: text('runtime_kind').notNull(),
  resignationIntent: text('resignation_intent').notNull(),
  emotionCurrent: text('emotion_current').notNull(),
  emotionIntensity: real('emotion_intensity').notNull(),
  emotionSummary: text('emotion_summary').notNull(),
  deliveryTrend: text('delivery_trend').notNull(),
  communicationQuality: text('communication_quality').notNull(),
  blockerHandling: text('blocker_handling').notNull(),
  reviewQuality: text('review_quality').notNull(),
  promotionReadiness: text('promotion_readiness').notNull(),
  retentionRisk: text('retention_risk').notNull(),
  reliabilityScore: real('reliability_score').notNull(),
});

export const employeeProfilesTable = sqliteTable('employee_profiles', {
  employeeId: text('employee_id').primaryKey(),
  managerId: text('manager_id').notNull(),
  riskFlags: text('risk_flags').notNull(),
  personaProfile: text('persona_profile').notNull(),
  emotionTriggers: text('emotion_triggers').notNull(),
  feishuProfile: text('feishu_profile').notNull(),
});

export const messagesTable = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderEmployeeId: text('sender_employee_id').notNull(),
  recipientEmployeeId: text('recipient_employee_id').notNull(),
  body: text('body').notNull(),
});

export const managerConversationMessagesTable = sqliteTable('manager_conversation_messages', {
  messageId: text('message_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  role: text('role').notNull(),
  body: text('body').notNull(),
  taskType: text('task_type').notNull(),
  reasoningSummary: text('reasoning_summary'),
  artifactRefs: text('artifact_refs').notNull(),
  approvalRequired: integer('approval_required').notNull(),
  approvalSummary: text('approval_summary'),
  createdAt: text('created_at').notNull(),
});

export const approvalRequestsTable = sqliteTable('approval_requests', {
  requestId: text('request_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  sourceMessageId: text('source_message_id').notNull(),
  summary: text('summary').notNull(),
  riskLevel: text('risk_level').notNull(),
  status: text('status').notNull(),
  approvalSummary: text('approval_summary'),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
});

export const workItemsTable = sqliteTable('work_items', {
  workItemId: text('work_item_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  status: text('status').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const runtimeDispatchesTable = sqliteTable('runtime_dispatches', {
  dispatchId: text('dispatch_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  workItemId: text('work_item_id'),
  taskTitle: text('task_title').notNull(),
  taskBody: text('task_body').notNull(),
  taskType: text('task_type').notNull(),
  status: text('status').notNull(),
  workspaceTaskRef: text('workspace_task_ref').notNull(),
  createdAt: text('created_at').notNull(),
});

export const runtimeSessionsTable = sqliteTable('runtime_sessions', {
  sessionId: text('session_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  runtimeKind: text('runtime_kind').notNull(),
  status: text('status').notNull(),
  pid: integer('pid'),
  startedAt: text('started_at').notNull(),
  stoppedAt: text('stopped_at'),
});

export const runtimeResultEventsTable = sqliteTable('runtime_result_events', {
  eventId: text('event_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  dispatchId: text('dispatch_id'),
  workItemId: text('work_item_id'),
  status: text('status').notNull(),
  summary: text('summary').notNull(),
  nextStepSummary: text('next_step_summary'),
  artifactRefs: text('artifact_refs').notNull(),
  sourceFilePath: text('source_file_path').notNull(),
  processedFilePath: text('processed_file_path').notNull(),
  createdAt: text('created_at').notNull(),
});

export const candidatesTable = sqliteTable('candidates', {
  candidateId: text('candidate_id').primaryKey(),
  name: text('name').notNull(),
  interviewNotes: text('interview_notes').notNull(),
  status: text('status').notNull(),
});

export const interviewsTable = sqliteTable('interviews', {
  interviewId: text('interview_id').primaryKey(),
  candidateId: text('candidate_id').notNull(),
  stage: text('stage').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  summary: text('summary').notNull(),
  recommendation: text('recommendation').notNull(),
  createdAt: text('created_at').notNull(),
});

export const reflectionsTable = sqliteTable('reflections', {
  reflectionId: text('reflection_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  createdAt: text('created_at').notNull(),
  summary: text('summary').notNull(),
});

export const learningRecordsTable = sqliteTable('learning_records', {
  recordId: text('record_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  reflectionId: text('reflection_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  scope: text('scope').notNull(),
  promotedAt: text('promoted_at').notNull(),
});

export const emotionEventsTable = sqliteTable('emotion_events', {
  eventId: text('event_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  eventType: text('event_type').notNull(),
  intensityDelta: real('intensity_delta').notNull(),
  nextEmotion: text('next_emotion').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
});

export const performanceEventsTable = sqliteTable('performance_events', {
  eventId: text('event_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  eventType: text('event_type').notNull(),
  reliabilityDelta: real('reliability_delta').notNull(),
  nextDeliveryTrend: text('next_delivery_trend').notNull(),
  nextPromotionReadiness: text('next_promotion_readiness').notNull(),
  nextRetentionRisk: text('next_retention_risk').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
});

export const directionKnowledgeRecordsTable = sqliteTable('direction_knowledge_records', {
  recordId: text('record_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  directionId: text('direction_id').notNull(),
  learningRecordId: text('learning_record_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  promotedAt: text('promoted_at').notNull(),
});

export const directionConfigsTable = sqliteTable('direction_configs', {
  directionId: text('direction_id').primaryKey(),
  displayName: text('display_name').notNull(),
  defaultKnowledgeBaseIds: text('default_knowledge_base_ids').notNull(),
  defaultRepoIds: text('default_repo_ids').notNull(),
  commonDocumentRefs: text('common_document_refs').notNull(),
  routingHints: text('routing_hints').notNull(),
});

export const projectGroupBindingsTable = sqliteTable('project_group_bindings', {
  bindingId: text('binding_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  chatId: text('chat_id').notNull(),
  chatName: text('chat_name').notNull(),
  status: text('status').notNull(),
  isDefault: integer('is_default').notNull(),
  managerProxyRequired: integer('manager_proxy_required').notNull(),
  lastSyncedAt: text('last_synced_at'),
});

export const resignationEventsTable = sqliteTable('resignation_events', {
  eventId: text('event_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  nextIntent: text('next_intent').notNull(),
  summary: text('summary').notNull(),
  createdAt: text('created_at').notNull(),
});

export const managerProxyReviewsTable = sqliteTable('manager_proxy_reviews', {
  reviewId: text('review_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  reviewTopic: text('review_topic').notNull(),
  conclusion: text('conclusion').notNull(),
  nextSteps: text('next_steps').notNull(),
  createdAt: text('created_at').notNull(),
});

export const autonomySettingsTable = sqliteTable('autonomy_settings', {
  employeeId: text('employee_id').primaryKey(),
  enabled: integer('enabled').notNull(),
  cadenceHours: integer('cadence_hours').notNull(),
  autoPromoteToDirectionKnowledge: integer('auto_promote_to_direction_knowledge').notNull(),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  runCount: integer('run_count').notNull(),
  lastOutcome: text('last_outcome'),
  lastSummary: text('last_summary'),
});

export const autonomousLearningRunsTable = sqliteTable('autonomous_learning_runs', {
  cycleRunId: text('cycle_run_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  trigger: text('trigger').notNull(),
  createdAt: text('created_at').notNull(),
  summary: text('summary').notNull(),
  reflection: text('reflection').notNull(),
  learningRecord: text('learning_record').notNull(),
  directionKnowledgeRecord: text('direction_knowledge_record'),
  autonomySettings: text('autonomy_settings').notNull(),
});

export const workEpisodesTable = sqliteTable('work_episodes', {
  episodeId: text('episode_id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  status: text('status').notNull(),
  blocker: text('blocker'),
  reasoningSummary: text('reasoning_summary'),
  artifactRefs: text('artifact_refs').notNull(),
  createdAt: text('created_at').notNull(),
});
