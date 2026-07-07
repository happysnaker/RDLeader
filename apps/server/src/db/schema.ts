import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const employeesTable = sqliteTable('employees', {
  employeeId: text('employee_id').primaryKey(),
  displayName: text('display_name').notNull(),
  level: text('level').notNull(),
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
