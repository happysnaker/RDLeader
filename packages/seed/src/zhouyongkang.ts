import type { EmployeeRecord } from '@rdleader/domain';
import { independentGrowthDiversionDirection } from './directions';

export const zhouyongkangSeed: EmployeeRecord = {
  employeeId: 'zhouyongkang',
  displayName: '周永康',
  level: '2-1',
  directionId: independentGrowthDiversionDirection.directionId,
  employmentStatus: 'active',
  workspacePath: '~/GolandProjects/E/zhouyongkang',
  runtimeKind: 'trae_acp',
  managerId: 'boss',
  defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
  currentAssignments: ['购物车导流优化', '权益替换实验'],
  recentDoneSummary: '最近推进购物车双按钮导流与权益替换实验',
  nextStepSummary: '继续推进搜索承接与充值中心导流能力',
  riskFlags: [],
  personaProfile: {
    communicationTone: 'structured',
    ownershipBias: 'high',
    conflictTolerance: 'medium',
    pressureResponse: 'steady',
    confidenceBaseline: 'steady',
    collaborationStyle: 'proactive',
    escalationPreference: 'normal',
  },
  emotionState: {
    current: 'focused',
    intensity: 0.28,
    triggers: ['购物车导流需求并行推进'],
    summary: '对核心实验保持稳定推进',
  },
  performanceState: {
    deliveryTrend: 'up',
    communicationQuality: 'good',
    blockerHandling: 'good',
    reviewQuality: 'good',
    reliabilityScore: 0.8,
    promotionReadiness: 'watch',
    retentionRisk: 'low',
  },
  feishuProfile: {
    dmPolicy: 'manager-only',
    botName: '周永康',
    botOpenId: 'pending',
  },
};
