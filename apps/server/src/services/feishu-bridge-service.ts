import type { AssembleTaskContextInput } from '@rdleader/brain';

export function classifyFeishuBridgeTaskType(messageBody: string): AssembleTaskContextInput['taskType'] {
  const normalized = messageBody.toLowerCase();

  if (/(复盘|回顾|总结|反思)/.test(messageBody)) {
    return 'reflection';
  }

  if (/(同步|对齐|blocked|卡住|协助|帮我看|一起看)/.test(normalized + messageBody)) {
    return 'coordination';
  }

  if (/(代码|修复|实现|链路|仓库|repo|bug|排查|review|调研|研究|看一下|查一下|分析|梳理|验证|追踪)/.test(normalized + messageBody)) {
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
  return isGreetingMessage(input.body);
}

function shortenText(text: string | null | undefined, maxLength: number = 72) {
  const normalized = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  const sentence = normalized.split(/[。！？\n]/)[0]?.trim() ?? normalized;
  if (sentence.length <= maxLength) {
    return sentence;
  }

  return `${sentence.slice(0, maxLength)}…`;
}

function isGreetingMessage(messageBody: string) {
  const normalized = messageBody.trim().toLowerCase();
  return /^(你好|hi|hello|嗨|在吗|早上好|下午好|晚上好)[！!,.，。?？\s]*$/.test(normalized);
}

function isBlockerQuestion(messageBody: string) {
  return /(阻塞|blocker|卡在哪|卡住)/.test(messageBody);
}

function isNextStepQuestion(messageBody: string) {
  return /(下一步|接下来|后续)/.test(messageBody);
}

function isProgressQuestion(messageBody: string) {
  return /(进展|情况|状态|在做什么|忙什么|最近怎么样|今天怎么样|今天真实进展)/.test(messageBody);
}

function summarizeConversationBlocker(blocker: string | null | undefined) {
  const normalized = (blocker ?? '').trim();
  if (!normalized) {
    return '';
  }

  if (/Runtime 执行失败|ACP process exited|ult, log, and worker state files/i.test(normalized)) {
    return '上一轮 Runtime 还有一条失败待清理';
  }

  return shortenText(normalized);
}

export function buildDirectFeishuReply(input: {
  displayName: string;
  body: string;
  currentAssignments: string[];
  recentDoneSummary: string;
  nextStepSummary: string;
  currentBlockers?: string[];
}) {
  const currentFocus = input.currentAssignments[0]?.trim() || shortenText(input.recentDoneSummary) || '当前工作';
  const blockerSummary = summarizeConversationBlocker(input.currentBlockers?.[0]);
  const progressSummary = shortenText(input.recentDoneSummary);
  const nextStepSummary = shortenText(input.nextStepSummary) || '继续推进当前事项';

  if (isGreetingMessage(input.body)) {
    return blockerSummary
      ? `在，我刚还在盯「${currentFocus}」，目前卡点是 ${blockerSummary}。你直接说想看哪块，我继续给你同步。`
      : `在，我刚还在处理「${currentFocus}」。你直接说想看进展、仓库还是具体问题，我继续跟你同步。`;
  }

  if (isBlockerQuestion(input.body)) {
    return [
      `我是${input.displayName}。`,
      `当前在推进：${currentFocus}。`,
      blockerSummary ? `现在的真实 blocker 是：${blockerSummary}。` : '目前没有新增 blocker，但我还在继续收敛风险。 ',
      `下一步：${nextStepSummary}。`,
    ].join('');
  }

  if (isNextStepQuestion(input.body)) {
    return [
      `我是${input.displayName}。`,
      `当前在推进：${currentFocus}。`,
      `下一步我会先${nextStepSummary}。`,
      blockerSummary ? `当前还卡在：${blockerSummary}。` : '',
    ].join('');
  }

  if (isProgressQuestion(input.body)) {
    return [
      `我是${input.displayName}。`,
      `当前在推进：${currentFocus}。`,
      progressSummary ? `当前进展：${progressSummary}。` : '',
      blockerSummary ? `当前 blocker：${blockerSummary}。` : '',
      `下一步：${nextStepSummary}。`,
    ].join('');
  }

  return [
    `我是${input.displayName}。`,
    `当前在推进：${currentFocus}。`,
    progressSummary ? `我这边的最新情况是：${progressSummary}。` : '',
    `下一步：${nextStepSummary}。`,
    '如果你要我真正去看仓库、查代码或落改动，我会基于真实工作区继续处理，不会编造成果。',
  ].join('');
}

export function buildRuntimeForwardPrompt(input: {
  employeeDisplayName: string;
  personaBrief: string;
  messageBody: string;
  context: unknown;
  recentFeishuTurns: unknown;
}) {
  return [
    `你是 RDLeader 的研发员工 ${input.employeeDisplayName}，现在在飞书里和老板或同事真实交流。`,
    input.personaBrief,
    '你正在处理一条来自飞书的员工工作消息。回复必须自然，不要像固定模板，不要每次都重复同一段开场白。',
    '如果对方只是打招呼，就像一个真实员工那样简短回应，并顺带带一点当前工作状态。',
    '如果对方问进展、阻塞、下一步、协作请求，就基于真实上下文直接回答。',
    '只有在你确实没有完成外部动作时，才明确说明“还没做”；不要虚报任何已完成的外部动作。',
    `用户消息：${input.messageBody}`,
    `脑内上下文：${JSON.stringify(input.context, null, 2)}`,
    `最近飞书回合：${JSON.stringify(input.recentFeishuTurns, null, 2)}`,
  ].join('\n\n');
}
