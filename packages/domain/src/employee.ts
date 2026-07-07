import type { EmotionStateSnapshot } from './emotion';
import type { PerformanceSnapshot } from './performance';
import type { PersonaProfile } from './persona';
import type { EmployeeLevel } from './index';

export type EmploymentStatus = 'candidate' | 'active' | 'probation' | 'resigned' | 'fired';
export type RuntimeKind = 'trae_acp' | 'codex_adapter' | 'disabled';

export interface FeishuProfile {
  dmPolicy: 'manager-only';
  botName: string;
  botOpenId: string;
}

export interface EmployeeRecord {
  employeeId: string;
  displayName: string;
  level: EmployeeLevel;
  directionId: string;
  employmentStatus: EmploymentStatus;
  workspacePath: string;
  runtimeKind: RuntimeKind;
  managerId: string;
  defaultKnowledgeBaseIds: string[];
  currentAssignments: string[];
  recentDoneSummary: string;
  nextStepSummary: string;
  riskFlags: string[];
  personaProfile: PersonaProfile;
  emotionState: EmotionStateSnapshot;
  performanceState: PerformanceSnapshot;
  feishuProfile: FeishuProfile;
}
