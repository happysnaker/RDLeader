export function buildAutonomyFeishuSummary(input: {
  employeeDisplayName: string;
  summary: string;
  nextStepSummary?: string | null;
}) {
  return [
    `${input.employeeDisplayName} 汇报：${input.summary}`,
    input.nextStepSummary ? `下一步：${input.nextStepSummary}` : null,
    '以上内容基于真实工作区结果，不代表任何外部动作已完成，除非消息里明确写明。',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildPeerSyncFeishuSummary(input: {
  senderDisplayName: string;
  recipientDisplayName: string;
  workItemTitle: string;
}) {
  return `${input.senderDisplayName} 请求 ${input.recipientDisplayName} 协作同步：${input.workItemTitle}`;
}
