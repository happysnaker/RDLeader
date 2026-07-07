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
  emotionCurrent: text('emotion_current').notNull(),
  emotionIntensity: real('emotion_intensity').notNull(),
  emotionSummary: text('emotion_summary').notNull(),
  reliabilityScore: real('reliability_score').notNull(),
});

export const messagesTable = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderEmployeeId: text('sender_employee_id').notNull(),
  recipientEmployeeId: text('recipient_employee_id').notNull(),
  body: text('body').notNull(),
});

export const candidatesTable = sqliteTable('candidates', {
  candidateId: text('candidate_id').primaryKey(),
  name: text('name').notNull(),
  interviewNotes: text('interview_notes').notNull(),
  status: text('status').notNull(),
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
