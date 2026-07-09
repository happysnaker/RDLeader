import type { AssembleTaskContextInput } from '@rdleader/brain';

export function classifyFeishuBridgeTaskType(messageBody: string): AssembleTaskContextInput['taskType'] {
  const normalized = messageBody.toLowerCase();

  if (/(复盘|回顾|总结|反思)/.test(messageBody)) {
    return 'reflection';
  }

  if (/(同步|对齐|blocked|卡住|协助|帮我看|一起看)/.test(normalized + messageBody)) {
    return 'coordination';
  }

  if (/(代码|修复|实现|链路|仓库|repo|bug|排查|review)/.test(normalized + messageBody)) {
    return 'coding';
  }

  if (/(群里|内部群|通知同学|协调)/.test(normalized + messageBody)) {
    return 'collaboration';
  }

  return 'status';
}

export function shouldUseDirectFeishuReply(input: {
  taskType: AssembleTaskContextInput['taskType'];
  body: string;
}) {
  return input.taskType === 'status' && !/(仓库|代码|实现|排查|修|review|链路|repo)/.test(input.body);
}

export function buildDirectFeishuReply(input: {
  displayName: string;
  recentDoneSummary: string;
  nextStepSummary: string;
}) {
  return [
    `我是${input.displayName}。`,
    `当前在推进：${input.recentDoneSummary}。`,
    `下一步：${input.nextStepSummary}。`,
    '如果你要我真正去看仓库、查代码或落改动，我会基于真实工作区继续处理，不会编造成果。',
  ].join('');
}

export function buildRuntimeForwardPrompt(input: {
  personaBrief: string;
  messageBody: string;
  context: unknown;
  recentFeishuTurns: unknown;
}) {
  return [
    input.personaBrief,
    '你正在处理一条来自飞书的员工工作消息。不要虚报任何已完成的外部动作。',
    `用户消息：${input.messageBody}`,
    `脑内上下文：${JSON.stringify(input.context, null, 2)}`,
    `最近飞书回合：${JSON.stringify(input.recentFeishuTurns, null, 2)}`,
  ].join('\n\n');
}
