import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const baseUrl = process.env.RDLEADER_BASE_URL ?? 'http://127.0.0.1:3001';
const employeeId = process.env.RDLEADER_GROUP_ROUTE_EMPLOYEE_ID ?? 'lushirong';
const explicitChatId = process.env.RDLEADER_GROUP_ROUTE_CHAT_ID ?? '';
const explicitChatName = process.env.RDLEADER_GROUP_ROUTE_CHAT_NAME ?? '';
const preferredQueries = ['RDLeader Bot QA · 卢世荣', 'RDLeader Bot QA', '机器人测试2', '机器人测试', '导流QA自助'];
const rootDir = '/Users/bytedance/GolandProjects/DevPlan/RdLeader';
const reportsDir = path.join(rootDir, 'docs', 'qa', 'reports');

async function requestJson(urlPath, options = {}) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, payload };
}

async function searchChat(query) {
  const { stdout } = await execFileAsync('lark-cli', [
    'im',
    '+chat-search',
    '--as',
    'user',
    '--query',
    query,
    '--json',
  ]);
  const payload = JSON.parse(stdout);
  const chats = Array.isArray(payload?.data?.chats) ? payload.data.chats : [];
  return chats.find((chat) => typeof chat?.chat_id === 'string' && typeof chat?.name === 'string' && chat.external === false);
}

async function resolveChat() {
  if (explicitChatId.trim() && explicitChatName.trim()) {
    return {
      chatId: explicitChatId.trim(),
      chatName: explicitChatName.trim(),
      source: 'explicit',
    };
  }

  for (const query of preferredQueries) {
    const chat = await searchChat(query).catch(() => null);
    if (chat?.chat_id && chat?.name) {
      return {
        chatId: chat.chat_id,
        chatName: chat.name,
        source: `search:${query}`,
      };
    }
  }

  throw new Error('No suitable test group found. Set RDLEADER_GROUP_ROUTE_CHAT_ID and RDLEADER_GROUP_ROUTE_CHAT_NAME.');
}

async function main() {
  const startedAt = new Date().toISOString();
  const targetChat = await resolveChat();

  const bindResponse = await requestJson(`/employees/${employeeId}/project-groups`, {
    method: 'POST',
    body: JSON.stringify({
      chatId: targetChat.chatId,
      chatName: targetChat.chatName,
      status: 'active',
      isDefault: false,
      managerProxyRequired: true,
    }),
  });

  if (!bindResponse.ok) {
    throw new Error(`bind failed: ${JSON.stringify(bindResponse.payload)}`);
  }

  const sendBody = `QA report route repair check @ ${new Date().toISOString()}`;
  const sendResponse = await requestJson(`/employees/${employeeId}/actions/send-group-message`, {
    method: 'POST',
    body: JSON.stringify({
      chatId: targetChat.chatId,
      body: sendBody,
      approved: true,
    }),
  });

  if (!sendResponse.ok) {
    throw new Error(`send failed: ${JSON.stringify(sendResponse.payload)}`);
  }

  const latestGroups = await requestJson(`/employees/${employeeId}/project-groups`);
  const latestGroup = Array.isArray(latestGroups.payload)
    ? latestGroups.payload.find((group) => group.chatId === targetChat.chatId)
    : null;

  const report = {
    baseUrl,
    employeeId,
    startedAt,
    finishedAt: new Date().toISOString(),
    targetChat,
    checks: {
      bindOk: bindResponse.ok,
      sendOk: sendResponse.ok,
      identityUsed: sendResponse.payload?.result?.identityUsed ?? null,
      autoRepairedBotRoute: Boolean(sendResponse.payload?.result?.autoRepairedBotRoute),
      bindingManagerProxyRequired: latestGroup?.managerProxyRequired ?? null,
      botPresenceState: latestGroup?.botPresenceState ?? null,
    },
    bindResponse: bindResponse.payload,
    sendResponse: sendResponse.payload,
    latestGroup,
  };

  const pass =
    report.checks.bindOk &&
    report.checks.sendOk &&
    report.checks.identityUsed === 'bot' &&
    (report.checks.autoRepairedBotRoute === true || report.checks.botPresenceState === 'in_chat') &&
    report.checks.bindingManagerProxyRequired === false;

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.join(reportsDir, 'latest-group-route-repair.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  await fs.writeFile(
    path.join(reportsDir, 'latest-group-route-repair.md'),
    [
      '# RDLeader Group Route Repair Report',
      '',
      `- employeeId: ${employeeId}`,
      `- chat: ${targetChat.chatName}（${targetChat.chatId}）`,
      `- source: ${targetChat.source}`,
      `- startedAt: ${report.startedAt}`,
      `- finishedAt: ${report.finishedAt}`,
      `- bindOk: ${report.checks.bindOk ? 'yes' : 'no'}`,
      `- sendOk: ${report.checks.sendOk ? 'yes' : 'no'}`,
      `- identityUsed: ${String(report.checks.identityUsed)}`,
      `- autoRepairedBotRoute: ${report.checks.autoRepairedBotRoute ? 'yes' : 'no'}`,
      `- managerProxyRequired(after): ${String(report.checks.bindingManagerProxyRequired)}`,
      `- botPresenceState(after): ${String(report.checks.botPresenceState)}`,
      `- verdict: ${pass ? 'PASS' : 'FAIL'}`,
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = pass ? 0 : 1;
}

main().catch(async (error) => {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(
    path.join(reportsDir, 'latest-group-route-repair-error.json'),
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      },
      null,
      2,
    ),
    'utf8',
  );
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
