import { assembleTaskContext, type AssembleTaskContextInput } from '@rdleader/brain';
import type { FeishuConversationRepository, FeishuConversationTurnRow } from '../repositories/feishu-conversation-repository';

export interface FeishuBrainEmployeeContext {
  employeeId: string;
  displayName: string;
  directionId: string;
  personaProfile: unknown;
  emotionState: unknown;
  performanceState: unknown;
}

export function buildFeishuPersonaBrief(input: {
  displayName: string;
  emotionSummary?: string | null;
  deliveryTrend?: string | null;
  reliabilityScore?: number | null;
}) {
  return [
    `${input.displayName}说话直接，owner 感强。`,
    '在压力下会焦虑但仍然负责推进，不会虚报已完成的外部动作。',
    '遇到风险时会尽早升级，并明确说明真实 blocker 与下一步。',
    input.emotionSummary ? `当前情绪摘要：${input.emotionSummary}。` : '',
    input.deliveryTrend ? `当前交付趋势：${input.deliveryTrend}。` : '',
    typeof input.reliabilityScore === 'number' ? `当前可靠性分：${input.reliabilityScore}。` : '',
  ]
    .filter(Boolean)
    .join('');
}

export function buildFeishuBrainContext(input: {
  employee: FeishuBrainEmployeeContext;
  taskType: AssembleTaskContextInput['taskType'];
  workingMemory: string[];
  episodicMemory: string[];
  knowledgeItems: string[];
  threadKey: string;
  feishuConversationRepository: FeishuConversationRepository;
  emotionSummary?: string | null;
  deliveryTrend?: string | null;
  reliabilityScore?: number | null;
}) {
  const routedTaskType: AssembleTaskContextInput['taskType'] =
    input.taskType === 'status' ? 'coordination' : input.taskType;

  const context = assembleTaskContext({
    employee: input.employee,
    taskType: routedTaskType,
    workingMemory: input.workingMemory,
    episodicMemory: input.episodicMemory,
    knowledgeItems: input.knowledgeItems,
  });

  const recentFeishuTurns = input.feishuConversationRepository
    .listRecentForThread(input.threadKey, 8)
    .reverse();

  return {
    employeeId: input.employee.employeeId,
    requestedTaskType: input.taskType,
    routedTaskType,
    personaBrief: buildFeishuPersonaBrief({
      displayName: input.employee.displayName,
      emotionSummary: input.emotionSummary,
      deliveryTrend: input.deliveryTrend,
      reliabilityScore: input.reliabilityScore,
    }),
    recentFeishuTurns,
    context: {
      employeeId: context.employeeId,
      taskType: input.taskType,
      layers: [
        ...context.layers,
        {
          layer: 'knowledge',
          payload: {
            recentFeishuTurns,
          } satisfies {
            recentFeishuTurns: FeishuConversationTurnRow[];
          },
        },
      ],
    },
  };
}
