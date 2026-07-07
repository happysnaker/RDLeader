import type { EmployeeRecord } from '@rdleader/domain';
import { independentGrowthDiversionDirection } from './directions';

export const lushirongSeed: EmployeeRecord = {
  employeeId: 'lushirong',
  displayName: '卢世荣',
  level: '2-1',
  directionId: independentGrowthDiversionDirection.directionId,
  employmentStatus: 'active',
  workspacePath: '~/GolandProjects/E/lushirong',
  runtimeKind: 'trae_acp',
  managerId: 'boss',
  defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
  currentAssignments: ['推进提单页导流', '维护自然渠道承接策略'],
  recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
  nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
  riskFlags: [],
  personaProfile: {
    communicationTone: 'direct',
    ownershipBias: 'high',
    conflictTolerance: 'medium',
    pressureResponse: 'anxious-but-responsible',
    confidenceBaseline: 'self-critical',
    collaborationStyle: 'proactive',
    escalationPreference: 'early',
  },
  emotionState: {
    current: 'focused',
    intensity: 0.32,
    triggers: ['导流推进任务较多'],
    summary: '在压力下保持推进',
  },
  performanceState: {
    deliveryTrend: 'up',
    communicationQuality: 'good',
    blockerHandling: 'good',
    reviewQuality: 'good',
    reliabilityScore: 0.83,
    promotionReadiness: 'watch',
    retentionRisk: 'low',
  },
  feishuProfile: {
    dmPolicy: 'manager-only',
    botName: '卢世荣',
    botOpenId: 'pending',
  },
};
