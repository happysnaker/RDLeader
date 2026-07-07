import { describe, expect, it } from 'vitest';
import {
  employeeLevels,
  emotionStates,
  type EmployeeRecord,
} from './index';

describe('domain model', () => {
  it('exports supported employee levels', () => {
    expect(employeeLevels).toEqual(['1-2', '2-1', '2-2']);
  });

  it('exports supported emotion states', () => {
    expect(emotionStates).toContain('considering_exit');
  });

  it('allows an employee record with isolated workspace path', () => {
    const employee: EmployeeRecord = {
      employeeId: 'lushirong',
      displayName: '卢世荣',
      level: '2-1',
      directionId: 'independent-growth-diversion',
      employmentStatus: 'active',
      workspacePath: '~/GolandProjects/E/lushirong',
      runtimeKind: 'trae_acp',
      managerId: 'boss',
      defaultKnowledgeBaseIds: ['dir-independent-growth-diversion'],
      currentAssignments: [],
      recentDoneSummary: '最近完成导流相关方案推进',
      nextStepSummary: '继续推进提单页导流',
      riskFlags: [],
      personaProfile: {
        communicationTone: 'direct',
        ownershipBias: 'high',
        conflictTolerance: 'medium',
        pressureResponse: 'anxious-but-responsible',
        confidenceBaseline: 'steady',
        collaborationStyle: 'proactive',
        escalationPreference: 'early',
      },
      emotionState: {
        current: 'focused',
        intensity: 0.35,
        triggers: [],
        summary: '专注推进中',
      },
      performanceState: {
        deliveryTrend: 'up',
        communicationQuality: 'good',
        blockerHandling: 'good',
        reviewQuality: 'good',
        reliabilityScore: 0.82,
        promotionReadiness: 'watch',
        retentionRisk: 'low',
      },
      feishuProfile: {
        dmPolicy: 'manager-only',
        botName: '卢世荣',
        botOpenId: 'pending',
      },
    };

    expect(employee.workspacePath).toBe('~/GolandProjects/E/lushirong');
  });
});
