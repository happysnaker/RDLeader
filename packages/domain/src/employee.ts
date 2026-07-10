import type { EmotionStateSnapshot } from './emotion';
import type { PerformanceSnapshot } from './performance';
import type { PersonaProfile } from './persona';
import type { EmployeeLevel } from './index';

export type EmploymentStatus = 'candidate' | 'active' | 'probation' | 'resigned' | 'fired';
export type RuntimeKind = 'trae_acp' | 'codex_adapter' | 'disabled';

export type FeishuAgentBindingStatus = 'unbound' | 'bound';
export type FeishuAgentChatMode = 'mention' | 'all';
export type FeishuAgentIdentityPreset = 'bot-only' | 'user-default';
export type FeishuAgentSource = 'larklink' | 'lark-channel' | 'openclaw' | 'hermes';

export interface FeishuProfile {
  dmPolicy: 'manager-only';
  botName: string;
  botOpenId: string;
  bindingStatus?: FeishuAgentBindingStatus;
  appId?: string;
  appSecretRef?: string;
  managerOpenId?: string;
  chatMode?: FeishuAgentChatMode;
  identityPreset?: FeishuAgentIdentityPreset;
  agentSource?: FeishuAgentSource;
  setupProfileName?: string;
  launchCommand?: string[];
  bindId?: string;
  lastBoundAt?: string;
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
