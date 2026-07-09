import Fastify from 'fastify';
import { assembleTaskContext, type AssembleTaskContextInput } from '@rdleader/brain';
import { buildSeedDirectionKnowledgeRecords, loadEmployeeMemory, type EmployeeMemoryEntry } from '@rdleader/ingest';
import { corePlatformDirection, independentGrowthDiversionDirection, lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter, type RuntimeAdapter, type RuntimeCollectedEvent, resolveWorkspacePath } from '@rdleader/runtime';
import { createDb } from './db/client';
import { requiresApproval } from '@rdleader/policy';
import type { FeishuProfile } from '@rdleader/domain';
import { execFile, spawn, spawnSync } from 'node:child_process';
import { lstat, readdir, symlink, unlink, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { EmployeeRepository } from './repositories/employee-repository';
import { EmployeeProfileRepository } from './repositories/employee-profile-repository';
import { CandidateRepository } from './repositories/candidate-repository';
import { CandidateLifecycleRepository } from './repositories/candidate-lifecycle-repository';
import { InterviewRepository } from './repositories/interview-repository';
import { MessageRepository } from './repositories/message-repository';
import { ReflectionRepository } from './repositories/reflection-repository';
import { LearningRecordRepository } from './repositories/learning-record-repository';
import { ApprovalRequestRepository } from './repositories/approval-request-repository';
import { EmotionEventRepository } from './repositories/emotion-event-repository';
import { PerformanceEventRepository } from './repositories/performance-event-repository';
import { DirectionKnowledgeRepository } from './repositories/direction-knowledge-repository';
import { DirectionConfigRepository } from './repositories/direction-config-repository';
import { ProjectGroupBindingRepository } from './repositories/project-group-binding-repository';
import { ProjectOpsEventRepository } from './repositories/project-ops-event-repository';
import { ResignationEventRepository } from './repositories/resignation-event-repository';
import { ManagerProxyReviewRepository } from './repositories/manager-proxy-review-repository';
import {
  ManagerConversationMessageRepository,
  type ManagerConversationTaskType,
} from './repositories/manager-conversation-message-repository';
import { FeishuAgentOnboardingSessionRepository } from './repositories/feishu-agent-onboarding-session-repository';
import { FeishuConversationRepository } from './repositories/feishu-conversation-repository';
import { AutonomySettingsRepository } from './repositories/autonomy-settings-repository';
import { AutonomousLearningRunRepository } from './repositories/autonomous-learning-run-repository';
import { RuntimeDispatchRepository } from './repositories/runtime-dispatch-repository';
import { RuntimeResultEventRepository } from './repositories/runtime-result-event-repository';
import { RuntimeSessionRepository } from './repositories/runtime-session-repository';
import { WorkItemRepository } from './repositories/work-item-repository';
import { WorkEpisodeRepository } from './repositories/work-episode-repository';
import { runAutonomousLearningCycle } from './services/autonomous-learning';
import { buildFeishuBrainContext } from './services/feishu-brain-context-builder';
import {
  buildDirectFeishuReply,
  buildRuntimeForwardPrompt,
  classifyFeishuBridgeTaskType,
  shouldUseDirectFeishuReply,
} from './services/feishu-bridge-service';
import { startAutonomyScheduler } from './scheduler/autonomy-scheduler';

const execFileAsync = promisify(execFile);
const AUTONOMOUS_RUNTIME_DISPATCH_STALE_MS = 15 * 60_000;
const LATEST_SMOKE_REPORT_PATH = new URL('../../../docs/qa/reports/latest-local-smoke.json', import.meta.url);
const LATEST_RUNTIME_ENDURANCE_PATH = new URL('../../../docs/qa/reports/latest-runtime-endurance.json', import.meta.url);
const LATEST_GROUP_ROUTE_REPAIR_PATH = new URL('../../../docs/qa/reports/latest-group-route-repair.json', import.meta.url);
const GROUP_SEND_SCOPE_AUTH_DIR = new URL('../../../.uploads/group-send-scope-auth/', import.meta.url);
const FEISHU_AGENT_ONBOARDING_DIR = new URL('../../../.uploads/feishu-agent-onboarding/', import.meta.url);
const GROUP_SEND_SCOPE_BLOCKER = {
  key: 'group-send-scope',
  title: '经理代理群发（无法改走 bot 直发的场景）',
  status: 'blocked',
};
const DEFAULT_MEEGO_PROJECT_KEY = 'e-commerce';
const LOCAL_REPO_CANDIDATES: Record<string, string[]> = {
  'repo-funshopping-core': [path.join(os.homedir(), 'GolandProjects', 'funshopping_core')],
  'repo-funshopping-user-growth-dispatch': [
    path.join(os.homedir(), 'GolandProjects', '_worktrees', 'funshopping_user_growth_dispatch_feat_os'),
    path.join(os.homedir(), 'GolandProjects', '_worktrees', 'funshopping_user_growth_dispatch_ppe_cart_button'),
    path.join(os.homedir(), 'GolandProjects', '_worktrees', 'dispatch_feat_n629_fix'),
  ],
};
const EMPLOYEE_LARKLINK_AGENT_CANDIDATES: Array<{ id: string; command: string }> = [
  // Prefer Trae 2.0 (`traex`) over the legacy `traecli`/`coco` and over Codex.
  { id: 'traecli2', command: 'traex' },
  { id: 'codex', command: 'codex-acp' },
  { id: 'traecli', command: 'coco' },
  { id: 'claude', command: 'claude-agent-acp' },
  { id: 'aiden', command: 'aiden' },
];

function commandExistsSync(command: string) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

const EMPLOYEE_LARKLINK_AGENT_ID =
  process.env.RDLEADER_EMPLOYEE_LARKLINK_AGENT_ID?.trim() ||
  EMPLOYEE_LARKLINK_AGENT_CANDIDATES.find((candidate) => commandExistsSync(candidate.command))?.id ||
  'codex';
const EMPLOYEE_LARKLINK_BRIDGE_AGENT_ID = 'rdleader_feishu_bridge';
const RDLEADER_ROOT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function pathExists(targetPath: string) {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalRepoPath(repoId: string) {
  const candidates = LOCAL_REPO_CANDIDATES[repoId] ?? [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function workspaceRepoLinkName(repoId: string) {
  return repoId.replace(/^repo-/, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function buildEmployeeWorkspaceAgentGuide(input: {
  displayName: string;
  employeeId: string;
  directionDisplayName: string;
  workspacePath: string;
}) {
  return [
    `# ${input.displayName} Agent Guide`,
    '',
    `你是研发员工 ${input.displayName}（employeeId: ${input.employeeId}）。`,
    `你的方向是：${input.directionDisplayName}。`,
    `你的工作区是：${input.workspacePath}。`,
    '',
    '## 工作原则',
    '- 你要像真实研发员工一样沟通和推进工作。',
    '- 只允许陈述真实已经做过的事情，不能编造外部动作、外部系统结果或会议结果。',
    '- 优先查看 `WORKSPACE_MAP.md` 与 `repos/` 目录，再进入真实仓库工作。',
    '- 如果老板在飞书里问你当前进展，请给出：当前在做什么、下一步做什么、真实 blocker。',
    '- 如果你没有完成外部动作（群消息、Meego、文档、会议），必须明确说“还没做”。',
    '- 你的老板只有一个，就是与你私聊的研发 Leader。',
    '- 禁止危险或违法操作，尤其禁止删库跑路、破坏数据、泄露凭证。',
    '',
    '## 输出风格',
    '- 默认使用中文。',
    '- 先给结论，再补充一到三条关键事实。',
    '- 尽量引用真实文件路径、命令、分支、工作项，而不是泛泛而谈。',
  ].join('\n');
}

function parseJsonMaybe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractExecErrorPayload(error: unknown) {
  const rawStdout = error && typeof error === 'object' && 'stdout' in error ? (error as { stdout?: unknown }).stdout : '';
  const rawStderr = error && typeof error === 'object' && 'stderr' in error ? (error as { stderr?: unknown }).stderr : '';
  const stdout = typeof rawStdout === 'string' ? rawStdout : Buffer.isBuffer(rawStdout) ? rawStdout.toString('utf8') : '';
  const stderr = typeof rawStderr === 'string' ? rawStderr : Buffer.isBuffer(rawStderr) ? rawStderr.toString('utf8') : '';
  const parsed = parseJsonMaybe(stdout) ?? parseJsonMaybe(stderr);
  return {
    parsed,
    stdout,
    stderr,
  };
}

function extractCliErrorMessage(error: unknown, fallbackMessage: string) {
  const { parsed, stdout, stderr } = extractExecErrorPayload(error);
  if (parsed && typeof parsed === 'object') {
    const parsedError =
      'error' in parsed && parsed.error && typeof parsed.error === 'object'
        ? (parsed.error as { message?: unknown; hint?: unknown })
        : undefined;
    const parsedMessage =
      (parsedError && typeof parsedError.message === 'string' ? parsedError.message : undefined) ??
      (parsedError && typeof parsedError.hint === 'string' ? parsedError.hint : undefined) ??
      ('message' in parsed && typeof (parsed as { message?: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : undefined);
    if (parsedMessage) {
      return {
        parsed,
        message: parsedMessage,
      };
    }
  }

  return {
    parsed,
    message: stdout || stderr || fallbackMessage,
  };
}

function buildRuntimeEnduranceBlocker(report?: unknown) {
  const summary =
    report && typeof report === 'object' && 'summary' in report && report.summary && typeof report.summary === 'object'
      ? (report.summary as { cycles?: unknown; passed?: unknown; failed?: unknown })
      : undefined;
  const cycles = typeof summary?.cycles === 'number' ? summary.cycles : undefined;
  const passed = typeof summary?.passed === 'number' ? summary.passed : undefined;
  const failed = typeof summary?.failed === 'number' ? summary.failed : undefined;

  if (typeof cycles === 'number' && cycles >= 10 && failed === 0) {
    return null;
  }

  return {
    key: 'runtime-endurance',
    title: 'Runtime 长时间 endurance',
    status: 'observing',
    detail:
      typeof cycles === 'number' && typeof passed === 'number'
        ? `已验证 ${passed}/${cycles} cycles recovery pass；还在继续积累更长周期稳定性证据。`
        : '已验证 5/5 cycles recovery pass；还在继续积累更长周期稳定性证据。',
  };
}

function buildGroupSendScopeBlocker(input: {
  managerProxyBindings: Array<{
    employeeId: string;
    chatId: string;
    chatName: string;
  }>;
}) {
  if (input.managerProxyBindings.length === 0) {
    return null;
  }

  const preview = input.managerProxyBindings
    .slice(0, 3)
    .map((item) => `${item.chatName}（${item.chatId}）`)
    .join('、');
  const suffix =
    input.managerProxyBindings.length > 3 ? ` 等 ${input.managerProxyBindings.length} 个群` : `${input.managerProxyBindings.length} 个群`;

  return {
    ...GROUP_SEND_SCOPE_BLOCKER,
    detail: `bot 直发与自动邀请 bot 入群修复路线均已验证可用；当前仍有 ${suffix} 走经理代理发送（如：${preview}），若这些群无法改走 bot 直发，则 manager proxy 真实发送仍缺少 user scope: im:message.send_as_user。`,
  };
}

function isDemoPlaceholderChatId(chatId: string) {
  return chatId === 'oc_demo_group';
}

async function readLatestGroupRouteRepairReport() {
  try {
    return JSON.parse(await readFile(LATEST_GROUP_ROUTE_REPAIR_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function hasLatestVerifiedGroupRouteReport(report: unknown): report is {
  employeeId: string;
  latestGroup: {
    chatId: string;
    chatName: string;
    managerProxyRequired: boolean;
  };
} {
  return Boolean(
    report &&
      typeof report === 'object' &&
      typeof (report as { employeeId?: unknown }).employeeId === 'string' &&
      typeof (report as { latestGroup?: { chatId?: unknown } }).latestGroup?.chatId === 'string' &&
      typeof (report as { latestGroup?: { chatName?: unknown } }).latestGroup?.chatName === 'string' &&
      (report as { latestGroup?: { managerProxyRequired?: unknown } }).latestGroup?.managerProxyRequired === false,
  );
}

async function resolveLatestVerifiedGroupRouteReport(
  report: unknown,
  input: {
    chatBotsLoader: (input: { chatId: string }) => Promise<unknown>;
  },
) {
  if (!hasLatestVerifiedGroupRouteReport(report)) {
    return null;
  }

  try {
    const payload = await input.chatBotsLoader({ chatId: report.latestGroup.chatId });
    const items = Array.isArray((payload as { data?: { items?: unknown[] } })?.data?.items)
      ? ((payload as { data: { items: unknown[] } }).data.items)
      : [];
    return Array.isArray(items) ? report : null;
  } catch {
    return null;
  }
}

async function enrichProjectGroupBindingRouteStatus(
  binding: {
    bindingId: string;
    employeeId: string;
    chatId: string;
    chatName: string;
    status: 'active' | 'watching' | 'archived';
    isDefault: boolean;
    managerProxyRequired: boolean;
    lastSyncedAt?: string | null;
  },
  input: {
    employeeBotOpenId?: string;
    fallbackBotOpenId?: string;
    chatBotsLoader: (input: { chatId: string }) => Promise<unknown>;
  },
) {
  if (isDemoPlaceholderChatId(binding.chatId)) {
    return {
      ...binding,
      currentBotInChat: null,
      recommendedRoute: 'bind_real_group' as const,
      botPresenceState: 'placeholder' as const,
      isDemoPlaceholder: true,
      botIdentitySource: 'unknown' as const,
      employeeBotBound: false,
    };
  }

  const identity = resolveBotIdentitySource({
    employeeBotOpenId: input.employeeBotOpenId,
    fallbackBotOpenId: input.fallbackBotOpenId,
  });

  if (!identity.botOpenId) {
    return {
      ...binding,
      currentBotInChat: null,
      recommendedRoute: binding.managerProxyRequired ? 'user' : 'bot',
      botPresenceState: 'unknown' as const,
      isDemoPlaceholder: false,
      botIdentitySource: identity.botIdentitySource,
      employeeBotBound: identity.employeeBotBound,
    };
  }

  try {
    const payload = await input.chatBotsLoader({ chatId: binding.chatId });
    const items = Array.isArray((payload as { data?: { items?: unknown[] } })?.data?.items)
      ? ((payload as { data: { items: Array<{ bot_id?: unknown }> } }).data.items)
      : [];
    const currentBotInChat = items.some((item) => item && typeof item.bot_id === 'string' && item.bot_id === identity.botOpenId);
    return {
      ...binding,
      currentBotInChat,
      recommendedRoute: currentBotInChat ? 'bot' : binding.managerProxyRequired ? 'user' : 'bot',
      botPresenceState: currentBotInChat ? ('in_chat' as const) : ('not_in_chat' as const),
      isDemoPlaceholder: false,
      botIdentitySource: identity.botIdentitySource,
      employeeBotBound: identity.employeeBotBound,
    };
  } catch {
    return {
      ...binding,
      currentBotInChat: null,
      recommendedRoute: binding.managerProxyRequired ? 'user' : 'bot',
      botPresenceState: 'unknown' as const,
      isDemoPlaceholder: false,
      botIdentitySource: identity.botIdentitySource,
      employeeBotBound: identity.employeeBotBound,
    };
  }
}

function buildAutoPeerSyncMessage(input: {
  senderEmployeeId: string;
  targetEmployeeDisplayName: string;
  workItemId: string;
  workItemTitle: string;
}) {
  return [
    `[auto-peer-sync:${input.workItemId}]`,
    `${input.targetEmployeeDisplayName}，我这边在推进「${input.workItemTitle}」时遇到阻塞，`,
    '需要你帮我一起看下承接链路/实现口径，方便的话同步下你的判断和建议。',
  ].join('');
}

function buildDefaultProjectGroupBindings() {
  return [
    {
      bindingId: 'group-lushirong-default',
      employeeId: 'lushirong',
      chatId: 'oc_demo_group',
      chatName: '独立端导流项目群',
      status: 'active' as const,
      isDefault: true,
      managerProxyRequired: true,
      lastSyncedAt: null,
    },
    {
      bindingId: 'group-zhouyongkang-default',
      employeeId: 'zhouyongkang',
      chatId: 'oc_demo_group',
      chatName: '独立端导流项目群',
      status: 'active' as const,
      isDefault: true,
      managerProxyRequired: true,
      lastSyncedAt: null,
    },
  ];
}

async function detectIntegrationStatus() {
  async function hasBinary(command: string): Promise<boolean> {
    try {
      await execFileAsync('bash', ['-lc', `command -v ${command}`]);
      return true;
    } catch {
      return false;
    }
  }

  const [traeAcpInstalled, codexInstalled, bytedcliInstalled, larkCliInstalled] = await Promise.all([
    hasBinary('trae-cli'),
    hasBinary('codex'),
    hasBinary('bytedcli'),
    hasBinary('lark-cli'),
  ]);

  return {
    traeAcp: traeAcpInstalled ? 'ready' : 'missing',
    codex: codexInstalled ? 'installed' : 'missing',
    bytedcli: bytedcliInstalled ? 'ready' : 'missing',
    larkCli: larkCliInstalled ? 'ready' : 'missing',
  };
}

async function loadBytedcliAuth() {
  const { stdout } = await execFileAsync('bytedcli', ['--json', 'auth', 'status']);
  const payload = JSON.parse(stdout);
  return {
    authenticated: payload?.data?.authenticated ?? false,
    identity: payload?.data?.bytecloud_auth?.identity?.email ?? '',
  };
}

async function loadLarkAuth() {
  const { stdout } = await execFileAsync('lark-cli', ['auth', 'status', '--json', '--verify']);
  const payload = JSON.parse(stdout);
  return {
    appId: payload?.appId ?? '',
    botOpenId: payload?.identities?.bot?.openId ?? '',
    verified: payload?.verified ?? false,
    userName: payload?.identities?.user?.userName ?? '',
    openId: payload?.identities?.user?.openId ?? '',
  };
}

async function beginGroupSendScopeAuth() {
  const { stdout } = await execFileAsync('lark-cli', [
    'auth',
    'login',
    '--scope',
    'im:message.send_as_user',
    '--no-wait',
    '--json',
  ]);
  const payload = JSON.parse(stdout) as {
    verification_url: string;
    device_code: string;
    expires_in: number;
  };

  await mkdir(GROUP_SEND_SCOPE_AUTH_DIR, { recursive: true });
  const qrFileName = `group-send-scope-${Date.now()}.png`;
  const qrFilePath = path.join(GROUP_SEND_SCOPE_AUTH_DIR.pathname, qrFileName);
  await execFileAsync('lark-cli', ['auth', 'qrcode', payload.verification_url, '-o', `group-send-scope-auth/${qrFileName}`], {
    cwd: path.join(GROUP_SEND_SCOPE_AUTH_DIR.pathname, '..'),
  }).catch(() => undefined);

  let qrDataUrl: string | null = null;
  try {
    const bytes = await readFile(qrFilePath);
    qrDataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    qrDataUrl = null;
  }

  return {
    verificationUrl: payload.verification_url,
    deviceCode: payload.device_code,
    expiresIn: payload.expires_in,
    qrImagePath: qrFilePath,
    qrDataUrl,
  };
}

async function completeGroupSendScopeAuth(deviceCode: string) {
  try {
    const { stdout } = await execFileAsync(
      'lark-cli',
      ['auth', 'login', '--device-code', deviceCode, '--json'],
      { timeout: 5000 },
    );
    return parseJsonMaybe(stdout) ?? { ok: true, raw: stdout };
  } catch (error) {
    const rawStdout = error && typeof error === 'object' && 'stdout' in error ? (error as { stdout?: unknown }).stdout : '';
    const rawStderr = error && typeof error === 'object' && 'stderr' in error ? (error as { stderr?: unknown }).stderr : '';
    const stdout = typeof rawStdout === 'string' ? rawStdout : Buffer.isBuffer(rawStdout) ? rawStdout.toString('utf8') : '';
    const stderr = typeof rawStderr === 'string' ? rawStderr : Buffer.isBuffer(rawStderr) ? rawStderr.toString('utf8') : '';
    const parsed = parseJsonMaybe(stdout) ?? parseJsonMaybe(stderr);
    if (parsed) {
      return parsed;
    }
    return {
      ok: false,
      error: {
        message:
          stdout ||
          stderr ||
          '授权仍未完成，请先在浏览器完成授权后再点击“完成授权轮询”。',
      },
    };
  }
}

async function openGroupSendScopeAuthUrl(verificationUrl: string) {
  const normalized = verificationUrl.trim();
  if (!normalized.startsWith('https://accounts.feishu.cn/oauth/v1/device/verify')) {
    throw new Error('verificationUrl is not allowed');
  }

  await execFileAsync('open', ['-a', 'Google Chrome', normalized]);
  return {
    ok: true,
    opened: true,
    verificationUrl: normalized,
  };
}

async function openLarkChatInDesktop(chatId: string) {
  const normalized = chatId.trim();
  if (!/^oc_[a-zA-Z0-9]+$/.test(normalized)) {
    throw new Error('chatId is invalid');
  }

  const deepLink = `lark://applink.feishu.cn/client/chat/open?chatId=${normalized}`;
  await execFileAsync('open', [deepLink]);
  return {
    ok: true,
    opened: true,
    chatId: normalized,
    deepLink,
  };
}

async function copyTextToClipboard(text: string) {
  const normalized = text ?? '';
  await execFileAsync('bash', ['-lc', `printf %s ${JSON.stringify(normalized)} | pbcopy`]);
  return {
    ok: true,
    copied: true,
    length: normalized.length,
  };
}

async function loadMeegoAuth() {
  const { stdout } = await execFileAsync('bytedcli', ['--json', 'meego', 'status']);
  const payload = JSON.parse(stdout);
  return {
    authenticated: payload?.data?.authenticated ?? false,
    endpoint: payload?.data?.endpoint ?? '',
    toolCount: payload?.data?.tool_count ?? 0,
  };
}

async function lookupMeegoWorkitem(input: { lookupType: 'id' | 'title'; query: string; projectKey?: string }) {
  const args = ['--json', 'meego', 'workitem', 'get'];
  if (input.projectKey?.trim()) {
    args.push('--project-key', input.projectKey.trim());
  } else if (input.lookupType === 'title') {
    args.push('--project-key', DEFAULT_MEEGO_PROJECT_KEY);
  }
  args.push('--work-item-id', input.query);

  try {
    const { stdout } = await execFileAsync('bytedcli', args);
    try {
      return JSON.parse(stdout);
    } catch {
      return { ok: true, raw: stdout };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      items: [],
    };
  }
}

function buildMeegoWorkitemLookupCommand(input: { lookupType: 'id' | 'title'; query: string; projectKey?: string }) {
  const command = ['bytedcli', '--json', 'meego', 'workitem', 'get'];
  if (input.projectKey?.trim()) {
    command.push('--project-key', input.projectKey.trim());
  } else if (input.lookupType === 'title') {
    command.push('--project-key', DEFAULT_MEEGO_PROJECT_KEY);
  }
  command.push('--work-item-id', input.query);
  return command;
}

function buildMeegoWorkitemUpdateCommand(input: {
  workItemId: string;
  projectKey: string;
  fields: string;
}) {
  return [
    'bytedcli',
    '--json',
    'meego',
    'workitem',
    'update',
    '--project-key',
    input.projectKey,
    '--work-item-id',
    input.workItemId,
    '--fields',
    input.fields,
  ];
}

async function updateMeegoWorkitem(input: {
  workItemId: string;
  projectKey: string;
  fields: string;
}) {
  const command = buildMeegoWorkitemUpdateCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildMeegoCommentCreateCommand(input: {
  workItemId: string;
  projectKey: string;
  commentContent: string;
}) {
  return [
    'bytedcli',
    '--json',
    'meego',
    'comment',
    'create',
    '--project-key',
    input.projectKey,
    '--work-item-id',
    input.workItemId,
    '--comment-content',
    input.commentContent,
  ];
}

async function createMeegoComment(input: {
  workItemId: string;
  projectKey: string;
  commentContent: string;
}) {
  const command = buildMeegoCommentCreateCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildTechReviewDocContent(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  const steps = input.nextSteps.map((step) => `<li>${escapeXml(step)}</li>`).join('');
  return `<title>${escapeXml(input.title)}</title><h1>背景</h1><p>${escapeXml(
    input.problem,
  )}</p><h1>下一步</h1><ul>${steps}</ul>`;
}

function buildTechReviewDocCommand(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  return [
    'lark-cli',
    'docs',
    '+create',
    '--as',
    'user',
    '--title',
    input.title,
    '--content',
    buildTechReviewDocContent(input),
    '--json',
  ];
}

async function createTechReviewDoc(input: {
  title: string;
  problem: string;
  nextSteps: string[];
}) {
  const command = buildTechReviewDocCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildTechReviewMeetingCommand(input: {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendeeIds: string[];
}) {
  return [
    'lark-cli',
    'calendar',
    '+create',
    '--as',
    'user',
    '--summary',
    input.summary,
    '--description',
    input.description,
    '--start',
    input.start,
    '--end',
    input.end,
    '--attendee-ids',
    input.attendeeIds.join(','),
    '--json',
  ];
}

async function createTechReviewMeeting(input: {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendeeIds: string[];
}) {
  const command = buildTechReviewMeetingCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

async function searchFeishuChat(input: { query: string }) {
  const command = ['lark-cli', 'im', '+chat-search', '--as', 'user', '--query', input.query, '--json'];
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildFeishuChatSearchCommand(input: { query: string }) {
  return ['lark-cli', 'im', '+chat-search', '--as', 'user', '--query', input.query, '--json'];
}

function buildFeishuAgentSetupProfileName(employeeId: string) {
  return `rdleader-${employeeId}`;
}

function buildEmployeeLarklinkHome(employeeId: string) {
  return path.join(resolveWorkspacePath(employeeId), '.rdleader', 'larklink-home');
}

function buildEmployeeLarklinkConfigPath(employeeId: string) {
  return path.join(buildEmployeeLarklinkHome(employeeId), '.larklink', 'larklink.json');
}

function buildEmployeeLarklinkDaemonStatePath(employeeId: string) {
  return path.join(buildEmployeeLarklinkHome(employeeId), '.larklink', 'daemon-state.json');
}

function buildEmployeeLarklinkLogPath(employeeId: string) {
  return path.join(buildEmployeeLarklinkHome(employeeId), '.larklink', 'logs', 'larklink.log');
}

function buildSharedCodexHome() {
  return process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex');
}

function buildFeishuBridgeCommand() {
  return path.join(RDLEADER_ROOT_PATH, 'node_modules', '.bin', 'tsx');
}

function buildFeishuBridgeEntryPath() {
  return path.join(RDLEADER_ROOT_PATH, 'apps', 'server', 'src', 'bridge', 'rdleader-feishu-bridge.ts');
}

function buildSharedTraeCliAuthPath() {
  return path.join(os.homedir(), '.trae', 'cli', 'auth.json');
}

function buildEmployeeLarklinkEnv(employeeId: string) {
  return {
    HOME: buildEmployeeLarklinkHome(employeeId),
    ...(EMPLOYEE_LARKLINK_AGENT_ID === 'codex' ? { CODEX_HOME: buildSharedCodexHome() } : {}),
    LARKLINK_DEFAULT_AGENT: EMPLOYEE_LARKLINK_BRIDGE_AGENT_ID,
  };
}

function buildEmployeeLarklinkEnvCommandPrefix(employeeId: string) {
  const env = buildEmployeeLarklinkEnv(employeeId);
  return ['env', ...Object.entries(env).map(([key, value]) => `${key}=${value}`)];
}

async function ensureEmployeeCodexAuthBridge(employeeId: string) {
  if (EMPLOYEE_LARKLINK_AGENT_ID !== 'codex') {
    return;
  }

  const sourceCodexHome = buildSharedCodexHome();
  if (!(await pathExists(sourceCodexHome))) {
    return;
  }

  const targetCodexHome = path.join(buildEmployeeLarklinkHome(employeeId), '.codex');
  const targetExists = await pathExists(targetCodexHome);
  if (targetExists) {
    try {
      const stats = await lstat(targetCodexHome);
      if (stats.isSymbolicLink()) {
        return;
      }
    } catch {
      // fall through and recreate the bridge
    }
    await rm(targetCodexHome, { recursive: true, force: true }).catch(() => undefined);
  }

  await symlink(sourceCodexHome, targetCodexHome);
}

async function ensureEmployeeTraeAuthBridge(employeeId: string) {
  if (EMPLOYEE_LARKLINK_AGENT_ID !== 'traecli2') {
    return;
  }

  const sourceAuthPath = buildSharedTraeCliAuthPath();
  if (!(await pathExists(sourceAuthPath))) {
    return;
  }

  const targetAuthPath = path.join(buildEmployeeLarklinkHome(employeeId), '.trae', 'cli', 'auth.json');
  await mkdir(path.dirname(targetAuthPath), { recursive: true });

  const targetExists = await pathExists(targetAuthPath);
  if (targetExists) {
    try {
      const stats = await lstat(targetAuthPath);
      if (stats.isSymbolicLink()) {
        return;
      }
    } catch {
      // fall through and recreate the bridge
    }
    await rm(targetAuthPath, { force: true }).catch(() => undefined);
  }

  await symlink(sourceAuthPath, targetAuthPath);
}

function buildFeishuAgentCreateCommand(employeeId: string) {
  return [
    ...buildEmployeeLarklinkEnvCommandPrefix(employeeId),
    'larklink',
    'setup',
  ];
}

function buildFeishuAgentBindCommand(input: {
  employeeId: string;
}) {
  return [
    ...buildEmployeeLarklinkEnvCommandPrefix(input.employeeId),
    'larklink',
    '--nobind',
  ];
}

function buildFeishuAgentStatusCommand(employeeId: string) {
  return [...buildEmployeeLarklinkEnvCommandPrefix(employeeId), 'larklink', 'status', '--json'];
}

function buildFeishuAgentStopCommand(employeeId: string) {
  return [...buildEmployeeLarklinkEnvCommandPrefix(employeeId), 'larklink', 'stop'];
}

function buildFeishuAgentStartCommand(employeeId: string) {
  return [
    ...buildEmployeeLarklinkEnvCommandPrefix(employeeId),
    'larklink',
    '__run-daemon',
    '--nobind',
  ];
}

function buildFeishuAgentBindCommandPreview(employeeId: string) {
  return buildFeishuAgentBindCommand({ employeeId });
}

function normalizeFeishuProfile(profile: FeishuProfile, fallbackBotName: string): Required<Pick<FeishuProfile, 'dmPolicy' | 'botName' | 'botOpenId' | 'bindingStatus' | 'chatMode' | 'identityPreset' | 'agentSource' | 'setupProfileName'>> & FeishuProfile {
  const botName = profile.botName || fallbackBotName;
  return {
    ...profile,
    dmPolicy: 'manager-only',
    botName,
    botOpenId: profile.botOpenId || 'pending',
    bindingStatus: profile.bindingStatus ?? (profile.appId ? 'bound' : 'unbound'),
    chatMode: profile.chatMode ?? 'mention',
    identityPreset: profile.identityPreset ?? 'bot-only',
    agentSource: profile.agentSource ?? 'larklink',
    setupProfileName: profile.setupProfileName ?? '',
  };
}

async function resolveFeishuAppSecret(secretOrRef?: string) {
  const normalized = secretOrRef?.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('env://')) {
    return process.env[normalized.slice('env://'.length)]?.trim() || undefined;
  }

  if (normalized.startsWith('env:')) {
    return process.env[normalized.slice('env:'.length)]?.trim() || undefined;
  }

  if (normalized.startsWith('keychain://')) {
    try {
      const parsed = new URL(normalized);
      const service = parsed.hostname;
      const account = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
      if (!service || !account) {
        return undefined;
      }
      const { stdout } = await execFileAsync('security', ['find-generic-password', '-s', service, '-a', account, '-w']);
      const value = stdout.trim();
      return value.length > 0 ? value : undefined;
    } catch {
      return undefined;
    }
  }

  if (normalized.startsWith('plain://')) {
    return decodeURIComponent(normalized.slice('plain://'.length));
  }

  return normalized;
}

async function writeEmployeeLarklinkConfig(input: {
  employeeId: string;
  appId: string;
  appSecretRef: string;
  chatMode: 'mention' | 'all';
}) {
  const configPath = buildEmployeeLarklinkConfigPath(input.employeeId);
  const configDir = path.dirname(configPath);
  await mkdir(configDir, { recursive: true });

  const resolvedSecret = await resolveFeishuAppSecret(input.appSecretRef);
  if (!resolvedSecret) {
    return {
      ok: false as const,
      configPath,
      reason: 'App Secret 无法从当前输入解析为可用明文；请直接填写明文、env://VAR 或 keychain://service/account。',
    };
  }

  const config = {
    feishu: {
      enabled: true,
      appId: input.appId,
      appSecret: resolvedSecret,
      domain: 'feishu',
    },
    project: {
      path: resolveWorkspacePath(input.employeeId),
      name: input.employeeId,
    },
    agents: {
      defaultAgent: EMPLOYEE_LARKLINK_BRIDGE_AGENT_ID,
      enableAutoStart: false,
    },
    group: {
      replyPolicy: input.chatMode,
      defaultMode: 'thread',
    },
    permissions: {
      strategy: 'ask',
    },
    customAgents: [
      {
        id: EMPLOYEE_LARKLINK_BRIDGE_AGENT_ID,
        name: 'RDLeader Feishu Bridge',
        description: '飞书消息先进入 RDLeader 的脑、记忆和编排层，再转给真实执行 worker。',
        command: buildFeishuBridgeCommand(),
        args: [buildFeishuBridgeEntryPath()],
        fixedEnv: {
          RDLEADER_EMPLOYEE_ID: input.employeeId,
          RDLEADER_CONTROL_URL: 'http://127.0.0.1:3001',
        },
      },
      ...(EMPLOYEE_LARKLINK_AGENT_ID === 'codex'
        ? [
            {
              id: 'codex',
              name: 'Codex CLI',
              description: 'Codex 编程助手（复用本机 Codex 登录态）',
              command: 'codex-acp',
              args: [],
              fixedEnv: {
                CODEX_HOME: buildSharedCodexHome(),
              },
            },
          ]
        : EMPLOYEE_LARKLINK_AGENT_ID === 'traecli2'
          ? [
              {
                id: 'traecli2',
                name: 'Trae Cli 2.0',
                description: 'Trae 编程助手 2.0（显式走 traex acp serve）',
                command: 'traex',
                args: ['acp', 'serve'],
              },
            ]
          : []),
    ],
  };

  await ensureEmployeeCodexAuthBridge(input.employeeId);
  await ensureEmployeeTraeAuthBridge(input.employeeId);
  await writeFile(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
  return {
    ok: true as const,
    configPath,
  };
}

async function getFeishuTenantAccessToken(input: {
  appId: string;
  appSecret: string;
  domain?: 'feishu' | 'lark';
}) {
  const baseUrl = input.domain === 'lark' ? 'https://open.larksuite.com' : 'https://open.feishu.cn';
  const response = await fetch(`${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: input.appId,
      app_secret: input.appSecret,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    tenant_access_token?: string;
    code?: number;
    msg?: string;
  };
  if (!response.ok || typeof payload.tenant_access_token !== 'string' || payload.code !== 0) {
    throw new Error(`获取员工 bot tenant_access_token 失败: ${payload.msg ?? response.statusText ?? 'unknown error'}`);
  }

  return {
    baseUrl,
    token: payload.tenant_access_token,
  };
}

async function probeEmployeeBotInfo(input: {
  appId: string;
  appSecret: string;
  domain?: 'feishu' | 'lark';
}) {
  const auth = await getFeishuTenantAccessToken(input);
  const response = await fetch(`${auth.baseUrl}/open-apis/bot/v3/info`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    bot?: {
      bot_name?: string;
      open_id?: string;
    };
    data?: {
      bot?: {
        bot_name?: string;
        open_id?: string;
      };
    };
  };
  if (!response.ok || payload.code !== 0) {
    throw new Error(`获取员工 bot 信息失败: ${payload.msg ?? response.statusText ?? 'unknown error'}`);
  }
  const bot = payload.bot ?? payload.data?.bot ?? {};
  return {
    botName: typeof bot.bot_name === 'string' ? bot.bot_name : undefined,
    botOpenId: typeof bot.open_id === 'string' ? bot.open_id : undefined,
  };
}

async function postFeishuRegistrationAction(domain: 'feishu' | 'lark', body: Record<string, string>) {
  const baseUrl = domain === 'lark' ? 'https://accounts.larksuite.com' : 'https://accounts.feishu.cn';
  const response = await fetch(`${baseUrl}/oauth/v1/app/registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await response.text();
  if (!text) {
    throw new Error(`registration endpoint returned empty response (${response.status})`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

async function beginFeishuAgentOnboarding() {
  const initPayload = await postFeishuRegistrationAction('feishu', { action: 'init' });
  const supportedAuthMethods = Array.isArray(initPayload.supported_auth_methods)
    ? initPayload.supported_auth_methods
    : [];
  if (!supportedAuthMethods.includes('client_secret')) {
    throw new Error(`registration environment does not support client_secret auth: ${supportedAuthMethods.join(', ')}`);
  }

  const beginPayload = await postFeishuRegistrationAction('feishu', {
    action: 'begin',
    archetype: 'PersonalAgent',
    auth_method: 'client_secret',
    request_user_info: 'open_id',
  });

  const deviceCode = String(beginPayload.device_code ?? '').trim();
  const verificationUriComplete = String(beginPayload.verification_uri_complete ?? '').trim();
  if (!deviceCode || !verificationUriComplete) {
    throw new Error('Feishu onboarding did not return a valid device_code / verification_uri_complete');
  }

  const verificationUrl = verificationUriComplete.includes('?')
    ? `${verificationUriComplete}&from=rdleader&tp=op_cli_app`
    : `${verificationUriComplete}?from=rdleader&tp=op_cli_app`;

  await mkdir(FEISHU_AGENT_ONBOARDING_DIR, { recursive: true });
  const qrFileName = `employee-agent-${Date.now()}.png`;
  const qrFilePath = path.join(FEISHU_AGENT_ONBOARDING_DIR.pathname, qrFileName);
  await execFileAsync('lark-cli', ['auth', 'qrcode', verificationUrl, '-o', `feishu-agent-onboarding/${qrFileName}`], {
    cwd: path.join(FEISHU_AGENT_ONBOARDING_DIR.pathname, '..'),
  }).catch(() => undefined);

  let qrDataUrl: string | null = null;
  try {
    const bytes = await readFile(qrFilePath);
    qrDataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    qrDataUrl = null;
  }

  return {
    domain: 'feishu' as const,
    verificationUrl,
    deviceCode,
    expiresIn: Number(beginPayload.expire_in ?? 600),
    interval: Number(beginPayload.interval ?? 5),
    qrImagePath: qrFilePath,
    qrDataUrl,
  };
}

async function completeFeishuAgentOnboarding(input: {
  employeeId: string;
  managerOpenId: string;
  deviceCode: string;
  timeoutSeconds?: number;
}) {
  const deadline = Date.now() + Math.min(input.timeoutSeconds ?? 180, 600) * 1000;
  let domain: 'feishu' | 'lark' = 'feishu';
  let pollCount = 0;

  while (Date.now() < deadline) {
    const payload = await postFeishuRegistrationAction(domain, {
      action: 'poll',
      device_code: input.deviceCode,
      tp: 'ob_app',
    }).catch(() => null);

    if (!payload) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    pollCount += 1;
    const tenantBrand = String((payload as { user_info?: { tenant_brand?: unknown } }).user_info?.tenant_brand ?? '')
      .trim()
      .toLowerCase();
    if (tenantBrand === 'lark') {
      domain = 'lark';
    }

    const appId = String(payload.client_id ?? '').trim();
    const appSecret = String(payload.client_secret ?? '').trim();
    if (appId && appSecret) {
      const botInfo = await probeEmployeeBotInfo({
        appId,
        appSecret,
        domain,
      }).catch(() => ({ botName: undefined, botOpenId: undefined }));
      const appSecretRef = await storeEmployeeAppSecretInKeychain(input.employeeId, appSecret);
      return {
        ok: true as const,
        employeeId: input.employeeId,
        appId,
        appSecretRef,
        managerOpenId: input.managerOpenId,
        botName: botInfo.botName,
        botOpenId: botInfo.botOpenId,
        domain,
        pollCount,
      };
    }

    const error = String(payload.error ?? '').trim();
    if (error === 'access_denied' || error === 'expired_token') {
      return {
        ok: false as const,
        message: error === 'access_denied' ? '员工智能体创建已取消' : '员工智能体创建二维码已过期',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, Number(payload.interval ?? 5) * 1000));
  }

  return {
    ok: false as const,
    message: '等待员工智能体创建结果超时',
  };
}

async function storeEmployeeAppSecretInKeychain(employeeId: string, appSecret: string) {
  const account = `${employeeId}/appSecret`;
  await execFileAsync('security', ['add-generic-password', '-U', '-s', 'rdleader', '-a', account, '-w', appSecret]);
  return `keychain://rdleader/${account}`;
}

async function sendMessageViaEmployeeBot(input: {
  appId: string;
  appSecret: string;
  receiveIdType: 'chat_id' | 'open_id';
  receiveId: string;
  text: string;
}) {
  const auth = await getFeishuTenantAccessToken({
    appId: input.appId,
    appSecret: input.appSecret,
    domain: 'feishu',
  });
  const response = await fetch(`${auth.baseUrl}/open-apis/im/v1/messages?receive_id_type=${input.receiveIdType}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      receive_id: input.receiveId,
      msg_type: 'text',
      content: JSON.stringify({
        text: input.text,
      }),
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: number;
    msg?: string;
    data?: Record<string, unknown>;
  };
  if (!response.ok || payload.code !== 0) {
    throw new Error(`员工 bot 发消息失败: ${payload.msg ?? response.statusText ?? 'unknown error'}`);
  }
  return {
    ok: true,
    identity: 'bot',
    data: payload.data ?? {},
    transport: 'employee-app-openapi',
  };
}

async function inspectProcessEnvironment(pid: number) {
  try {
    const { stdout } = await execFileAsync('ps', ['eww', '-p', String(pid)]);
    const homeMatch = stdout.match(/\bHOME=([^ ]+)/);
    return {
      homePath: homeMatch?.[1] ?? null,
    };
  } catch {
    return {
      homePath: null,
    };
  }
}

async function getEmployeeLarklinkStatus(employeeId: string) {
  const command = buildFeishuAgentStatusCommand(employeeId);
  const expectedHomePath = buildEmployeeLarklinkHome(employeeId);
  const expectedProjectPath = resolveWorkspacePath(employeeId);
  const expectedLogFile = buildEmployeeLarklinkLogPath(employeeId);
  const normalizeStatusSnapshot = async (parsed: Record<string, any>) => {
    const processes = Array.isArray(parsed.processes) ? parsed.processes : [];
    const inspectedProcesses = await Promise.all(
      processes.map(async (processInfo: Record<string, unknown>) => {
        const pid = typeof processInfo.pid === 'number' ? processInfo.pid : Number(processInfo.pid);
        const environment = Number.isFinite(pid) ? await inspectProcessEnvironment(pid) : { homePath: null };
        return {
          ...processInfo,
          homePath: environment.homePath,
          homeMatches: environment.homePath === expectedHomePath,
        };
      }),
    );
    const stateMatches =
      parsed.state &&
      typeof parsed.state === 'object' &&
      parsed.state &&
      typeof (parsed.state as { projectPath?: unknown }).projectPath === 'string' &&
      (parsed.state as { projectPath: string }).projectPath === expectedProjectPath &&
      typeof (parsed.state as { logFile?: unknown }).logFile === 'string' &&
      (parsed.state as { logFile: string }).logFile === expectedLogFile;
    const matchingProcess = inspectedProcesses.find((processInfo) => processInfo.homeMatches);
    if (stateMatches || matchingProcess) {
      return {
        ok: true as const,
        status: {
          ...parsed,
          processes: inspectedProcesses,
          expectedHomePath,
          expectedProjectPath,
          scoped: true,
          matchedPid: matchingProcess?.pid ?? (stateMatches ? (parsed.state as { pid?: number }).pid ?? null : null),
        },
      };
    }

    return {
      ok: false as const,
      error:
        inspectedProcesses.length > 0
          ? '检测到正在运行的共享 Larklink daemon，但不是该员工自己的隔离 daemon。请重新启动员工智能体。'
          : '员工专属 Larklink daemon 未运行。',
      status: {
        ...parsed,
        processes: inspectedProcesses,
        expectedHomePath,
        expectedProjectPath,
        scoped: false,
        sharedProcessDetected: inspectedProcesses.length > 0,
      },
    };
  };
  try {
    const { stdout } = await execFileAsync(command[0]!, command.slice(1), {
      env: {
        ...process.env,
        HOME: expectedHomePath,
      },
      timeout: 15_000,
    });
    const parsed = JSON.parse(stdout) as Record<string, any>;
    return normalizeStatusSnapshot(parsed);
  } catch (error) {
    const rawStdout = error && typeof error === 'object' && 'stdout' in error ? (error as { stdout?: unknown }).stdout : '';
    const rawStderr = error && typeof error === 'object' && 'stderr' in error ? (error as { stderr?: unknown }).stderr : '';
    const stdout = typeof rawStdout === 'string' ? rawStdout : Buffer.isBuffer(rawStdout) ? rawStdout.toString('utf8') : '';
    const stderr = typeof rawStderr === 'string' ? rawStderr : Buffer.isBuffer(rawStderr) ? rawStderr.toString('utf8') : '';
    const rawText = stdout || stderr;
    if (rawText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawText) as Record<string, any>;
        return await normalizeStatusSnapshot(parsed);
      } catch {
        // fall through to generic error
      }
    }
    return {
      ok: false as const,
      error: stderr || stdout || (error instanceof Error ? error.message : 'larklink status failed'),
    };
  }
}

async function startEmployeeLarklinkDaemon(employeeId: string) {
  const command = buildFeishuAgentStartCommand(employeeId);
  await mkdir(path.dirname(buildEmployeeLarklinkDaemonStatePath(employeeId)), { recursive: true });
  await ensureEmployeeCodexAuthBridge(employeeId);
  await ensureEmployeeTraeAuthBridge(employeeId);
  const child = spawn(command[0]!, command.slice(1), {
    cwd: resolveWorkspacePath(employeeId),
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ...buildEmployeeLarklinkEnv(employeeId),
    },
  });
  child.unref();

  let status = await getEmployeeLarklinkStatus(employeeId);
  for (let attempt = 0; attempt < 10 && !status.ok; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    status = await getEmployeeLarklinkStatus(employeeId);
  }
  return {
    command,
    pid: child.pid ?? null,
    status,
  };
}

async function stopEmployeeLarklinkDaemon(employeeId: string) {
  const command = buildFeishuAgentStopCommand(employeeId);
  const currentStatus = await getEmployeeLarklinkStatus(employeeId);
  const matchedPid =
    currentStatus.ok && currentStatus.status && typeof currentStatus.status === 'object'
      ? Number((currentStatus.status as { matchedPid?: unknown }).matchedPid ?? NaN)
      : NaN;

  if (Number.isFinite(matchedPid) && matchedPid > 0) {
    try {
      process.kill(matchedPid, 'SIGTERM');
    } catch {
      // ignore if the process already exited
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        process.kill(matchedPid, 0);
      } catch {
        break;
      }
      if (attempt === 4) {
        try {
          process.kill(matchedPid, 'SIGKILL');
        } catch {
          // ignore if the process already exited
        }
      }
    }
  }

  await rm(buildEmployeeLarklinkDaemonStatePath(employeeId), { force: true }).catch(() => undefined);
  const status = await getEmployeeLarklinkStatus(employeeId);
  return {
    command,
    stoppedPid: Number.isFinite(matchedPid) ? matchedPid : null,
    status,
  };
}

function buildManagerDmCommand(input: {
  managerOpenId: string;
  employeeDisplayName: string;
  body: string;
}) {
  return [
    'lark-cli',
    'im',
    '+messages-send',
    '--as',
    'bot',
    '--user-id',
    input.managerOpenId,
    '--text',
    `【RDLeader·${input.employeeDisplayName}】${input.body}`,
    '--json',
  ];
}

async function sendManagerDm(input: {
  employeeId?: string;
  feishuProfile?: FeishuProfile;
  managerOpenId: string;
  employeeDisplayName: string;
  body: string;
}) {
  const appId = input.feishuProfile?.appId?.trim();
  const resolvedSecret = await resolveFeishuAppSecret(input.feishuProfile?.appSecretRef);
  if (appId && resolvedSecret) {
    return sendMessageViaEmployeeBot({
      appId,
      appSecret: resolvedSecret,
      receiveIdType: 'open_id',
      receiveId: input.managerOpenId,
      text: `【RDLeader·${input.employeeDisplayName}】${input.body}`,
    });
  }

  const command = buildManagerDmCommand(input);
  try {
    const { stdout } = await execFileAsync(command[0]!, command.slice(1));
    try {
      const parsed = JSON.parse(stdout);
      return {
        ...(parsed && typeof parsed === 'object' ? parsed : { raw: stdout }),
        transport: 'shared-lark-cli-bot',
        identity: 'bot',
      };
    } catch {
      return {
        ok: true,
        raw: stdout,
        transport: 'shared-lark-cli-bot',
        identity: 'bot',
      };
    }
  } catch (error) {
    const rawStdout = error && typeof error === 'object' && 'stdout' in error ? (error as { stdout?: unknown }).stdout : '';
    const stdout = typeof rawStdout === 'string' ? rawStdout : Buffer.isBuffer(rawStdout) ? rawStdout.toString('utf8') : '';
    try {
      const parsed = JSON.parse(stdout);
      return {
        ...(parsed && typeof parsed === 'object' ? parsed : { raw: stdout }),
        transport: 'shared-lark-cli-bot',
        identity: 'bot',
      };
    } catch {
      throw error;
    }
  }
}

function buildGroupMessageCommand(input: {
  chatId: string;
  employeeDisplayName: string;
  body: string;
  identity?: 'bot' | 'user';
}) {
  return [
    'lark-cli',
    'im',
    '+messages-send',
    '--as',
    input.identity ?? 'bot',
    '--chat-id',
    input.chatId,
    '--text',
    `【RDLeader·${input.employeeDisplayName}】${input.body}`,
    '--json',
  ];
}

async function sendGroupMessage(input: {
  feishuProfile?: FeishuProfile;
  chatId: string;
  employeeDisplayName: string;
  body: string;
  identity?: 'bot' | 'user';
}) {
  if (input.identity !== 'user') {
    const appId = input.feishuProfile?.appId?.trim();
    const resolvedSecret = await resolveFeishuAppSecret(input.feishuProfile?.appSecretRef);
    if (appId && resolvedSecret) {
      return sendMessageViaEmployeeBot({
        appId,
        appSecret: resolvedSecret,
        receiveIdType: 'chat_id',
        receiveId: input.chatId,
        text: `【RDLeader·${input.employeeDisplayName}】${input.body}`,
      });
    }
  }

  const command = buildGroupMessageCommand(input);
  const result = spawnSync(command[0]!, command.slice(1), {
    encoding: 'utf8',
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  if (stdout.trim()) {
    try {
      const parsed = JSON.parse(stdout);
      return {
        ...(parsed && typeof parsed === 'object' ? parsed : { raw: stdout }),
        transport: input.identity === 'user' ? 'lark-cli-user-proxy' : 'shared-lark-cli-bot',
        identity: input.identity ?? 'bot',
      };
    } catch {
      return {
        ok: result.status === 0,
        raw: stdout,
        stderr,
        transport: input.identity === 'user' ? 'lark-cli-user-proxy' : 'shared-lark-cli-bot',
        identity: input.identity ?? 'bot',
      };
    }
  }

  if (stderr.trim()) {
    try {
      const parsed = JSON.parse(stderr);
      return {
        ...(parsed && typeof parsed === 'object' ? parsed : { raw: stderr }),
        transport: input.identity === 'user' ? 'lark-cli-user-proxy' : 'shared-lark-cli-bot',
        identity: input.identity ?? 'bot',
      };
    } catch {
      return {
        ok: result.status === 0,
        raw: stdout,
        stderr,
        transport: input.identity === 'user' ? 'lark-cli-user-proxy' : 'shared-lark-cli-bot',
        identity: input.identity ?? 'bot',
      };
    }
  }

  if (result.status !== 0) {
    throw new Error(stderr || `send group message failed with status ${result.status}`);
  }

  return {
    ok: true,
    raw: stdout,
    transport: input.identity === 'user' ? 'lark-cli-user-proxy' : 'shared-lark-cli-bot',
    identity: input.identity ?? 'bot',
  };
}

function isBoundEmployeeBotReady(feishuProfile?: FeishuProfile | null) {
  return Boolean(
    feishuProfile &&
      feishuProfile.bindingStatus === 'bound' &&
      feishuProfile.appId?.trim() &&
      feishuProfile.appSecretRef?.trim() &&
      feishuProfile.botOpenId?.trim() &&
      feishuProfile.managerOpenId?.trim(),
  );
}

function dedupeArtifactRefs(artifactRefs: Array<string | null | undefined>) {
  return [...new Set(artifactRefs.filter((artifactRef): artifactRef is string => typeof artifactRef === 'string' && artifactRef.trim().length > 0))];
}

function resolveBotIdentitySource(input: {
  employeeBotOpenId?: string | null;
  fallbackBotOpenId?: string | null;
}) {
  const employeeBotOpenId = input.employeeBotOpenId?.trim();
  const fallbackBotOpenId = input.fallbackBotOpenId?.trim();

  if (employeeBotOpenId && employeeBotOpenId !== 'pending') {
    return {
      botOpenId: employeeBotOpenId,
      botIdentitySource: 'employee_bot' as const,
      employeeBotBound: true,
    };
  }

  if (fallbackBotOpenId) {
    return {
      botOpenId: fallbackBotOpenId,
      botIdentitySource: 'shared_bot' as const,
      employeeBotBound: false,
    };
  }

  return {
    botOpenId: '',
    botIdentitySource: 'unknown' as const,
    employeeBotBound: false,
  };
}

function buildBotProjectGroupChatCommand(input: {
  employeeDisplayName: string;
  managerOpenId: string;
  chatName?: string;
}) {
  return [
    'lark-cli',
    'im',
    '+chat-create',
    '--as',
    'bot',
    '--type',
    'private',
    '--name',
    input.chatName?.trim() || `RDLeader Bot QA · ${input.employeeDisplayName}`,
    '--users',
    input.managerOpenId,
    '--json',
  ];
}

async function createBotProjectGroupChat(input: {
  employeeDisplayName: string;
  managerOpenId: string;
  chatName?: string;
}) {
  const command = buildBotProjectGroupChatCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function buildInviteBotToChatCommand(input: {
  chatId: string;
  appId: string;
}) {
  return [
    'lark-cli',
    'im',
    'chat.members',
    'create',
    '--as',
    'user',
    '--chat-id',
    input.chatId,
    '--member-id-type',
    'app_id',
    '--data',
    JSON.stringify({
      id_list: [input.appId],
    }),
    '--json',
  ];
}

async function inviteBotToChat(input: {
  chatId: string;
  appId: string;
}) {
  const command = buildInviteBotToChatCommand(input);
  const { stdout } = await execFileAsync(command[0]!, command.slice(1));
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

async function listChatBots(input: { chatId: string }) {
  const { stdout } = await execFileAsync('lark-cli', [
    'im',
    'chat.members',
    'bots',
    '--as',
    'user',
    '--chat-id',
    input.chatId,
    '--json',
  ]);
  try {
    return JSON.parse(stdout);
  } catch {
    return { ok: true, raw: stdout };
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function classifyManagerChatTaskType(messageBody: string): ManagerConversationTaskType {
  const normalized = messageBody.toLowerCase();

  if (/(复盘|回顾|总结|反思)/.test(messageBody)) {
    return 'reflection';
  }

  if (/(发群|群里|comment|评论|schedule|排期|拉会|会议|create doc|文档|doc|update status|meego)/.test(normalized + messageBody)) {
    return 'collaboration';
  }

  if (/(代码|修复|联调|实现|开发|方案)/.test(messageBody)) {
    return 'coding';
  }

  if (/(状态|进展|同步|汇报|给我看|下一步|拆)/.test(messageBody)) {
    return 'status';
  }

  return 'coordination';
}

function extractArtifactRefsFromBody(messageBody: string) {
  return Array.from(messageBody.matchAll(/\b[a-z]+:\/\/[^\s，。；,;]+/gi), (match) => match[0]);
}

function buildApprovalHint(messageBody: string) {
  const normalized = messageBody.toLowerCase();
  const riskyKeywords = [
    { pattern: /meego/, label: 'Meego 状态或字段更新' },
    { pattern: /发群|群里/, label: '群消息发送' },
    { pattern: /comment|评论/, label: '评论写入' },
    { pattern: /schedule|排期|拉会|会议/, label: '会议日程操作' },
    { pattern: /create doc|建文档|创建文档|doc/, label: '文档创建' },
    { pattern: /update status|更新状态/, label: '状态更新' },
  ].filter((item) => item.pattern.test(normalized + messageBody));

  const approvalRequired =
    riskyKeywords.length > 0 && requiresApproval({ kind: 'mutate-external', target: 'external-system' });

  return {
    approvalRequired,
    approvalSummary: approvalRequired
      ? `涉及${riskyKeywords.map((item) => item.label).join('、')}等外部变更动作，需要经理明确审批后再执行。`
      : null,
  };
}

function isBrainPreviewTaskType(value: unknown): value is AssembleTaskContextInput['taskType'] {
  return ['coding', 'coordination', 'status', 'reflection', 'collaboration'].includes(String(value));
}

function buildDefaultEmployeeProfile(input: {
  employeeId: string;
  displayName: string;
  managerId: string;
}) {
  return {
    employeeId: input.employeeId,
    managerId: input.managerId,
    riskFlags: [],
    personaProfile: {
      communicationTone: 'structured' as const,
      ownershipBias: 'medium' as const,
      conflictTolerance: 'medium' as const,
      pressureResponse: 'steady' as const,
      confidenceBaseline: 'steady' as const,
      collaborationStyle: 'proactive' as const,
      escalationPreference: 'normal' as const,
    },
    emotionTriggers: ['新环境适应中'],
    feishuProfile: {
      dmPolicy: 'manager-only' as const,
      botName: input.displayName,
      botOpenId: 'pending',
    },
  };
}

function buildDefaultEmployeeRow(input: {
  employeeId: string;
  displayName: string;
  level: '1-2' | '2-1' | '2-2';
  directionId: string;
}) {
  return {
    employeeId: input.employeeId,
    displayName: input.displayName,
    level: input.level,
    employmentStatus: 'active' as const,
    directionId: input.directionId,
    recentDoneSummary: '新员工已入职，等待领取首个任务',
    nextStepSummary: '完成环境熟悉并领取首个任务',
    workspacePath: resolveWorkspacePath(input.employeeId),
    runtimeKind: 'trae_acp' as const,
    resignationIntent: 'low',
    emotionCurrent: 'focused',
    emotionIntensity: 0.18,
    emotionSummary: '新员工刚完成入职，正在适应团队节奏',
    deliveryTrend: 'flat',
    communicationQuality: 'ok',
    blockerHandling: 'ok',
    reviewQuality: 'ok',
    promotionReadiness: 'watch',
    retentionRisk: 'low',
    reliabilityScore: 0.6,
  };
}

export async function buildApp(options: {
  databaseUrl: string;
  reportPaths?: {
    latestSmokeReportPath?: string;
    latestRuntimeEndurancePath?: string;
    latestGroupRouteRepairPath?: string;
  };
  memoryLoader?: (employeeId: 'lushirong' | 'zhouyongkang') => Promise<EmployeeMemoryEntry[]>;
  now?: () => Date;
  integrationStatusLoader?: () => Promise<{
    traeAcp: string;
    codex: string;
    bytedcli: string;
    larkCli: string;
  }>;
  bytedcliAuthLoader?: () => Promise<{
    authenticated: boolean;
    identity: string;
  }>;
  larkAuthLoader?: () => Promise<{
    appId?: string;
    botOpenId?: string;
    verified: boolean;
    userName: string;
    openId: string;
  }>;
  meegoAuthLoader?: () => Promise<{
    authenticated: boolean;
    endpoint: string;
    toolCount: number;
  }>;
  meegoWorkitemLookup?: (input: {
    lookupType: 'id' | 'title';
    query: string;
    projectKey?: string;
  }) => Promise<unknown>;
  meegoWorkitemUpdate?: (input: {
    workItemId: string;
    projectKey: string;
    fields: string;
  }) => Promise<unknown>;
  meegoCommentCreate?: (input: {
    workItemId: string;
    projectKey: string;
    commentContent: string;
  }) => Promise<unknown>;
  larkDocCreator?: (input: {
    title: string;
    problem: string;
    nextSteps: string[];
  }) => Promise<unknown>;
  larkCalendarEventCreator?: (input: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendeeIds: string[];
  }) => Promise<unknown>;
  feishuChatSearch?: (input: {
    query: string;
  }) => Promise<unknown>;
  larkManagerDmSender?: (input: {
    employeeId?: string;
    feishuProfile?: FeishuProfile;
    managerOpenId: string;
    employeeDisplayName: string;
    body: string;
  }) => Promise<unknown>;
  larkGroupMessageSender?: (input: {
    feishuProfile?: FeishuProfile;
    chatId: string;
    employeeDisplayName: string;
    body: string;
    identity?: 'bot' | 'user';
  }) => Promise<unknown>;
  larkBotProjectGroupCreator?: (input: {
    employeeDisplayName: string;
    managerOpenId: string;
    chatName?: string;
  }) => Promise<unknown>;
  larkChatBotInviter?: (input: {
    chatId: string;
    appId: string;
  }) => Promise<unknown>;
  larkChatBotsLoader?: (input: {
    chatId: string;
  }) => Promise<unknown>;
  autoRepairGroupRoute?: boolean;
  realProjectGroupBootstrap?: boolean;
  reuseLatestVerifiedGroupRoute?: boolean;
  runtimeAdapter?: RuntimeAdapter;
  autonomyScheduler?: {
    enabled?: boolean;
    intervalMs?: number;
  };
}) {
  const latestSmokeReportPath = options.reportPaths?.latestSmokeReportPath ?? LATEST_SMOKE_REPORT_PATH;
  const latestRuntimeEndurancePath =
    options.reportPaths?.latestRuntimeEndurancePath ?? LATEST_RUNTIME_ENDURANCE_PATH;
  const latestGroupRouteRepairPath =
    options.reportPaths?.latestGroupRouteRepairPath ?? LATEST_GROUP_ROUTE_REPAIR_PATH;
  const readLatestGroupRouteRepairReportResolved = async () => {
    try {
      return JSON.parse(await readFile(latestGroupRouteRepairPath, 'utf8'));
    } catch {
      return null;
    }
  };

  const app = Fastify();
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'content-type,authorization');

    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

  const sqlite = createDb(options.databaseUrl);
  const employeeRepository = new EmployeeRepository(sqlite);
  const employeeProfileRepository = new EmployeeProfileRepository(sqlite);
  const candidateRepository = new CandidateRepository(sqlite);
  const candidateLifecycleRepository = new CandidateLifecycleRepository(sqlite);
  const interviewRepository = new InterviewRepository(sqlite);
  const messageRepository = new MessageRepository(sqlite);
  const reflectionRepository = new ReflectionRepository(sqlite);
  const learningRecordRepository = new LearningRecordRepository(sqlite);
  const approvalRequestRepository = new ApprovalRequestRepository(sqlite);
  const emotionEventRepository = new EmotionEventRepository(sqlite);
  const performanceEventRepository = new PerformanceEventRepository(sqlite);
  const directionKnowledgeRepository = new DirectionKnowledgeRepository(sqlite);
  const directionConfigRepository = new DirectionConfigRepository(sqlite);
  const projectGroupBindingRepository = new ProjectGroupBindingRepository(sqlite);
  const projectOpsEventRepository = new ProjectOpsEventRepository(sqlite);
  const resignationEventRepository = new ResignationEventRepository(sqlite);
  const managerProxyReviewRepository = new ManagerProxyReviewRepository(sqlite);
  const managerConversationMessageRepository = new ManagerConversationMessageRepository(sqlite);
  const autonomySettingsRepository = new AutonomySettingsRepository(sqlite);
  const autonomousLearningRunRepository = new AutonomousLearningRunRepository(sqlite);
  const runtimeDispatchRepository = new RuntimeDispatchRepository(sqlite);
  const runtimeResultEventRepository = new RuntimeResultEventRepository(sqlite);
  const runtimeSessionRepository = new RuntimeSessionRepository(sqlite);
  const feishuAgentOnboardingSessionRepository = new FeishuAgentOnboardingSessionRepository(sqlite);
  const feishuConversationRepository = new FeishuConversationRepository(sqlite);
  const workItemRepository = new WorkItemRepository(sqlite);
  const workEpisodeRepository = new WorkEpisodeRepository(sqlite);
  const runtime = options.runtimeAdapter ?? new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');
  const memoryLoader = options.memoryLoader ?? loadEmployeeMemory;
  const now = options.now ?? (() => new Date());
  const integrationStatusLoader = options.integrationStatusLoader ?? detectIntegrationStatus;
  const bytedcliAuthLoader = options.bytedcliAuthLoader ?? loadBytedcliAuth;
  const larkAuthLoader = options.larkAuthLoader ?? loadLarkAuth;
  const meegoAuthLoader = options.meegoAuthLoader ?? loadMeegoAuth;
  const meegoWorkitemLookup = options.meegoWorkitemLookup ?? lookupMeegoWorkitem;
  const meegoWorkitemUpdate = options.meegoWorkitemUpdate ?? updateMeegoWorkitem;
  const meegoCommentCreate = options.meegoCommentCreate ?? createMeegoComment;
  const larkDocCreator = options.larkDocCreator ?? createTechReviewDoc;
  const larkCalendarEventCreator = options.larkCalendarEventCreator ?? createTechReviewMeeting;
  const feishuChatSearch = options.feishuChatSearch ?? searchFeishuChat;
  const larkManagerDmSender = options.larkManagerDmSender ?? sendManagerDm;
  const larkGroupMessageSender = options.larkGroupMessageSender ?? sendGroupMessage;
  const larkBotProjectGroupCreator = options.larkBotProjectGroupCreator ?? createBotProjectGroupChat;
  const larkChatBotInviter = options.larkChatBotInviter ?? inviteBotToChat;
  const larkChatBotsLoader = options.larkChatBotsLoader ?? listChatBots;
  const autoRepairGroupRoute = options.autoRepairGroupRoute ?? false;
  const realProjectGroupBootstrap = options.realProjectGroupBootstrap ?? false;
  const reuseLatestVerifiedGroupRoute = options.reuseLatestVerifiedGroupRoute ?? false;
  const seedEmployees = [structuredClone(lushirongSeed), structuredClone(zhouyongkangSeed)];
  const seedDirectionConfigs = [
    {
      directionId: independentGrowthDiversionDirection.directionId,
      displayName: independentGrowthDiversionDirection.displayName,
      defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
      defaultRepoIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds.filter((id) => id.startsWith('repo-')),
      commonDocumentRefs: [],
      routingHints: [],
    },
    {
      directionId: corePlatformDirection.directionId,
      displayName: corePlatformDirection.displayName,
      defaultKnowledgeBaseIds: corePlatformDirection.defaultKnowledgeBaseIds,
      defaultRepoIds: corePlatformDirection.defaultKnowledgeBaseIds.filter((id) => id.startsWith('repo-')),
      commonDocumentRefs: [],
      routingHints: [],
    },
  ];
  const seedDirectionKnowledgeRecords = buildSeedDirectionKnowledgeRecords();
  const resolveSeedProjectGroupBindings = async () => {
    const fallbackBindings = buildDefaultProjectGroupBindings();
    const latestGroupRouteRepair = reuseLatestVerifiedGroupRoute
      ? await resolveLatestVerifiedGroupRouteReport(await readLatestGroupRouteRepairReportResolved(), {
          chatBotsLoader: larkChatBotsLoader,
        })
      : null;
    const applyLatestVerifiedGroup = (bindings: typeof fallbackBindings) => {
      if (hasLatestVerifiedGroupRouteReport(latestGroupRouteRepair)) {
        return bindings.map((binding) =>
          binding.employeeId === latestGroupRouteRepair.employeeId
            ? {
                ...binding,
                chatId: latestGroupRouteRepair.latestGroup.chatId,
                chatName: latestGroupRouteRepair.latestGroup.chatName,
                managerProxyRequired: false,
              }
            : binding,
        );
      }
      return bindings;
    };
    if (!realProjectGroupBootstrap) {
      return applyLatestVerifiedGroup(fallbackBindings);
    }

    const larkAuth = await larkAuthLoader().catch(() => ({
      appId: '',
      botOpenId: '',
      verified: false,
      userName: '',
      openId: '',
    }));

    const resolved = [];
    for (const employee of seedEmployees) {
      const exactBotQaChatName = `RDLeader Bot QA · ${employee.displayName}`;
      let matchedChat:
        | {
            chat_id: string;
            name: string;
          }
        | undefined;
      let exactSearchSucceeded = false;
      try {
        const result = await feishuChatSearch({ query: exactBotQaChatName });
        exactSearchSucceeded = true;
        const chats = Array.isArray((result as { data?: { chats?: unknown[] } })?.data?.chats)
          ? ((result as { data: { chats: Array<{ chat_id?: unknown; name?: unknown }> } }).data.chats)
          : [];
        const exact = chats.find(
          (chat) => typeof chat?.chat_id === 'string' && typeof chat?.name === 'string' && chat.name === exactBotQaChatName,
        );
        if (exact && typeof exact.chat_id === 'string' && typeof exact.name === 'string') {
          matchedChat = {
            chat_id: exact.chat_id,
            name: exact.name,
          };
        }
      } catch {
        exactSearchSucceeded = false;
      }

      if (!matchedChat && exactSearchSucceeded && larkAuth.openId?.trim()) {
        try {
          const created = await larkBotProjectGroupCreator({
            employeeDisplayName: employee.displayName,
            managerOpenId: larkAuth.openId,
            chatName: exactBotQaChatName,
          });
          const candidate =
            typeof (created as { data?: { chat_id?: unknown; name?: unknown } })?.data?.chat_id === 'string' &&
            typeof (created as { data?: { chat_id?: unknown; name?: unknown } })?.data?.name === 'string'
              ? ((created as { data: { chat_id: string; name: string } }).data)
              : null;
          if (candidate) {
            matchedChat = {
              chat_id: candidate.chat_id,
              name: candidate.name,
            };
          }
        } catch {
          // ignore and continue to generic fallback / placeholder binding
        }
      }

      if (!matchedChat) {
        for (const query of ['RDLeader Bot QA']) {
          try {
            const result = await feishuChatSearch({ query });
            const chats = Array.isArray((result as { data?: { chats?: unknown[] } })?.data?.chats)
              ? ((result as { data: { chats: Array<{ chat_id?: unknown; name?: unknown }> } }).data.chats)
              : [];
            const exact = chats.find(
              (chat) => typeof chat?.chat_id === 'string' && typeof chat?.name === 'string' && chat.name === query,
            );
            const candidate = exact ?? chats.find((chat) => typeof chat?.chat_id === 'string' && typeof chat?.name === 'string');
            if (candidate && typeof candidate.chat_id === 'string' && typeof candidate.name === 'string') {
              matchedChat = {
                chat_id: candidate.chat_id,
                name: candidate.name,
              };
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!matchedChat) {
        resolved.push(fallbackBindings.find((binding) => binding.employeeId === employee.employeeId)!);
        continue;
      }

      let managerProxyRequired = true;
      if (larkAuth.botOpenId?.trim()) {
        try {
          const botPayload = await larkChatBotsLoader({ chatId: matchedChat.chat_id });
          const items = Array.isArray((botPayload as { data?: { items?: unknown[] } })?.data?.items)
            ? ((botPayload as { data: { items: Array<{ bot_id?: unknown }> } }).data.items)
            : [];
          managerProxyRequired = !items.some(
            (item) => item && typeof item.bot_id === 'string' && item.bot_id === larkAuth.botOpenId,
          );
        } catch {
          managerProxyRequired = true;
        }
      }

      resolved.push({
        bindingId: `group-${employee.employeeId}-default`,
        employeeId: employee.employeeId,
        chatId: matchedChat.chat_id,
        chatName: matchedChat.name,
        status: 'active' as const,
        isDefault: true,
        managerProxyRequired,
        lastSyncedAt: null,
      });
    }

    return applyLatestVerifiedGroup(resolved);
  };
  const defaultProjectGroupBindings = await resolveSeedProjectGroupBindings();

  directionConfigRepository.seed(seedDirectionConfigs);
  projectGroupBindingRepository.seed(defaultProjectGroupBindings);
  employeeRepository.seed(seedEmployees);
  employeeProfileRepository.seed(seedEmployees);
  directionKnowledgeRepository.seed(seedDirectionKnowledgeRecords);
  for (const employee of seedEmployees) {
    autonomySettingsRepository.getOrCreate(employee.employeeId, now().toISOString());
    workItemRepository.seedAssignments(employee.employeeId, employee.currentAssignments, now().toISOString());
  }

  const summarizeEmployees = () =>
    employeeRepository.list().map((employee) => ({
      ...employee,
      activeTaskCount: workItemRepository.listOpenForEmployee(employee.employeeId).length,
    }));
  const getEmployee = (employeeId: string) => employeeRepository.get(employeeId);
  const getEmployeeProfile = (employeeId: string) => employeeProfileRepository.get(employeeId);
  const getCurrentAssignments = (employeeId: string) => workItemRepository.listOpenForEmployee(employeeId).map((item) => item.title);
  const listRecentApprovalRequests = (employeeId: string) => approvalRequestRepository.listForEmployee(employeeId).slice(0, 5);
  const listRuntimeSessions = (employeeId: string) => runtimeSessionRepository.listForEmployee(employeeId).slice(0, 10);
  const listRecentRuntimeResults = (employeeId: string) => runtimeResultEventRepository.listForEmployee(employeeId).slice(0, 10);
  const listProjectGroupsWithRouteStatus = async (employeeId: string) => {
    const groups = projectGroupBindingRepository.listForEmployee(employeeId);
    const employeeProfile = getEmployeeProfile(employeeId)?.feishuProfile;
    const larkAuth = await larkAuthLoader().catch(() => ({
      appId: '',
      botOpenId: '',
      verified: false,
      userName: '',
      openId: '',
    }));

    return Promise.all(
      groups.map((group) =>
        enrichProjectGroupBindingRouteStatus(group, {
          employeeBotOpenId: employeeProfile?.botOpenId,
          fallbackBotOpenId: larkAuth.botOpenId,
          chatBotsLoader: larkChatBotsLoader,
        }),
      ),
    );
  };
  const maybeCreateAutoPeerSync = (input: {
    senderEmployeeId: string;
    workItemId: string;
    workItemTitle: string;
  }) => {
    const sender = getEmployee(input.senderEmployeeId);
    if (!sender) {
      return null;
    }

    const peer = employeeRepository
      .list()
      .find(
        (employee) =>
          employee.employeeId !== input.senderEmployeeId &&
          employee.directionId === sender.directionId &&
          employee.employmentStatus === 'active',
      );

    if (!peer) {
      return null;
    }

    const body = buildAutoPeerSyncMessage({
      senderEmployeeId: input.senderEmployeeId,
      targetEmployeeDisplayName: peer.displayName,
      workItemId: input.workItemId,
      workItemTitle: input.workItemTitle,
    });

    const alreadyExists = messageRepository
      .listForEmployee(input.senderEmployeeId)
      .some(
        (message) =>
          message.senderEmployeeId === input.senderEmployeeId &&
          message.recipientEmployeeId === peer.employeeId &&
          message.body === body,
      );

    if (alreadyExists) {
      return null;
    }

    messageRepository.create({
      senderEmployeeId: input.senderEmployeeId,
      recipientEmployeeId: peer.employeeId,
      body,
    });

    return {
      recipientEmployeeId: peer.employeeId,
      recipientDisplayName: peer.displayName,
      body,
    };
  };
  const buildWorkEpisodeObservability = (employeeId: string) => {
    const recentWorkEpisodes = workEpisodeRepository.listForEmployee(employeeId);
    const workItemStatusMap = new Map(
      workItemRepository.listForEmployee(employeeId).map((item) => [item.workItemId, item.status] as const),
    );
    const currentBlockers = Array.from(
      new Set(
        recentWorkEpisodes
          .filter((episode) => {
            if (!(episode.status === 'active' || episode.status === 'blocked') || !episode.blocker?.trim()) {
              return false;
            }

            const matchedWorkItemId =
              episode.title.startsWith('Runtime 结果 · ') ? episode.title.replace('Runtime 结果 · ', '').trim() : '';
            if (matchedWorkItemId && workItemStatusMap.get(matchedWorkItemId) === 'completed') {
              return false;
            }

            return true;
          })
          .map((episode) => episode.blocker!.trim()),
      ),
    );

    return {
      recentWorkEpisodes: recentWorkEpisodes.slice(0, 5),
      currentBlockers,
      latestReasoningSummary: recentWorkEpisodes.find((episode) => episode.reasoningSummary?.trim())?.reasoningSummary,
      latestArtifacts: recentWorkEpisodes.find((episode) => episode.artifactRefs.length > 0)?.artifactRefs ?? [],
    };
  };
  const buildBrainPreview = (employeeId: string, taskType: AssembleTaskContextInput['taskType']) => {
    const employeeRow = getEmployee(employeeId);
    const employeeProfile = getEmployeeProfile(employeeId);

    if (!employeeRow || !employeeProfile) {
      return undefined;
    }

    const directionConfig = directionConfigRepository.get(employeeRow.directionId);
    const workObservability = buildWorkEpisodeObservability(employeeId);
    const recentReflections = reflectionRepository.listForEmployee(employeeId).slice(0, 5);
    const recentLearningRecords = learningRecordRepository.listForEmployee(employeeId).slice(0, 5);
    const recentDirectionKnowledge = directionKnowledgeRepository.listForDirection(employeeRow.directionId).slice(0, 5);
    const recentManagerReviews = managerProxyReviewRepository.listForEmployee(employeeId).slice(0, 5);

    const workingMemory = uniqueStrings([
      ...getCurrentAssignments(employeeId).map((assignment) => `当前任务：${assignment}`),
      `最近完成：${employeeRow.recentDoneSummary}`,
      `下一步：${employeeRow.nextStepSummary}`,
      ...workObservability.currentBlockers.map((blocker) => `阻塞：${blocker}`),
      ...(workObservability.latestReasoningSummary ? [`推理摘要：${workObservability.latestReasoningSummary}`] : []),
    ]);

    const episodicMemory = uniqueStrings([
      ...workObservability.recentWorkEpisodes.map((episode) =>
        `工作片段：${episode.status} · ${episode.title} · ${episode.summary}${episode.blocker ? ` · 阻塞：${episode.blocker}` : ''}`,
      ),
      ...recentManagerReviews.map((review) => `经理代理评审：${review.reviewTopic} · ${review.conclusion}`),
      ...recentReflections.map((reflection) => `反思：${reflection.summary}`),
    ]);

    const knowledgeItems = uniqueStrings([
      ...(directionConfig?.defaultKnowledgeBaseIds ?? []),
      ...(directionConfig?.defaultRepoIds ?? []),
      ...(directionConfig?.commonDocumentRefs ?? []),
      ...(directionConfig?.routingHints ?? []).map((hint) => `routing:${hint}`),
      ...recentLearningRecords.map((record) => `学习记录：${record.title}`),
      ...recentDirectionKnowledge.map((record) => `方向知识：${record.title}`),
    ]);

    const employeeContext = {
      employeeId: employeeRow.employeeId,
      displayName: employeeRow.displayName,
      directionId: employeeRow.directionId,
      personaProfile: employeeProfile.personaProfile,
      emotionState: {
        current: employeeRow.emotionCurrent,
        intensity: employeeRow.emotionIntensity,
        triggers: employeeProfile.emotionTriggers,
        summary: employeeRow.emotionSummary,
      },
      performanceState: {
        deliveryTrend: employeeRow.deliveryTrend,
        communicationQuality: employeeRow.communicationQuality,
        blockerHandling: employeeRow.blockerHandling,
        reviewQuality: employeeRow.reviewQuality,
        promotionReadiness: employeeRow.promotionReadiness,
        retentionRisk: employeeRow.retentionRisk,
        reliabilityScore: employeeRow.reliabilityScore,
      },
    };

    const assembled = assembleTaskContext({
      employee: employeeContext,
      taskType,
      workingMemory,
      episodicMemory,
      knowledgeItems,
    });

    return {
      employeeId,
      taskType,
      layers: assembled.layers,
      inputsPreview: {
        workingMemory,
        episodicMemory,
        knowledgeItems,
      },
    };
  };
  const buildFeishuBridgePreview = (
    employeeId: string,
    threadKey: string,
    taskType: AssembleTaskContextInput['taskType'],
  ) => {
    const employeeRow = getEmployee(employeeId);
    const employeeProfile = getEmployeeProfile(employeeId);

    if (!employeeRow || !employeeProfile) {
      return undefined;
    }

    const directionConfig = directionConfigRepository.get(employeeRow.directionId);
    const workObservability = buildWorkEpisodeObservability(employeeId);
    const recentReflections = reflectionRepository.listForEmployee(employeeId).slice(0, 5);
    const recentLearningRecords = learningRecordRepository.listForEmployee(employeeId).slice(0, 5);
    const recentDirectionKnowledge = directionKnowledgeRepository.listForDirection(employeeRow.directionId).slice(0, 5);
    const recentManagerReviews = managerProxyReviewRepository.listForEmployee(employeeId).slice(0, 5);

    const workingMemory = uniqueStrings([
      ...getCurrentAssignments(employeeId).map((assignment) => `当前任务：${assignment}`),
      `最近完成：${employeeRow.recentDoneSummary}`,
      `下一步：${employeeRow.nextStepSummary}`,
      ...workObservability.currentBlockers.map((blocker) => `阻塞：${blocker}`),
      ...(workObservability.latestReasoningSummary ? [`推理摘要：${workObservability.latestReasoningSummary}`] : []),
    ]);

    const episodicMemory = uniqueStrings([
      ...workObservability.recentWorkEpisodes.map((episode) =>
        `工作片段：${episode.status} · ${episode.title} · ${episode.summary}${episode.blocker ? ` · 阻塞：${episode.blocker}` : ''}`,
      ),
      ...recentManagerReviews.map((review) => `经理代理评审：${review.reviewTopic} · ${review.conclusion}`),
      ...recentReflections.map((reflection) => `反思：${reflection.summary}`),
    ]);

    const knowledgeItems = uniqueStrings([
      ...(directionConfig?.defaultKnowledgeBaseIds ?? []),
      ...(directionConfig?.defaultRepoIds ?? []),
      ...(directionConfig?.commonDocumentRefs ?? []),
      ...(directionConfig?.routingHints ?? []).map((hint) => `routing:${hint}`),
      ...recentLearningRecords.map((record) => `学习记录：${record.title}`),
      ...recentDirectionKnowledge.map((record) => `方向知识：${record.title}`),
    ]);

    return buildFeishuBrainContext({
      employee: {
        employeeId: employeeRow.employeeId,
        displayName: employeeRow.displayName,
        directionId: employeeRow.directionId,
        personaProfile: employeeProfile.personaProfile,
        emotionState: {
          current: employeeRow.emotionCurrent,
          intensity: employeeRow.emotionIntensity,
          triggers: employeeProfile.emotionTriggers,
          summary: employeeRow.emotionSummary,
        },
        performanceState: {
          deliveryTrend: employeeRow.deliveryTrend,
          communicationQuality: employeeRow.communicationQuality,
          blockerHandling: employeeRow.blockerHandling,
          reviewQuality: employeeRow.reviewQuality,
          promotionReadiness: employeeRow.promotionReadiness,
          retentionRisk: employeeRow.retentionRisk,
          reliabilityScore: employeeRow.reliabilityScore,
        },
      },
      taskType,
      workingMemory,
      episodicMemory,
      knowledgeItems,
      threadKey,
      feishuConversationRepository,
      emotionSummary: employeeRow.emotionSummary,
      deliveryTrend: employeeRow.deliveryTrend,
      reliabilityScore: employeeRow.reliabilityScore,
    });
  };
  const buildApprovalGateManagerReply = (employeeId: string, managerMessageBody: string) => {
    const employeeRow = getEmployee(employeeId);
    if (!employeeRow) {
      return undefined;
    }

    const approvalHint = buildApprovalHint(managerMessageBody);
    if (!approvalHint.approvalRequired) {
      return null;
    }

    return {
      taskType: classifyManagerChatTaskType(managerMessageBody),
      artifactRefs: extractArtifactRefsFromBody(managerMessageBody),
      reasoningSummary: null,
      approvalRequired: true,
      approvalSummary: approvalHint.approvalSummary,
      body: `${employeeRow.displayName}收到。这条指令涉及真实外部动作，${approvalHint.approvalSummary ?? '需要你先审批后我再执行。'} 在你明确批准前，我不会假装已经完成任何群消息、Meego、文档或会议操作。`,
    };
  };
  const createPendingRuntimeManagerReply = async (employeeId: string, managerMessageBody: string) => {
    const employeeRow = getEmployee(employeeId);
    if (!employeeRow) {
      return undefined;
    }

    const taskType = classifyManagerChatTaskType(managerMessageBody);
    const dispatched = await dispatchRuntimeTask({
      employeeId,
      taskTitle: `经理沟通回复 · ${managerMessageBody.slice(0, 18) || '新消息'}`,
      taskBody: [
        `老板给你的消息：${managerMessageBody}`,
        '请你像真实研发员工一样，基于当前真实工作区、真实任务、真实最新结果直接回复老板。',
        '要求：',
        '- 只能陈述真实已经做过的事情，不能编造任何外部动作或外部系统结果。',
        '- 如果老板只是问候或泛泛一问，也要结合你当前真实进展，给出一句到三句的同步。',
        '- summary 字段请直接写成发给老板的话；nextStepSummary 单独写你接下来最应该做的一步。',
        '- artifactRefs 只保留真实文件路径、命令引用或知识引用。',
      ].join('\n'),
      taskType,
    });

    return {
      taskType,
      artifactRefs: dispatched.runtimeReceipt?.taskFilePath ? [dispatched.runtimeReceipt.taskFilePath] : [],
      reasoningSummary: null,
      approvalRequired: false,
      approvalSummary: null,
      body: `${employeeRow.displayName}收到，正在基于真实工作区处理这条消息；我不会编造成果，等 Runtime 返回后会把真实结论补回这条对话。`,
      messageId: `mgr-chat-reply-${dispatched.dispatch.dispatchId}`,
      replyPending: true,
      dispatchId: dispatched.dispatch.dispatchId,
    };
  };
  const startBackgroundManagerReplyResolution = (employeeId: string, dispatchId: string) => {
    const maxAttempts = 20;
    const pollIntervalMs = 2_000;
    let attempt = 0;

    const tick = async () => {
      attempt += 1;
      try {
        const collected = (await collectEmployeeRuntimeEvents(employeeId)) ?? [];
        if (collected.some((event) => event.dispatchId === dispatchId)) {
          return;
        }
      } catch {
        // best effort background hydration; ignore and retry
      }

      if (attempt < maxAttempts) {
        setTimeout(() => {
          void tick();
        }, pollIntervalMs);
      }
    };

    setTimeout(() => {
      void tick();
    }, pollIntervalMs);
  };
  const runEmployeeAutonomousLearning = async (employeeId: string, trigger: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return undefined;
    }

    return runAutonomousLearningCycle({
      employee,
      trigger,
      now,
      loadMemory: () => memoryLoader(employee.employeeId as 'lushirong' | 'zhouyongkang'),
      autonomySettingsRepository,
      autonomousLearningRunRepository,
      reflectionRepository,
      learningRecordRepository,
      directionKnowledgeRepository,
    });
  };
  const runDueAutonomousLearningCycles = async (trigger: string = 'due_cycle') => {
    const dueSettings = autonomySettingsRepository.listDue(now().toISOString());
    const runs: Awaited<ReturnType<typeof runAutonomousLearningCycle>>[] = [];

    for (const settings of dueSettings) {
      const run = await runEmployeeAutonomousLearning(settings.employeeId, trigger);
      if (run) {
        runs.push(run);
      }
    }

    return runs;
  };
  const collectEmployeeRuntimeEvents = async (employeeId: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return undefined;
    }

    const events = await runtime.collectRuntimeEvents(employeeId);
    const persisted = await Promise.all(events.map(async (event) => {
      const saved = runtimeResultEventRepository.create({
        employeeId: event.employeeId,
        dispatchId: event.dispatchId ?? null,
        workItemId: event.workItemId ?? null,
        status: event.status,
        summary: event.summary,
        nextStepSummary: event.nextStepSummary ?? null,
        artifactRefs: event.artifactRefs,
        sourceFilePath: event.sourceFilePath,
        processedFilePath: event.processedFilePath,
        createdAt: event.createdAt,
      });

      if (event.workItemId) {
        const nextWorkStatus = event.status === 'completed' ? 'completed' : 'blocked';
        workItemRepository.updateStatus(event.workItemId, nextWorkStatus, event.createdAt);
      }

      if (event.dispatchId) {
        runtimeDispatchRepository.updateStatus(event.dispatchId, event.status);
        const managerReplyMessageId = `mgr-chat-reply-${event.dispatchId}`;
        const nextReplyBody = event.nextStepSummary ? `${event.summary}\n\n下一步：${event.nextStepSummary}` : event.summary;
        const updatedManagerReply = managerConversationMessageRepository.update(managerReplyMessageId, {
          body: nextReplyBody,
          taskType: event.status === 'failed' ? 'status' : undefined,
          reasoningSummary: event.nextStepSummary ?? null,
          artifactRefs: event.artifactRefs,
          approvalRequired: false,
          approvalSummary: null,
        });

        const employeeFeishuProfile = getEmployeeProfile(employeeId)?.feishuProfile;
        if (updatedManagerReply && isBoundEmployeeBotReady(employeeFeishuProfile)) {
          try {
            const dmResult = await larkManagerDmSender({
              employeeId,
              feishuProfile: employeeFeishuProfile,
              managerOpenId: employeeFeishuProfile!.managerOpenId!,
              employeeDisplayName: employee.displayName,
              body: updatedManagerReply.body,
            });
            const dmTransport =
              typeof (dmResult as { transport?: unknown })?.transport === 'string'
                ? (dmResult as { transport: string }).transport
                : 'employee-app-openapi';
            managerConversationMessageRepository.update(managerReplyMessageId, {
              artifactRefs: dedupeArtifactRefs([
                ...updatedManagerReply.artifactRefs,
                `delivery://manager-dm/${dmTransport}`,
              ]),
            });
            projectOpsEventRepository.create(
              {
                employeeId,
                actionKey: 'send_manager_dm',
                summary: `员工 bot 向老板私聊同步结果：${event.summary}`,
                nextStepSummary: event.nextStepSummary ?? null,
                targetRef: employeeFeishuProfile!.managerOpenId,
                detail: {
                  dispatchId: event.dispatchId,
                  deliveryTransport: dmTransport,
                  result: dmResult,
                },
              },
              event.createdAt,
            );
          } catch {
            // best effort DM mirror: keep the in-product conversation authoritative even if Feishu delivery fails
          }
        }
      }

      employeeRepository.updateWorkState(employeeId, {
        recentDoneSummary: event.summary,
        nextStepSummary: event.nextStepSummary ?? employee.nextStepSummary,
      });

      workEpisodeRepository.create(
        {
          employeeId,
          title: event.workItemId ? `Runtime 结果 · ${event.workItemId}` : 'Runtime 结果回流',
          summary: event.summary,
          status: event.status === 'completed' ? 'completed' : 'blocked',
          blocker: event.status === 'blocked' || event.status === 'failed' ? event.summary : null,
          reasoningSummary: event.nextStepSummary ?? null,
          artifactRefs: event.artifactRefs,
        },
        event.createdAt,
      );

      return saved;
    }));

    return persisted;
  };
  const ensureEmployeeWorkspaceBootstrap = async (employeeId: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return undefined;
    }

    const directionConfig = directionConfigRepository.get(employee.directionId);
    const workspacePath = resolveWorkspacePath(employeeId);
    const reposDir = path.join(workspacePath, 'repos');
    await mkdir(workspacePath, { recursive: true });
    await mkdir(reposDir, { recursive: true });

    const repoMappings: Array<{
      repoId: string;
      linkPath: string;
      sourcePath?: string;
      status: 'linked' | 'missing';
    }> = [];

    for (const repoId of directionConfig?.defaultRepoIds ?? []) {
      const linkPath = path.join(reposDir, workspaceRepoLinkName(repoId));
      const sourcePath = await resolveLocalRepoPath(repoId);

      if (!sourcePath) {
        repoMappings.push({
          repoId,
          linkPath,
          status: 'missing',
        });
        continue;
      }

      const linkExists = await pathExists(linkPath);
      if (linkExists) {
        await unlink(linkPath).catch(() => undefined);
      }
      await symlink(sourcePath, linkPath);
      repoMappings.push({
        repoId,
        linkPath,
        sourcePath,
        status: 'linked',
      });
    }

    const workspaceMap = {
      employeeId,
      directionId: employee.directionId,
      generatedAt: now().toISOString(),
      repoMappings,
    };
    await writeFile(path.join(workspacePath, 'WORKSPACE_MAP.json'), JSON.stringify(workspaceMap, null, 2), 'utf8');
    await writeFile(
      path.join(workspacePath, 'WORKSPACE_MAP.md'),
      [
        `# ${employee.displayName} Workspace Map`,
        '',
        `- employeeId: ${employeeId}`,
        `- directionId: ${employee.directionId}`,
        `- workspacePath: ${workspacePath}`,
        '',
        '## Recommended repo entrypoints',
        ...repoMappings.map((mapping) =>
          mapping.status === 'linked'
            ? `- ${mapping.repoId}: ${mapping.linkPath} -> ${mapping.sourcePath}`
            : `- ${mapping.repoId}: MISSING`,
        ),
        '',
        '## Notes',
        '- Runtime tasks should prioritize working inside the linked repos above.',
        '- `.rdleader/` stores task, result, log, and worker state files.',
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      path.join(workspacePath, 'AGENTS.md'),
      buildEmployeeWorkspaceAgentGuide({
        displayName: employee.displayName,
        employeeId,
        directionDisplayName: directionConfig?.displayName ?? employee.directionId,
        workspacePath,
      }),
      'utf8',
    );

    return workspaceMap;
  };
  const ensureRuntimeRunningForEmployee = async (employeeId: string) => {
    await ensureEmployeeWorkspaceBootstrap(employeeId);
    let heartbeat = await runtime.heartbeat(employeeId);
    const existingSession = runtimeSessionRepository.latestActiveForEmployee(employeeId);

    if (heartbeat.status === 'running') {
      return {
        runtime: heartbeat,
        session: existingSession ?? null,
        started: false,
      };
    }

    heartbeat = await runtime.start(employeeId);
    const currentNowIso = now().toISOString();
    const session =
      existingSession && existingSession.pid === heartbeat.pid
        ? existingSession
        : (() => {
            if (existingSession) {
              runtimeSessionRepository.stopSession(existingSession.sessionId, currentNowIso);
            }

            return runtimeSessionRepository.createRunning({
              employeeId,
              runtimeKind: heartbeat.runtimeKind,
              pid: heartbeat.pid,
              startedAt: currentNowIso,
            });
          })();

    return {
      runtime: heartbeat,
      session,
      started: true,
    };
  };
  const dispatchRuntimeTask = async (input: {
    employeeId: string;
    workItemId?: string | null;
    taskTitle: string;
    taskBody: string;
    taskType: AssembleTaskContextInput['taskType'];
  }) => {
    const runtimeState = await ensureRuntimeRunningForEmployee(input.employeeId);
    const brainPreview = buildBrainPreview(input.employeeId, input.taskType);
    const dispatchedAt = now().toISOString();
    const dispatchId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const runtimeReceipt = await runtime.sendTask(input.employeeId, {
      dispatchId,
      taskTitle: input.taskTitle.trim(),
      taskBody: input.taskBody.trim(),
      taskType: input.taskType,
      workItemId: input.workItemId ?? undefined,
      dispatchedAt,
      brainContext: brainPreview,
    });

    const dispatch = runtimeDispatchRepository.create({
      dispatchId,
      employeeId: input.employeeId,
      workItemId: input.workItemId ?? null,
      taskTitle: input.taskTitle.trim(),
      taskBody: input.taskBody.trim(),
      taskType: input.taskType,
      status: 'dispatched',
      workspaceTaskRef: runtimeReceipt.taskFilePath,
      createdAt: dispatchedAt,
    });

    return {
      dispatch,
      runtimeReceipt,
      brainPreview,
      runtime: runtimeState.runtime,
      session: runtimeState.session,
      runtimeStarted: runtimeState.started,
    };
  };
  const listPendingRuntimeTaskFiles = async (employeeId: string) => {
    const taskDir = path.join(resolveWorkspacePath(employeeId), '.rdleader', 'tasks');
    try {
      return (await readdir(taskDir)).filter((file: string) => file.endsWith('.json')).sort();
    } catch {
      return [];
    }
  };
  const runEmployeeAutonomousOperations = async (
    employeeId: string,
    trigger: string,
    options: {
      dueOnly?: boolean;
    } = {},
  ) => {
    const employee = getEmployee(employeeId);
    if (!employee || employee.employmentStatus !== 'active') {
      return undefined;
    }

    const settings = autonomySettingsRepository.getOrCreate(employeeId, now().toISOString());
    if (!settings.enabled) {
      return {
        employeeId,
        trigger,
        actions: [],
        collectedCount: 0,
      };
    }

    const currentNowIso = now().toISOString();
    if (options.dueOnly && (!settings.nextRunAt || settings.nextRunAt > currentNowIso)) {
      return {
        employeeId,
        trigger,
        actions: [],
        collectedCount: 0,
        skipped: 'not_due',
      };
    }

    const actions: string[] = [];
    const collected = (await collectEmployeeRuntimeEvents(employeeId)) ?? [];
    if (collected.length > 0) {
      actions.push(`runtime_results_collected:${collected.length}`);
    }

    let openWorkItems = workItemRepository.listOpenForEmployee(employeeId);
    let createdWorkItemId: string | null = null;

    if (openWorkItems.length === 0) {
      const directionDisplayName =
        directionConfigRepository.get(employee.directionId)?.displayName ?? employee.directionId;
      const created = workItemRepository.create(
        {
          employeeId,
          title: `自主巡检 · ${directionDisplayName}`,
          summary: `${employee.displayName} 在当前方向暂无显式任务，自动领取方向巡检与推进梳理工作。`,
          status: 'active',
          source: 'manager',
        },
        currentNowIso,
      );

      createdWorkItemId = created.workItemId;
      openWorkItems = [created];
      employeeRepository.updateWorkState(employeeId, {
        recentDoneSummary: employee.recentDoneSummary,
        nextStepSummary: `自主推进：${created.title}`,
      });
      workEpisodeRepository.create(
        {
          employeeId,
          title: '自主领取任务',
          summary: `${employee.displayName} 自动领取新任务：${created.title}`,
          status: 'in_progress',
          blocker: null,
          reasoningSummary: '当前没有显式未完成工作项，先进行方向巡检与推进梳理。',
          artifactRefs: [],
        },
        currentNowIso,
      );
      actions.push('work_item_auto_created');
    }

    const pendingTaskFiles = await listPendingRuntimeTaskFiles(employeeId);
    const currentNowTs = Date.parse(currentNowIso);
    const targetWorkItem = openWorkItems.find((item) => item.status === 'blocked') ?? openWorkItems[0] ?? null;

    let dispatchedTaskRef: string | null = null;
    let dispatchedWorkItemId: string | null = null;

    if (targetWorkItem) {
      const latestDispatchForTarget = runtimeDispatchRepository
        .listForEmployee(employeeId)
        .find((dispatch) => dispatch.workItemId === targetWorkItem.workItemId);
      const latestResultForTarget = runtimeResultEventRepository
        .listForEmployee(employeeId)
        .find((event) => event.workItemId === targetWorkItem.workItemId);
      const latestDispatchAt = latestDispatchForTarget ? Date.parse(latestDispatchForTarget.createdAt) : 0;
      const latestResultAt = latestResultForTarget ? Date.parse(latestResultForTarget.createdAt) : 0;
      const latestActivityTs = Math.max(latestDispatchAt, latestResultAt);
      const targetUpdatedAt = Date.parse(targetWorkItem.updatedAt ?? targetWorkItem.createdAt ?? currentNowIso);
      const shouldDispatch =
        pendingTaskFiles.length === 0 &&
        (!latestDispatchForTarget ||
          targetUpdatedAt > latestDispatchAt ||
          currentNowTs - latestActivityTs >= AUTONOMOUS_RUNTIME_DISPATCH_STALE_MS);

      if (!shouldDispatch) {
        return {
          employeeId,
          trigger,
          actions,
          collectedCount: collected.length,
          createdWorkItemId,
          dispatchedTaskRef,
          dispatchedWorkItemId,
          runtimeStatus: 'idle',
        };
      }

      const runtimeState = await ensureRuntimeRunningForEmployee(employeeId);
      if (runtimeState.started) {
        actions.push('runtime_started');
      }

      const isBlockedRecovery = targetWorkItem.status === 'blocked';
      const taskTitle = isBlockedRecovery ? `自我恢复 · ${targetWorkItem.title}` : `自主推进 · ${targetWorkItem.title}`;
      const taskBody = isBlockedRecovery
        ? `你当前工作项「${targetWorkItem.title}」处于 blocked。请先自我恢复：确认真实 blocker、整理恢复路径、给出需要同步的对象与下一步。工作项摘要：${targetWorkItem.summary}`
        : `请围绕工作项「${targetWorkItem.title}」继续主动推进。先输出当前进展、最小下一步、需要对齐的对象、潜在风险；如果工作区内暂时没有直接可落地的代码/文档对象，也要诚实说明并给出恢复路径。工作项摘要：${targetWorkItem.summary}`;
      const taskType: AssembleTaskContextInput['taskType'] = isBlockedRecovery ? 'coordination' : 'status';

      const dispatched = await dispatchRuntimeTask({
        employeeId,
        workItemId: targetWorkItem.workItemId,
        taskTitle,
        taskBody,
        taskType,
      });

      dispatchedTaskRef = dispatched.runtimeReceipt.taskFilePath;
      dispatchedWorkItemId = targetWorkItem.workItemId;
      employeeRepository.updateWorkState(employeeId, {
        recentDoneSummary: employee.recentDoneSummary,
        nextStepSummary: isBlockedRecovery ? `先自我恢复：${targetWorkItem.title}` : `继续自主推进：${targetWorkItem.title}`,
      });
      workEpisodeRepository.create(
        {
          employeeId,
          title: taskTitle,
          summary: `自治调度（${trigger}）已将「${targetWorkItem.title}」派发给 Runtime。`,
          status: 'in_progress',
          blocker: null,
          reasoningSummary: taskBody,
          artifactRefs: [dispatched.runtimeReceipt.taskFilePath],
        },
        currentNowIso,
      );
      if (isBlockedRecovery) {
        const peerSync = maybeCreateAutoPeerSync({
          senderEmployeeId: employeeId,
          workItemId: targetWorkItem.workItemId,
          workItemTitle: targetWorkItem.title,
        });
        if (peerSync) {
          actions.push(`peer_sync_requested:${peerSync.recipientEmployeeId}`);
        }
      }
      actions.push(isBlockedRecovery ? 'runtime_recovery_dispatch_created' : 'runtime_autonomous_dispatch_created');
    }

    return {
      employeeId,
      trigger,
      actions,
      collectedCount: collected.length,
      createdWorkItemId,
      dispatchedTaskRef,
      dispatchedWorkItemId,
      runtimeStatus: dispatchedTaskRef ? 'running_or_started' : 'idle',
    };
  };
  const runAutonomousOperationsSweep = async (
    trigger: string = 'scheduler',
    options: {
      dueOnly?: boolean;
    } = {},
  ) => {
    const employees = employeeRepository.list();
    const runs: Array<Awaited<ReturnType<typeof runEmployeeAutonomousOperations>>> = [];

    for (const employee of employees) {
      const run = await runEmployeeAutonomousOperations(employee.employeeId, trigger, options);
      if (run) {
        runs.push(run);
      }
    }

    return runs;
  };
  const runRuntimeMaintenanceForEmployee = async (employeeId: string) => {
    const employee = getEmployee(employeeId);
    if (!employee || employee.employmentStatus !== 'active') {
      return undefined;
    }

    const pendingTasks = await listPendingRuntimeTaskFiles(employeeId);
    const existingResults = runtimeResultEventRepository.listForEmployee(employeeId);
    const runtimeState = await runtime.heartbeat(employeeId);
    const actions: string[] = [];

    if (pendingTasks.length > 0 && runtimeState.status !== 'running') {
      const started = await ensureRuntimeRunningForEmployee(employeeId);
      if (started.started) {
        actions.push('runtime_started_for_pending_tasks');
      }
    }

    const collected = (await collectEmployeeRuntimeEvents(employeeId)) ?? [];
    if (collected.length > 0) {
      actions.push(`runtime_results_collected:${collected.length}`);
    }

    if (actions.length === 0 && existingResults.length === 0 && pendingTasks.length === 0) {
      return undefined;
    }

    return {
      employeeId,
      pendingTaskCount: pendingTasks.length,
      collectedCount: collected.length,
      actions,
    };
  };
  const runRuntimeMaintenanceSweep = async () => {
    const employees = employeeRepository.list();
    const runs: Array<Awaited<ReturnType<typeof runRuntimeMaintenanceForEmployee>>> = [];

    for (const employee of employees) {
      const run = await runRuntimeMaintenanceForEmployee(employee.employeeId);
      if (run) {
        runs.push(run);
      }
    }

    return runs;
  };
  const resetDemoState = async () => {
    const existingTables = new Set(
      (
        sqlite
          .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
          .all() as Array<{ name: string }>
      ).map((row) => row.name),
    );

    for (const employee of seedEmployees) {
      await runtime.stop(employee.employeeId).catch(() => undefined);
      const workspacePath = resolveWorkspacePath(employee.employeeId);
      await rm(path.join(workspacePath, '.rdleader'), { recursive: true, force: true }).catch(() => undefined);
      await rm(path.join(workspacePath, 'WORKSPACE_MAP.md'), { force: true }).catch(() => undefined);
      await rm(path.join(workspacePath, 'WORKSPACE_MAP.json'), { force: true }).catch(() => undefined);
    }

    const tablesToClear = [
      'approval_requests',
      'autonomous_learning_runs',
      'autonomy_settings',
      'behavior_events',
      'behavior_settings',
      'candidate_lifecycle_events',
      'candidates',
      'direction_configs',
      'direction_knowledge_records',
      'emotion_events',
      'employee_profiles',
      'employees',
      'feishu_agent_onboarding_sessions',
      'interviews',
      'learning_records',
      'manager_conversation_messages',
      'manager_proxy_reviews',
      'messages',
      'performance_events',
      'project_group_bindings',
      'project_ops_events',
      'reflections',
      'resignation_events',
      'runtime_dispatches',
      'runtime_result_events',
      'runtime_sessions',
      'work_episodes',
      'work_items',
    ];

    sqlite.exec('BEGIN');
    try {
      for (const tableName of tablesToClear) {
        if (existingTables.has(tableName)) {
          sqlite.prepare(`DELETE FROM ${tableName}`).run();
        }
      }
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }

    const refreshedProjectGroupBindings = await resolveSeedProjectGroupBindings();

    directionConfigRepository.seed(seedDirectionConfigs);
    projectGroupBindingRepository.seed(refreshedProjectGroupBindings);
    employeeRepository.seed(seedEmployees);
    employeeProfileRepository.seed(seedEmployees);
    directionKnowledgeRepository.seed(seedDirectionKnowledgeRecords);
    for (const employee of seedEmployees) {
      autonomySettingsRepository.getOrCreate(employee.employeeId, now().toISOString());
      workItemRepository.seedAssignments(employee.employeeId, employee.currentAssignments, now().toISOString());
    }

    const latestGroupRouteRepair = reuseLatestVerifiedGroupRoute
      ? await resolveLatestVerifiedGroupRouteReport(await readLatestGroupRouteRepairReportResolved(), {
          chatBotsLoader: larkChatBotsLoader,
        })
      : null;
    if (hasLatestVerifiedGroupRouteReport(latestGroupRouteRepair)) {
      const existingDefault = projectGroupBindingRepository
        .listForEmployee(latestGroupRouteRepair.employeeId)
        .find((binding) => binding.isDefault);
      if (!existingDefault || isDemoPlaceholderChatId(existingDefault.chatId)) {
        projectGroupBindingRepository.create({
          employeeId: latestGroupRouteRepair.employeeId,
          chatId: latestGroupRouteRepair.latestGroup.chatId,
          chatName: latestGroupRouteRepair.latestGroup.chatName,
          status: 'active',
          isDefault: true,
          managerProxyRequired: false,
          lastSyncedAt: now().toISOString(),
        });
      }
    }

    return {
      ok: true,
      employees: seedEmployees.map((employee) => employee.employeeId),
      clearedTables: tablesToClear.filter((tableName) => existingTables.has(tableName)),
    };
  };

  let stopAutonomyScheduler = () => {};
  app.addHook('onReady', async () => {
    stopAutonomyScheduler = startAutonomyScheduler({
      enabled: options.autonomyScheduler?.enabled ?? false,
      intervalMs: options.autonomyScheduler?.intervalMs ?? 60_000,
      runDueCycles: async () => {
        const maintenance = await runRuntimeMaintenanceSweep();
        const operations = await runAutonomousOperationsSweep('scheduler', { dueOnly: true });
        const learning = await runDueAutonomousLearningCycles('scheduler');
        return {
          maintenance,
          operations,
          learning,
        };
      },
      onError: (error) => app.log.error(error),
    });
  });
  app.addHook('onClose', async () => {
    stopAutonomyScheduler();
  });

  app.get('/health', async () => ({ ok: true }));
  app.get('/integrations/status', async () => integrationStatusLoader());
  app.get('/integrations/bytedcli/auth', async () => bytedcliAuthLoader());
  app.get('/integrations/lark/auth', async () => larkAuthLoader());
  app.get('/integrations/meego/auth', async () => meegoAuthLoader());
  app.get('/directions', async () => directionConfigRepository.list());
  app.get('/directions/:directionId/config', async (request, reply) => {
    const { directionId } = request.params as { directionId: string };
    const config = directionConfigRepository.get(directionId);

    if (!config) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    return config;
  });
  app.post('/directions/:directionId/config', async (request, reply) => {
    const { directionId } = request.params as { directionId: string };
    const body = request.body as {
      displayName?: string;
      defaultKnowledgeBaseIds?: unknown;
      defaultRepoIds?: unknown;
      commonDocumentRefs?: unknown;
      routingHints?: unknown;
    };

    if (
      !isOptionalStringArray(body.defaultKnowledgeBaseIds) ||
      !isOptionalStringArray(body.defaultRepoIds) ||
      !isOptionalStringArray(body.commonDocumentRefs) ||
      !isOptionalStringArray(body.routingHints)
    ) {
      return reply
        .code(400)
        .send({ message: 'defaultKnowledgeBaseIds, defaultRepoIds, commonDocumentRefs, and routingHints must be string arrays' });
    }

    const existingConfig = directionConfigRepository.get(directionId);
    if (!existingConfig && !body.displayName?.trim()) {
      return reply.code(400).send({ message: 'displayName is required' });
    }

    return directionConfigRepository.upsert({
      directionId,
      displayName: body.displayName?.trim() ?? existingConfig?.displayName ?? directionId,
      defaultKnowledgeBaseIds: body.defaultKnowledgeBaseIds ?? existingConfig?.defaultKnowledgeBaseIds ?? [],
      defaultRepoIds: body.defaultRepoIds ?? existingConfig?.defaultRepoIds ?? [],
      commonDocumentRefs: body.commonDocumentRefs ?? existingConfig?.commonDocumentRefs ?? [],
      routingHints: body.routingHints ?? existingConfig?.routingHints ?? [],
    });
  });
  app.get('/employees', async () => summarizeEmployees());
  app.get('/employees/:employeeId', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employeeRow = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employeeRow || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const directionConfig = directionConfigRepository.get(employeeRow.directionId);
    const projectGroups = await listProjectGroupsWithRouteStatus(employeeId);
    const memory =
      employeeId === 'lushirong' || employeeId === 'zhouyongkang'
        ? await memoryLoader(employeeId)
        : [];

    return {
      employeeId: employeeRow.employeeId,
      displayName: employeeRow.displayName,
      directionId: employeeRow.directionId,
      currentAssignments: getCurrentAssignments(employeeId),
      level: employeeRow.level,
      employmentStatus: employeeRow.employmentStatus,
      recentDoneSummary: employeeRow.recentDoneSummary,
      nextStepSummary: employeeRow.nextStepSummary,
      workspacePath: employeeRow.workspacePath,
      runtimeKind: employeeRow.runtimeKind,
      defaultKnowledgeBaseIds: directionConfig?.defaultKnowledgeBaseIds ?? [],
      directionConfig: directionConfig ?? null,
      riskFlags: employeeProfile.riskFlags,
      personaProfile: employeeProfile.personaProfile,
      feishuProfile: employeeProfile.feishuProfile,
      projectGroups,
      emotionState: {
        current: employeeRow.emotionCurrent,
        intensity: employeeRow.emotionIntensity,
        triggers: employeeProfile.emotionTriggers,
        summary: employeeRow.emotionSummary,
      },
      performanceState: {
        deliveryTrend: employeeRow.deliveryTrend,
        communicationQuality: employeeRow.communicationQuality,
        blockerHandling: employeeRow.blockerHandling,
        reviewQuality: employeeRow.reviewQuality,
        promotionReadiness: employeeRow.promotionReadiness,
        retentionRisk: employeeRow.retentionRisk,
        reliabilityScore: employeeRow.reliabilityScore,
      },
      resignationIntent:
        employeeRow.resignationIntent,
      latestLearningRecordId: learningRecordRepository.listForEmployee(employeeId)[0]?.recordId,
      ...buildWorkEpisodeObservability(employeeId),
      runtimeSessions: listRuntimeSessions(employeeId),
      recentRuntimeResults: listRecentRuntimeResults(employeeId),
      runtime: await runtime.heartbeat(employeeRow.employeeId),
      memory,
      conversations: managerConversationMessageRepository.listForEmployee(employeeId).slice(-5),
      recentApprovalRequests: listRecentApprovalRequests(employeeId),
    };
  });

  app.get('/employees/:employeeId/memory', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (employeeId !== 'lushirong' && employeeId !== 'zhouyongkang') {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return memoryLoader(employeeId);
  });

  app.get('/employees/:employeeId/brain-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const taskType = (request.query as { taskType?: unknown }).taskType ?? 'coding';

    if (!isBrainPreviewTaskType(taskType)) {
      return reply.code(400).send({ message: 'invalid taskType' });
    }

    const preview = buildBrainPreview(employeeId, taskType);
    if (!preview) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return preview;
  });

  app.post('/feishu/bridge/conversations', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      channelType: 'manager_dm' | 'internal_staff_group' | 'project_group';
      senderOpenId: string;
      senderRole: 'manager' | 'employee' | 'internal_staff' | 'system';
      body: string;
      normalizedIntent?: string | null;
      linkedDispatchId?: string | null;
      linkedWorkItemId?: string | null;
    };

    if (!getEmployee(body.employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.threadKey?.trim() || !body.body?.trim()) {
      return reply.code(400).send({ message: 'threadKey and body are required' });
    }

    const row = feishuConversationRepository.create(
      {
        employeeId: body.employeeId,
        threadKey: body.threadKey.trim(),
        channelType: body.channelType,
        senderOpenId: body.senderOpenId,
        senderRole: body.senderRole,
        body: body.body.trim(),
        normalizedIntent: body.normalizedIntent ?? null,
        linkedDispatchId: body.linkedDispatchId ?? null,
        linkedWorkItemId: body.linkedWorkItemId ?? null,
      },
      now().toISOString(),
    );

    return reply.code(201).send(row);
  });

  app.get('/employees/:employeeId/feishu-conversations', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const threadKey = String((request.query as { threadKey?: string }).threadKey ?? '').trim();

    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!threadKey) {
      return reply.code(400).send({ message: 'threadKey is required' });
    }

    return feishuConversationRepository.listRecentForThread(threadKey);
  });

  app.post('/feishu/bridge/brain-preview', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      taskType: AssembleTaskContextInput['taskType'];
      body?: string;
    };

    if (!isBrainPreviewTaskType(body.taskType)) {
      return reply.code(400).send({ message: 'invalid taskType' });
    }

    const preview = buildFeishuBridgePreview(body.employeeId, body.threadKey, body.taskType);
    if (!preview) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return preview;
  });

  app.post('/feishu/bridge/chat', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      threadKey: string;
      channelType: 'manager_dm' | 'internal_staff_group' | 'project_group';
      senderOpenId: string;
      senderRole: 'manager' | 'employee' | 'internal_staff' | 'system';
      body: string;
    };

    const employee = getEmployee(body.employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.threadKey?.trim() || !body.body?.trim()) {
      return reply.code(400).send({ message: 'threadKey and body are required' });
    }

    const taskType = classifyFeishuBridgeTaskType(body.body.trim());
    const createdAt = now().toISOString();
    feishuConversationRepository.create(
      {
        employeeId: body.employeeId,
        threadKey: body.threadKey.trim(),
        channelType: body.channelType,
        senderOpenId: body.senderOpenId,
        senderRole: body.senderRole,
        body: body.body.trim(),
        normalizedIntent: taskType,
        linkedDispatchId: null,
        linkedWorkItemId: null,
      },
      createdAt,
    );

    const preview = buildFeishuBridgePreview(body.employeeId, body.threadKey.trim(), taskType);
    if (!preview) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (shouldUseDirectFeishuReply({ taskType, body: body.body.trim() })) {
      const replyText = buildDirectFeishuReply({
        displayName: employee.displayName,
        recentDoneSummary: employee.recentDoneSummary,
        nextStepSummary: employee.nextStepSummary,
      });

      feishuConversationRepository.create(
        {
          employeeId: body.employeeId,
          threadKey: body.threadKey.trim(),
          channelType: body.channelType,
          senderOpenId: body.employeeId,
          senderRole: 'employee',
          body: replyText,
          normalizedIntent: 'direct_reply',
          linkedDispatchId: null,
          linkedWorkItemId: null,
        },
        now().toISOString(),
      );

      return {
        mode: 'direct',
        replyText,
        persistedTurns: feishuConversationRepository.listRecentForThread(body.threadKey.trim(), 6),
      };
    }

    return {
      mode: 'runtime_forward',
      employeeId: body.employeeId,
      taskType,
      personaBrief: preview.personaBrief,
      promptText: buildRuntimeForwardPrompt({
        personaBrief: preview.personaBrief,
        messageBody: body.body.trim(),
        context: preview.context,
        recentFeishuTurns: preview.recentFeishuTurns,
      }),
    };
  });

  app.get('/employees/:employeeId/work-episodes', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return workEpisodeRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/work-items', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return workItemRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/project-groups', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return listProjectGroupsWithRouteStatus(employeeId);
  });

  app.get('/employees/:employeeId/runtime-dispatches', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeDispatchRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/runtime-sessions', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeSessionRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/runtime-results', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return runtimeResultEventRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/manager-conversation', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return managerConversationMessageRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/approval-requests', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return approvalRequestRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/work-episodes', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title?: string;
      summary?: string;
      status?: string;
      blocker?: string | null;
      reasoningSummary?: string | null;
      artifactRefs?: string[];
    };

    if (!body.title?.trim() || !body.summary?.trim() || !body.status?.trim()) {
      return reply.code(400).send({ message: 'title, summary, and status are required' });
    }

    if (
      body.artifactRefs !== undefined &&
      (!Array.isArray(body.artifactRefs) || body.artifactRefs.some((artifactRef) => typeof artifactRef !== 'string'))
    ) {
      return reply.code(400).send({ message: 'artifactRefs must be a string array' });
    }

    const episode = workEpisodeRepository.create(
      {
        employeeId,
        title: body.title,
        summary: body.summary,
        status: body.status,
        blocker: body.blocker,
        reasoningSummary: body.reasoningSummary,
        artifactRefs: body.artifactRefs,
      },
      now().toISOString(),
    );

    return reply.code(201).send(episode);
  });

  app.post('/employees/:employeeId/work-items', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title?: string;
      summary?: string;
      status?: string;
    };

    if (!body.title?.trim() || !body.summary?.trim()) {
      return reply.code(400).send({ message: 'title and summary are required' });
    }

    const normalizedStatus =
      body.status === 'blocked' || body.status === 'completed' || body.status === 'active'
        ? body.status
        : 'active';

    const workItem = workItemRepository.create(
      {
        employeeId,
        title: body.title,
        summary: body.summary,
        status: normalizedStatus,
      },
      now().toISOString(),
    );

    return reply.code(201).send(workItem);
  });

  app.post('/employees/:employeeId/project-groups', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      chatId?: string;
      chatName?: string;
      status?: 'active' | 'watching' | 'archived';
      isDefault?: boolean;
      managerProxyRequired?: boolean;
    };

    if (!body.chatId?.trim() || !body.chatName?.trim()) {
      return reply.code(400).send({ message: 'chatId and chatName are required' });
    }

    const binding = projectGroupBindingRepository.create({
      employeeId,
      chatId: body.chatId.trim(),
      chatName: body.chatName.trim(),
      status: body.status,
      isDefault: body.isDefault,
      managerProxyRequired: body.managerProxyRequired,
      lastSyncedAt: now().toISOString(),
    });

    return reply.code(201).send(binding);
  });

  app.post('/employees/:employeeId/project-groups/create-bot-qa', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = ((request.body as { chatName?: string; isDefault?: boolean } | undefined) ?? {});
    const larkAuth = await larkAuthLoader();
    if (!larkAuth.openId?.trim()) {
      return reply.code(400).send({ message: 'current lark user openId is required' });
    }

    const creationResult = await larkBotProjectGroupCreator({
      employeeDisplayName: employee.displayName,
      managerOpenId: larkAuth.openId,
      chatName: body.chatName?.trim(),
    });

    const chatId =
      typeof (creationResult as { data?: { chat_id?: unknown } })?.data?.chat_id === 'string'
        ? (creationResult as { data: { chat_id: string } }).data.chat_id
        : '';
    const chatName =
      typeof (creationResult as { data?: { name?: unknown } })?.data?.name === 'string'
        ? (creationResult as { data: { name: string } }).data.name
        : body.chatName?.trim() || `RDLeader Bot QA · ${employee.displayName}`;

    if (!chatId) {
      return reply.code(400).send({
        message: 'failed to create bot project group chat',
        result: creationResult,
      });
    }

    const binding = projectGroupBindingRepository.create({
      employeeId,
      chatId,
      chatName,
      status: 'active',
      isDefault: body.isDefault ?? false,
      managerProxyRequired: false,
      lastSyncedAt: now().toISOString(),
    });

    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'create_bot_project_group',
        summary: `创建 bot 测试群：${chatName}（${chatId}）`,
        nextStepSummary: '可直接使用 bot 路线向该群发送项目推进消息',
        targetRef: chatId,
        detail: {
          chatId,
          chatName,
          managerProxyRequired: false,
          result: creationResult,
        },
      },
      now().toISOString(),
    );

    return reply.code(201).send({
      employeeId,
      binding,
      result: creationResult,
      projectOpsEvent,
    });
  });

  app.post('/employees/:employeeId/project-groups/:bindingId/enable-bot-route', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const bindingId = (request.params as { bindingId: string }).bindingId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const binding = projectGroupBindingRepository.get(bindingId);
    if (!binding || binding.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'project group binding not found' });
    }

    const larkAuth = await larkAuthLoader();
    const appId = typeof larkAuth.appId === 'string' ? larkAuth.appId.trim() : '';
    if (!appId) {
      return reply.code(400).send({ message: 'current lark appId is required' });
    }

    const inviteResult = await larkChatBotInviter({
      chatId: binding.chatId,
      appId,
    });

    const updatedBinding = projectGroupBindingRepository.updateManagerProxyRequired(
      binding.bindingId,
      false,
      now().toISOString(),
    );

    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'enable_bot_group_route',
        summary: `邀请当前 bot 入群并改用 bot 直发：${binding.chatName}（${binding.chatId}）`,
        nextStepSummary: '后续可直接使用 bot 路线向该群发送推进消息',
        targetRef: binding.chatId,
        detail: {
          chatId: binding.chatId,
          appId,
          result: inviteResult,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      binding: updatedBinding,
      result: inviteResult,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/runtime-dispatches', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId?: string;
      taskTitle?: string;
      taskBody?: string;
      taskType?: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
    };

    if (!body.taskTitle?.trim() || !body.taskBody?.trim()) {
      return reply.code(400).send({ message: 'taskTitle and taskBody are required' });
    }

    if (body.workItemId) {
      const linkedWorkItem = workItemRepository.get(body.workItemId);
      if (!linkedWorkItem || linkedWorkItem.employeeId !== employeeId) {
        return reply.code(404).send({ message: 'work item not found' });
      }
    }

    const taskType = isBrainPreviewTaskType(body.taskType) ? body.taskType : 'coding';
    const dispatched = await dispatchRuntimeTask({
      employeeId,
      workItemId: body.workItemId ?? null,
      taskTitle: body.taskTitle.trim(),
      taskBody: body.taskBody.trim(),
      taskType,
    });

    return reply.code(201).send({
      ...dispatched.dispatch,
      runtimeReceipt: dispatched.runtimeReceipt,
      brainPreview: dispatched.brainPreview,
      runtime: dispatched.runtime,
      session: dispatched.session,
    });
  });

  app.post('/employees/:employeeId/runtime/start', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const runtimeState = await ensureRuntimeRunningForEmployee(employeeId);

    return reply.code(200).send({
      ok: true,
      runtime: runtimeState.runtime,
      session: runtimeState.session,
    });
  });

  app.post('/employees/:employeeId/runtime/stop', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    await runtime.stop(employeeId);
    const heartbeat = await runtime.heartbeat(employeeId);
    const existingSession = runtimeSessionRepository.latestActiveForEmployee(employeeId);
    const session = existingSession ? runtimeSessionRepository.stopSession(existingSession.sessionId, now().toISOString()) : undefined;

    return reply.code(200).send({
      ok: true,
      runtime: heartbeat,
      session: session ?? null,
    });
  });

  app.post('/employees/:employeeId/project-groups/:bindingId/status', async (request, reply) => {
    const { employeeId, bindingId } = request.params as { employeeId: string; bindingId: string };
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as { status?: 'active' | 'watching' | 'archived' };
    if (body.status !== 'active' && body.status !== 'watching' && body.status !== 'archived') {
      return reply.code(400).send({ message: 'status must be active, watching, or archived' });
    }

    const existing = projectGroupBindingRepository.get(bindingId);
    if (!existing || existing.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'project group binding not found' });
    }

    return projectGroupBindingRepository.updateStatus(bindingId, body.status, now().toISOString());
  });

  app.post('/employees/:employeeId/project-groups/:bindingId/default', async (request, reply) => {
    const { employeeId, bindingId } = request.params as { employeeId: string; bindingId: string };
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const existing = projectGroupBindingRepository.get(bindingId);
    if (!existing || existing.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'project group binding not found' });
    }

    return projectGroupBindingRepository.setDefault(bindingId);
  });

  app.post('/employees/:employeeId/actions/collect-runtime-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    if (!getEmployee(employeeId)) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const events = await collectEmployeeRuntimeEvents(employeeId);
    if (!events) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reply.code(200).send({
      ok: true,
      count: events.length,
      events,
    });
  });

  app.get('/employees/:employeeId/autonomy-settings', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return autonomySettingsRepository.getOrCreate(employeeId, now().toISOString());
  });

  app.post('/employees/:employeeId/autonomy-settings', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      enabled?: boolean;
      cadenceHours?: number;
      autoPromoteToDirectionKnowledge?: boolean;
      nextRunAt?: string | null;
    };

    if (body.cadenceHours !== undefined && (!Number.isInteger(body.cadenceHours) || body.cadenceHours <= 0)) {
      return reply.code(400).send({ message: 'cadenceHours must be a positive integer' });
    }

    return autonomySettingsRepository.update(
      employeeId,
      {
        enabled: body.enabled,
        cadenceHours: body.cadenceHours,
        autoPromoteToDirectionKnowledge: body.autoPromoteToDirectionKnowledge,
        nextRunAt: body.nextRunAt,
      },
      now().toISOString(),
    );
  });

  app.get('/employees/:employeeId/autonomous-learning-runs', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = getEmployee(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return autonomousLearningRunRepository.listForEmployee(employeeId);
  });

  app.get('/employees/:employeeId/feishu-bot-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const larkAuth = await larkAuthLoader();
    const feishuProfile = employeeProfile?.feishuProfile ?? employee.feishuProfile;

    return {
      employeeId: employee.employeeId,
      botName: feishuProfile.botName ?? employee.displayName,
      dmPolicy: feishuProfile.dmPolicy ?? 'manager-only',
      managerOpenId: feishuProfile.managerOpenId ?? larkAuth.openId,
      groupPolicy: 'allowlist',
      requireMention: feishuProfile.chatMode ? feishuProfile.chatMode === 'mention' : true,
      bindingStatus: feishuProfile.bindingStatus ?? 'unbound',
      appId: feishuProfile.appId,
      botOpenId: feishuProfile.botOpenId,
      appSecretRef: feishuProfile.appSecretRef,
      agentSource: feishuProfile.agentSource ?? 'larklink',
      bindId: feishuProfile.bindId,
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      configPath: buildEmployeeLarklinkConfigPath(employeeId),
      statusCommand: buildFeishuAgentStatusCommand(employeeId),
      stopCommand: buildFeishuAgentStopCommand(employeeId),
      canJoinProjectGroups: true,
      runtimeKind: employee.runtimeKind,
      workspacePath: employee.workspacePath,
    };
  });

  app.get('/employees/:employeeId/feishu-agent/setup-plan', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return {
      employeeId: employee.employeeId,
      botName: employee.displayName,
      setupMode: 'larklink-daemon',
      daemonHomePath: buildEmployeeLarklinkHome(employee.employeeId),
      configPath: buildEmployeeLarklinkConfigPath(employee.employeeId),
      recommendedAgentId: EMPLOYEE_LARKLINK_BRIDGE_AGENT_ID,
      launchMode: 'nobind-dedicated-bot',
      requiredCapabilities: ['bot', 'im.message.receive_v1', 'im:message:send_as_bot'],
      createCommand: buildFeishuAgentCreateCommand(employee.employeeId),
      bindCommandPreview: buildFeishuAgentBindCommandPreview(employee.employeeId),
      launchCommand: buildFeishuAgentStartCommand(employee.employeeId),
      statusCommand: buildFeishuAgentStatusCommand(employee.employeeId),
      stopCommand: buildFeishuAgentStopCommand(employee.employeeId),
    };
  });

  app.post('/employees/:employeeId/feishu-agent/onboarding/begin', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    try {
      const session = await beginFeishuAgentOnboarding();
      const createdAt = now().toISOString();
      const persisted = feishuAgentOnboardingSessionRepository.upsert({
        employeeId,
        domain: session.domain,
        verificationUrl: session.verificationUrl,
        deviceCode: session.deviceCode,
        qrImagePath: session.qrImagePath ?? null,
        qrDataUrl: session.qrDataUrl ?? null,
        expiresAt: new Date(Date.now() + session.expiresIn * 1000).toISOString(),
        createdAt,
      });
      return {
        ...session,
        sessionId: persisted.sessionId,
        createdAt,
      };
    } catch (error) {
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'failed to begin employee agent onboarding',
      });
    }
  });

  app.get('/employees/:employeeId/feishu-agent/onboarding-session', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const session = feishuAgentOnboardingSessionRepository.getByEmployee(employeeId);
    if (!session) {
      return reply.code(404).send({ message: 'no active onboarding session' });
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      feishuAgentOnboardingSessionRepository.deleteByEmployee(employeeId);
      return reply.code(404).send({ message: 'onboarding session expired' });
    }

    return session;
  });

  app.post('/employees/:employeeId/feishu-agent/onboarding/complete', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      deviceCode?: string;
      timeoutSeconds?: number;
      chatMode?: 'mention' | 'all';
    };

    const session = feishuAgentOnboardingSessionRepository.getByEmployee(employeeId);
    const resolvedDeviceCode = body.deviceCode?.trim() || session?.deviceCode || '';
    if (!resolvedDeviceCode) {
      return reply.code(400).send({ message: 'deviceCode is required' });
    }

    const larkAuth = await larkAuthLoader();
    const managerOpenId = larkAuth.openId?.trim();
    if (!managerOpenId) {
      return reply.code(400).send({ message: 'current lark manager openId is required' });
    }

    const completed = await completeFeishuAgentOnboarding({
      employeeId,
      managerOpenId,
      deviceCode: resolvedDeviceCode,
      timeoutSeconds: body.timeoutSeconds,
    });

    if (!completed.ok) {
      if (completed.message.includes('取消') || completed.message.includes('过期')) {
        feishuAgentOnboardingSessionRepository.deleteByEmployee(employeeId);
      }
      return reply.code(400).send({ message: completed.message });
    }

    const chatMode = body.chatMode === 'all' ? 'all' : 'mention';
    const nextFeishuProfile = {
      ...employeeProfile.feishuProfile,
      botName: completed.botName ?? employee.displayName,
      botOpenId: completed.botOpenId ?? 'pending',
      dmPolicy: 'manager-only' as const,
      bindingStatus: 'bound' as const,
      appId: completed.appId,
      appSecretRef: completed.appSecretRef,
      managerOpenId,
      chatMode,
      identityPreset: 'bot-only' as const,
      agentSource: 'larklink' as const,
      setupProfileName: `rdleader-${employee.employeeId}`,
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      lastBoundAt: now().toISOString(),
    };

    employeeProfileRepository.updateFeishuProfile(employeeId, nextFeishuProfile);
    feishuAgentOnboardingSessionRepository.deleteByEmployee(employeeId);
    const configMaterialization = await writeEmployeeLarklinkConfig({
      employeeId,
      appId: completed.appId,
      appSecretRef: completed.appSecretRef,
      chatMode,
    });

    return {
      employeeId,
      bindingStatus: 'bound',
      appId: completed.appId,
      appSecretRef: completed.appSecretRef,
      botOpenId: completed.botOpenId,
      botName: completed.botName ?? employee.displayName,
      managerOpenId,
      chatMode,
      dmPolicy: 'manager-only',
      agentSource: 'larklink',
      configPath: buildEmployeeLarklinkConfigPath(employeeId),
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      statusCommand: buildFeishuAgentStatusCommand(employeeId),
      stopCommand: buildFeishuAgentStopCommand(employeeId),
      configMaterialized: configMaterialization.ok,
      configMaterializationMessage: configMaterialization.ok
        ? `已写入员工独立 LarkLink 配置：${configMaterialization.configPath}`
        : configMaterialization.reason,
      onboarding: {
        deviceCode: body.deviceCode.trim(),
        pollCount: completed.pollCount,
        domain: completed.domain,
      },
    };
  });

  app.post('/employees/:employeeId/feishu-agent/bind', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      appId?: string;
      appSecretRef?: string;
      botOpenId?: string;
      managerOpenId?: string;
      chatMode?: 'mention' | 'all';
    };

    const appId = typeof body.appId === 'string' ? body.appId.trim() : '';
    const botOpenId = typeof body.botOpenId === 'string' ? body.botOpenId.trim() : '';
    const managerOpenId = typeof body.managerOpenId === 'string' ? body.managerOpenId.trim() : '';
    const appSecretRef = typeof body.appSecretRef === 'string' ? body.appSecretRef.trim() : '';
    const chatMode = body.chatMode === 'all' ? 'all' : body.chatMode === 'mention' ? 'mention' : undefined;

    if (!appId || !botOpenId || !managerOpenId) {
      return reply.code(400).send({ message: 'appId, botOpenId, and managerOpenId are required' });
    }

    if (!chatMode) {
      return reply.code(400).send({ message: 'chatMode must be mention or all' });
    }

    const nextFeishuProfile = {
      ...employeeProfile.feishuProfile,
      botName: employee.displayName,
      botOpenId,
      dmPolicy: 'manager-only' as const,
      bindingStatus: 'bound' as const,
      appId,
      appSecretRef,
      managerOpenId,
      chatMode,
      identityPreset: 'bot-only' as const,
      agentSource: 'larklink' as const,
      setupProfileName: `rdleader-${employee.employeeId}`,
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      lastBoundAt: now().toISOString(),
    };

    employeeProfileRepository.updateFeishuProfile(employeeId, nextFeishuProfile);

    const configMaterialization = await writeEmployeeLarklinkConfig({
      employeeId,
      appId,
      appSecretRef: appSecretRef || '',
      chatMode,
    });

    return {
      employeeId,
      bindingStatus: 'bound',
      appId,
      appSecretRef,
      botOpenId,
      managerOpenId,
      chatMode,
      dmPolicy: 'manager-only',
      agentSource: 'larklink',
      configPath: buildEmployeeLarklinkConfigPath(employeeId),
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      statusCommand: buildFeishuAgentStatusCommand(employeeId),
      stopCommand: buildFeishuAgentStopCommand(employeeId),
      bindCommand: buildFeishuAgentStartCommand(employeeId),
      configMaterialized: configMaterialization.ok,
      configMaterializationMessage: configMaterialization.ok
        ? `已写入员工独立 LarkLink 配置：${configMaterialization.configPath}`
        : configMaterialization.reason,
    };
  });

  app.get('/employees/:employeeId/feishu-agent/runtime-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const status = await getEmployeeLarklinkStatus(employeeId);
    return {
      employeeId,
      configPath: buildEmployeeLarklinkConfigPath(employeeId),
      launchCommand: buildFeishuAgentStartCommand(employeeId),
      statusCommand: buildFeishuAgentStatusCommand(employeeId),
      stopCommand: buildFeishuAgentStopCommand(employeeId),
      bindingStatus: employeeProfile.feishuProfile.bindingStatus ?? 'unbound',
      configured: Boolean(employeeProfile.feishuProfile.appId && employeeProfile.feishuProfile.botOpenId),
      agentSource: employeeProfile.feishuProfile.agentSource ?? 'larklink',
      daemon: status,
    };
  });

  app.post('/employees/:employeeId/feishu-agent/start', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    const employeeProfile = employeeProfileRepository.get(employeeId);

    if (!employee || !employeeProfile) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!employeeProfile.feishuProfile.appId || !employeeProfile.feishuProfile.botOpenId) {
      return reply.code(400).send({ message: 'employee feishu agent is not fully bound yet' });
    }

    try {
      if (employeeProfile.feishuProfile.appSecretRef) {
        await writeEmployeeLarklinkConfig({
          employeeId,
          appId: employeeProfile.feishuProfile.appId,
          appSecretRef: employeeProfile.feishuProfile.appSecretRef,
          chatMode: employeeProfile.feishuProfile.chatMode ?? 'mention',
        }).catch(() => undefined);
      }
      const started = await startEmployeeLarklinkDaemon(employeeId);
      return {
        ok: true,
        employeeId,
        launchCommand: buildFeishuAgentStartCommand(employeeId),
        result: started,
      };
    } catch (error) {
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'failed to start employee larklink daemon',
      });
    }
  });

  app.post('/employees/:employeeId/feishu-agent/stop', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    try {
      const stopped = await stopEmployeeLarklinkDaemon(employeeId);
      return {
        ok: true,
        employeeId,
        stopCommand: buildFeishuAgentStopCommand(employeeId),
        result: stopped,
      };
    } catch (error) {
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'failed to stop employee larklink daemon',
      });
    }
  });

  app.get('/employees/:employeeId/project-ops-preview', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const integrationStatus = await integrationStatusLoader();
    const meegoAuth = await meegoAuthLoader();
    return {
      employeeId: employee.employeeId,
      managerProxyRequired: true,
      bytedcliReady: integrationStatus.bytedcli === 'ready',
      meegoAuthenticated: meegoAuth.authenticated,
      recommendedCommands: [
        'bytedcli --json meego status',
        'bytedcli meego config --tenant dcar',
        'bytedcli meego workitem --help',
      ],
      workflow: [
        '员工在群里推进项目与技术方案',
        '老板代理参加需求评审会议',
        '会议结论回填给员工继续推进',
      ],
    };
  });

  app.post('/chat/internal-message', async (request) => {
    const body = request.body as {
      senderEmployeeId: string;
      recipientEmployeeId: string;
      body: string;
    };

    messageRepository.create({
      senderEmployeeId: body.senderEmployeeId,
      recipientEmployeeId: body.recipientEmployeeId,
      body: body.body,
    });

    return {
      ok: true,
      message: {
        senderEmployeeId: body.senderEmployeeId,
        recipientEmployeeId: body.recipientEmployeeId,
        body: body.body,
      },
    };
  });

  app.get('/employees/:employeeId/internal-messages', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return messageRepository.listForEmployee(employeeId);
  });

  app.post('/chat/manager-message', async (request, reply) => {
    const body = request.body as {
      employeeId: string;
      body: string;
    };

    const employee = getEmployee(body.employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.body?.trim()) {
      return reply.code(400).send({ message: 'body is required' });
    }

    const taskType = classifyManagerChatTaskType(body.body);
    const createdAt = now().toISOString();
    const managerMessage = managerConversationMessageRepository.create(
      {
        employeeId: body.employeeId,
        role: 'manager',
        body: body.body.trim(),
        taskType,
        artifactRefs: extractArtifactRefsFromBody(body.body),
      },
      createdAt,
    );
    const approvalGateReply = buildApprovalGateManagerReply(body.employeeId, body.body.trim());
    if (approvalGateReply === undefined) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const generatedReply =
      approvalGateReply ??
      (await createPendingRuntimeManagerReply(body.employeeId, body.body.trim()));

    if (!generatedReply) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const employeeReply = managerConversationMessageRepository.create(
      {
        messageId: typeof (generatedReply as { messageId?: unknown }).messageId === 'string'
          ? ((generatedReply as { messageId: string }).messageId)
          : undefined,
        employeeId: body.employeeId,
        role: 'employee',
        body: generatedReply.body,
        taskType: generatedReply.taskType,
        reasoningSummary: generatedReply.reasoningSummary,
        artifactRefs: generatedReply.artifactRefs,
        approvalRequired: generatedReply.approvalRequired,
        approvalSummary: generatedReply.approvalSummary,
      },
      createdAt,
    );

    if (generatedReply.approvalRequired) {
      approvalRequestRepository.create(
        {
          employeeId: body.employeeId,
          sourceMessageId: managerMessage.messageId,
          summary: managerMessage.body,
          riskLevel: 'high',
          approvalSummary: generatedReply.approvalSummary,
        },
        createdAt,
      );
    }

    if (
      Boolean((generatedReply as { replyPending?: boolean }).replyPending) &&
      typeof (generatedReply as { dispatchId?: unknown }).dispatchId === 'string'
    ) {
      startBackgroundManagerReplyResolution(body.employeeId, (generatedReply as { dispatchId: string }).dispatchId);
    }

    return {
      ok: true,
      message: managerMessage,
      reply: employeeReply,
      replyPending: Boolean((generatedReply as { replyPending?: boolean }).replyPending),
      dispatchId:
        typeof (generatedReply as { dispatchId?: unknown }).dispatchId === 'string'
          ? ((generatedReply as { dispatchId: string }).dispatchId)
          : null,
    };
  });

  app.post('/approval-requests/:requestId/decision', async (request, reply) => {
    const { requestId } = request.params as { requestId: string };
    const body = request.body as {
      decision?: unknown;
      approvalSummary?: string | null;
    };

    if (body.decision !== 'approved' && body.decision !== 'rejected') {
      return reply.code(400).send({ message: 'decision must be approved or rejected' });
    }

    const approvalRequest = approvalRequestRepository.get(requestId);
    if (!approvalRequest) {
      return reply.code(404).send({ message: 'approval request not found' });
    }

    if (approvalRequest.status !== 'pending') {
      return reply.code(409).send({ message: 'approval request already resolved' });
    }

    return approvalRequestRepository.decide(
      requestId,
      {
        status: body.decision,
        approvalSummary: body.approvalSummary,
      },
      now().toISOString(),
    );
  });

  app.post('/work-items/:workItemId/status', async (request, reply) => {
    const { workItemId } = request.params as { workItemId: string };
    const body = request.body as { status?: string };

    if (body.status !== 'active' && body.status !== 'blocked' && body.status !== 'completed') {
      return reply.code(400).send({ message: 'status must be active, blocked, or completed' });
    }

    const existing = workItemRepository.get(workItemId);
    if (!existing) {
      return reply.code(404).send({ message: 'work item not found' });
    }

    return workItemRepository.updateStatus(workItemId, body.status, now().toISOString());
  });

  app.post('/hr/candidates', async (request, reply) => {
    const body = request.body as {
      name: string;
      interviewNotes: string;
    };

    const candidate = candidateRepository.create(body);
    candidateLifecycleRepository.create(
      {
        candidateId: candidate.candidateId,
        eventType: 'candidate_created',
        status: candidate.status,
        summary: candidate.interviewNotes.trim()
          ? `创建候选人档案：${candidate.name}。初始面试备注：${candidate.interviewNotes.trim()}`
          : `创建候选人档案：${candidate.name}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send({ ok: true, candidate });
  });

  app.get('/hr/candidates', async () => candidateRepository.list());

  app.post('/hr/candidates/:candidateId/interviews', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as {
      stage?: string;
      scheduledAt?: string;
      summary?: string;
      recommendation?: 'hire' | 'hold' | 'reject';
    };

    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (!body.stage?.trim() || !body.scheduledAt?.trim() || !body.summary?.trim()) {
      return reply.code(400).send({ message: 'stage, scheduledAt, and summary are required' });
    }

    if (body.recommendation !== 'hire' && body.recommendation !== 'hold' && body.recommendation !== 'reject') {
      return reply.code(400).send({ message: 'recommendation must be hire, hold, or reject' });
    }

    const interview = interviewRepository.create({
      candidateId,
      stage: body.stage.trim(),
      scheduledAt: body.scheduledAt.trim(),
      summary: body.summary.trim(),
      recommendation: body.recommendation,
    });
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'interview_recorded',
        status: candidate.status,
        summary: `记录 ${interview.stage} 面试，建议 ${interview.recommendation}：${interview.summary}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send(interview);
  });

  app.get('/hr/candidates/:candidateId/interviews', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    return interviewRepository.listForCandidate(candidateId);
  });

  app.get('/hr/candidates/:candidateId/lifecycle', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    return candidateLifecycleRepository.listForCandidate(candidateId);
  });

  app.post('/hr/candidates/:candidateId/decision', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as { status?: 'offered' | 'rejected' };
    const candidate = candidateRepository.get(candidateId);

    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (body.status !== 'offered' && body.status !== 'rejected') {
      return reply.code(400).send({ message: 'status must be offered or rejected' });
    }

    candidateRepository.updateStatus(candidateId, body.status);
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'decision_updated',
        status: body.status,
        summary: `更新招聘决策为 ${body.status}`,
      },
      now().toISOString(),
    );
    return {
      ok: true,
      candidateId,
      status: body.status,
    };
  });

  app.post('/hr/candidates/:candidateId/convert-to-employee', async (request, reply) => {
    const { candidateId } = request.params as { candidateId: string };
    const body = request.body as {
      employeeId?: string;
      directionId?: string;
      level?: '1-2' | '2-1' | '2-2';
    };

    const candidate = candidateRepository.get(candidateId);
    if (!candidate) {
      return reply.code(404).send({ message: 'candidate not found' });
    }

    if (!body.employeeId?.trim() || !body.directionId?.trim()) {
      return reply.code(400).send({ message: 'employeeId and directionId are required' });
    }

    if (interviewRepository.listForCandidate(candidateId).length === 0) {
      return reply.code(400).send({ message: 'candidate must have at least one interview before hiring' });
    }

    if (candidate.status !== 'offered') {
      return reply.code(400).send({ message: 'candidate must be offered before hiring' });
    }

    if (employeeRepository.get(body.employeeId)) {
      return reply.code(409).send({ message: 'employee already exists' });
    }

    const directionConfig = directionConfigRepository.get(body.directionId);
    if (!directionConfig) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    const employeeRow = buildDefaultEmployeeRow({
      employeeId: body.employeeId.trim(),
      displayName: candidate.name,
      level: body.level ?? '1-2',
      directionId: body.directionId.trim(),
    });
    employeeRepository.create(employeeRow);
    employeeProfileRepository.create(
      buildDefaultEmployeeProfile({
        employeeId: employeeRow.employeeId,
        displayName: employeeRow.displayName,
        managerId: 'boss',
      }),
    );
    workItemRepository.create(
      {
        employeeId: employeeRow.employeeId,
        title: '完成入职熟悉',
        summary: '熟悉团队方向、知识库与开发流程',
        status: 'active',
      },
      now().toISOString(),
    );
    candidateRepository.updateStatus(candidateId, 'hired');
    candidateLifecycleRepository.create(
      {
        candidateId,
        eventType: 'candidate_hired',
        status: 'hired',
        summary: `录用为员工 ${employeeRow.employeeId}，方向 ${employeeRow.directionId}，职级 ${employeeRow.level}`,
      },
      now().toISOString(),
    );

    return reply.code(201).send({
      ok: true,
      candidateId,
      employee: {
        employeeId: employeeRow.employeeId,
        displayName: employeeRow.displayName,
        level: employeeRow.level,
        directionId: employeeRow.directionId,
        defaultKnowledgeBaseIds: directionConfig.defaultKnowledgeBaseIds,
      },
    });
  });

  app.post('/employees/:employeeId/level', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { level: '1-2' | '2-1' | '2-2' };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateLevel(employeeId, body.level);
    return { ok: true, employeeId, level: body.level };
  });

  app.post('/employees/:employeeId/employment-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { employmentStatus: 'candidate' | 'active' | 'probation' | 'resigned' | 'fired' };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateEmploymentStatus(employeeId, body.employmentStatus);
    return { ok: true, employeeId, employmentStatus: body.employmentStatus };
  });

  app.post('/employees/:employeeId/direction', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const body = request.body as { directionId?: string };
    const employee = employeeRepository.get(employeeId);

    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    if (!body.directionId?.trim()) {
      return reply.code(400).send({ message: 'directionId is required' });
    }

    const directionConfig = directionConfigRepository.get(body.directionId);
    if (!directionConfig) {
      return reply.code(404).send({ message: 'direction config not found' });
    }

    employeeRepository.updateDirection(employeeId, body.directionId);
    return {
      ok: true,
      employeeId,
      directionId: body.directionId,
      directionConfig,
    };
  });

  app.post('/employees/:employeeId/actions/send-manager-dm', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      body: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const larkAuth = await larkAuthLoader();
    const command = buildManagerDmCommand({
      managerOpenId: larkAuth.openId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        managerOpenId: larkAuth.openId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        managerOpenId: larkAuth.openId,
        command,
      });
    }

    const result = await larkManagerDmSender({
      employeeId,
      feishuProfile: getEmployeeProfile(employeeId)?.feishuProfile,
      managerOpenId: larkAuth.openId,
      employeeDisplayName: employee.displayName,
      body: body.body,
    });

    return {
      mode: 'executed',
      employeeId,
      managerOpenId: larkAuth.openId,
      result,
    };
  });

  app.post('/employees/:employeeId/actions/send-group-message', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      chatId: string;
      body: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    let binding = projectGroupBindingRepository
      .listForEmployee(employeeId)
      .find((item) => item.chatId === body.chatId);
    let preferredIdentity: 'bot' | 'user' = binding?.managerProxyRequired ? 'user' : 'bot';

    if (binding?.managerProxyRequired && autoRepairGroupRoute) {
      const larkAuth = await larkAuthLoader();
      const inspectedBinding = await enrichProjectGroupBindingRouteStatus(binding, {
        botOpenId: larkAuth.botOpenId,
        chatBotsLoader: larkChatBotsLoader,
      });
      if (inspectedBinding.currentBotInChat === true) {
        binding = projectGroupBindingRepository.updateManagerProxyRequired(
          binding.bindingId,
          false,
          now().toISOString(),
        );
        preferredIdentity = 'bot';
      }
    }
    const command = buildGroupMessageCommand({
      chatId: body.chatId,
      employeeDisplayName: employee.displayName,
      body: body.body,
      identity: preferredIdentity,
    });

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        chatId: body.chatId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        chatId: body.chatId,
        command,
      });
    }

    let result: unknown;
    let identityUsed: 'bot' | 'user' = preferredIdentity;
    let autoRepairedBotRoute = false;
    let updatedBinding = binding;
    let repairEvent: unknown = null;
    let autoRepairFailureResponse: { statusCode: number; payload: Record<string, unknown> } | null = null;

    const canAutoRepairToBotRoute = autoRepairGroupRoute && Boolean(updatedBinding) && !isDemoPlaceholderChatId(body.chatId);
    const attemptAutoRepairToBotRoute = async (failureMessage: string) => {
      if (!canAutoRepairToBotRoute) {
        return false;
      }

      const larkAuth = await larkAuthLoader();
      const appId = typeof larkAuth.appId === 'string' ? larkAuth.appId.trim() : '';
      if (!appId) {
        return false;
      }

      let inviteResult: unknown;
      try {
        inviteResult = await larkChatBotInviter({
          chatId: body.chatId,
          appId,
        });
      } catch (error) {
        const inviteFailure = extractCliErrorMessage(error, '邀请当前 bot 入群失败');
        autoRepairFailureResponse = {
          statusCode: 403,
          payload: {
            message: `${failureMessage}；自动修复失败：${inviteFailure.message}`,
            identityUsed,
            result,
            autoRepairAttempted: true,
            repairError: inviteFailure.parsed ?? { message: inviteFailure.message },
            binding: updatedBinding,
          },
        };
        return false;
      }

      updatedBinding = projectGroupBindingRepository.updateManagerProxyRequired(
        updatedBinding!.bindingId,
        false,
        now().toISOString(),
      );
      repairEvent = projectOpsEventRepository.create(
        {
          employeeId,
          actionKey: 'enable_bot_group_route',
          summary: `邀请当前 bot 入群并改用 bot 直发：${updatedBinding?.chatName ?? body.chatId}（${body.chatId}）`,
          nextStepSummary: '后续可直接使用 bot 路线向该群发送推进消息',
          targetRef: body.chatId,
          detail: {
            chatId: body.chatId,
            appId,
            result: inviteResult,
          },
        },
        now().toISOString(),
      );
      result = await larkGroupMessageSender({
        feishuProfile: getEmployeeProfile(employeeId)?.feishuProfile,
        chatId: body.chatId,
        employeeDisplayName: employee.displayName,
        body: body.body,
        identity: 'bot',
      } as {
        chatId: string;
        employeeDisplayName: string;
        body: string;
        identity: 'bot' | 'user';
      });
      identityUsed = 'bot';
      autoRepairedBotRoute = true;
      return true;
    };

    try {
      result = await larkGroupMessageSender({
        feishuProfile: getEmployeeProfile(employeeId)?.feishuProfile,
        chatId: body.chatId,
        employeeDisplayName: employee.displayName,
        body: body.body,
        identity: preferredIdentity,
      } as {
        chatId: string;
        employeeDisplayName: string;
        body: string;
        identity: 'bot' | 'user';
      });
    } catch (error) {
      if (preferredIdentity === 'bot') {
        const botFailure = extractCliErrorMessage(error, 'bot route failed');
        if (botFailure.message.includes('Bot/User can NOT be out of the chat')) {
          result = botFailure.parsed ?? {
            ok: false,
            error: {
              type: 'api',
              message: botFailure.message,
            },
          };
        } else {
          result = await larkGroupMessageSender({
            feishuProfile: getEmployeeProfile(employeeId)?.feishuProfile,
            chatId: body.chatId,
            employeeDisplayName: employee.displayName,
            body: body.body,
            identity: 'user',
          } as {
            chatId: string;
            employeeDisplayName: string;
            body: string;
            identity: 'bot' | 'user';
          });
          identityUsed = 'user';
        }
      } else {
        throw error;
      }
    }

    if ((result as { ok?: boolean })?.ok === false && preferredIdentity === 'bot') {
      const botFailurePayload = result as {
        error?: {
          message?: string;
          hint?: string;
        };
      };
      const botFailureMessage = `${botFailurePayload.error?.message ?? ''} ${botFailurePayload.error?.hint ?? ''}`.trim();
      const repaired = botFailureMessage.includes('Bot/User can NOT be out of the chat')
        ? await attemptAutoRepairToBotRoute(botFailureMessage)
        : false;
      if (autoRepairFailureResponse) {
        return reply.code(autoRepairFailureResponse.statusCode).send(autoRepairFailureResponse.payload);
      }
      if (!repaired) {
        result = await larkGroupMessageSender({
          feishuProfile: getEmployeeProfile(employeeId)?.feishuProfile,
          chatId: body.chatId,
          employeeDisplayName: employee.displayName,
          body: body.body,
          identity: 'user',
        } as {
          chatId: string;
          employeeDisplayName: string;
          body: string;
          identity: 'bot' | 'user';
        });
        identityUsed = 'user';
      }
    }

    const errorPayload =
      (result as { ok?: boolean; error?: { type?: string; message?: string; hint?: string } })?.ok === false
        ? (result as { ok?: boolean; error?: { type?: string; message?: string; hint?: string } })
        : null;
    const errorMessage = `${errorPayload?.error?.message ?? ''} ${errorPayload?.error?.hint ?? ''}`.trim();
    const shouldAttemptAutoRepair =
      autoRepairGroupRoute &&
      Boolean(updatedBinding) &&
      !isDemoPlaceholderChatId(body.chatId) &&
      Boolean(errorPayload) &&
      errorPayload?.error?.type === 'authorization' &&
      errorMessage.includes('im:message.send_as_user');

    if (shouldAttemptAutoRepair) {
      await attemptAutoRepairToBotRoute(errorMessage);
      if (autoRepairFailureResponse) {
        return reply.code(autoRepairFailureResponse.statusCode).send(autoRepairFailureResponse.payload);
      }
    }

    if ((result as { ok?: boolean })?.ok === false) {
      const failedPayload = result as {
        identity?: string;
        error?: {
          type?: string;
          message?: string;
          hint?: string;
        };
      };
      const baseMessage = failedPayload.error?.message ?? '群消息发送失败';
      const message = failedPayload.error?.hint ? `${baseMessage} ${failedPayload.error.hint}` : baseMessage;
      const statusCode = failedPayload.error?.type === 'authorization' ? 403 : 400;
      return reply.code(statusCode).send({
        message,
        identityUsed,
        result,
        autoRepairedBotRoute,
        binding: updatedBinding,
        repairEvent,
      });
    }

    const deliveredBody =
      typeof (result as { data?: { body?: string } })?.data?.body === 'string'
        ? (result as { data: { body: string } }).data.body
        : `【RDLeader·${employee.displayName}】${body.body}`;

    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'send_group_message',
        summary: `向项目群 ${body.chatId} 发送推进消息：${body.body}`,
        nextStepSummary: '等待群内反馈并继续推进排期或评审安排',
        targetRef: body.chatId,
        detail: {
          chatId: body.chatId,
          body: body.body,
          identityUsed,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      chatId: body.chatId,
      binding: updatedBinding,
      result: {
        raw: result,
        deliveredBody,
        identityUsed,
        autoRepairedBotRoute,
      },
      repairEvent,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/refresh-meego-status', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const meego = await meegoAuthLoader();
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'refresh_meego_status',
        summary: `刷新 Meego 状态：${meego.authenticated ? 'authenticated' : 'missing'} / ${meego.toolCount} tools`,
        nextStepSummary: '根据认证状态继续查询或更新工作项',
        targetRef: meego.endpoint,
        detail: {
          meego,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      meego,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-workitem-lookup', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      lookupType: 'id' | 'title';
      query: string;
      projectKey?: string;
      dryRun?: boolean;
    };

    const command = buildMeegoWorkitemLookupCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    const result = await meegoWorkitemLookup(body);
    const firstItem = result?.items?.[0];
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_workitem_lookup',
        summary: firstItem
          ? `查询 Meego 工作项：${body.query} -> ${firstItem.id} ${firstItem.title}`
          : `查询 Meego 工作项：${body.query}`,
        nextStepSummary: '确认是否需要补充评论、更新字段或同步到项目群',
        targetRef:
          typeof firstItem?.id === 'string'
            ? firstItem.id
            : body.query,
        detail: {
          lookupType: body.lookupType,
          query: body.query,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-workitem-update', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId: string;
      projectKey: string;
      fields: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildMeegoWorkitemUpdateCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        command,
      });
    }

    const result = await meegoWorkitemUpdate(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_workitem_update',
        summary: `更新 Meego 工作项 ${body.workItemId} 字段`,
        nextStepSummary: '继续跟进字段变更后的排期或负责人确认',
        targetRef: body.workItemId,
        detail: {
          projectKey: body.projectKey,
          fields: body.fields,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/meego-comment-create', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      workItemId: string;
      projectKey: string;
      commentContent: string;
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildMeegoCommentCreateCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        command,
      });
    }

    const result = await meegoCommentCreate(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'meego_comment_create',
        summary: `在 Meego 工作项 ${body.workItemId} 下评论：${body.commentContent}`,
        nextStepSummary: '等待相关方回复并继续推进工作项处理',
        targetRef: body.workItemId,
        detail: {
          projectKey: body.projectKey,
          commentContent: body.commentContent,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/create-tech-review-doc', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      title: string;
      problem: string;
      nextSteps: string[];
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildTechReviewDocCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        title: body.title,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        title: body.title,
        command,
      });
    }

    const result = await larkDocCreator(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'create_tech_review_doc',
        summary: `创建技术评审文档：${body.title}`,
        nextStepSummary: '将文档同步到项目群并推动相关方确认评审范围',
        targetRef: body.title,
        detail: {
          problem: body.problem,
          nextSteps: body.nextSteps,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/schedule-tech-review', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      summary: string;
      description: string;
      start: string;
      end: string;
      attendeeIds: string[];
      dryRun?: boolean;
      approved?: boolean;
    };
    const command = buildTechReviewMeetingCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        summary: body.summary,
        command,
      };
    }

    if (requiresApproval({ kind: 'mutate-external', target: 'external-system' }) && !body.approved) {
      return reply.code(403).send({
        error: 'approval_required',
        employeeId,
        summary: body.summary,
        command,
      });
    }

    const result = await larkCalendarEventCreator(body);
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'schedule_tech_review',
        summary: `发起技术评审会议：${body.summary}`,
        nextStepSummary: '推动参会人确认时间并准备会前材料',
        targetRef: body.summary,
        detail: {
          description: body.description,
          start: body.start,
          end: body.end,
          attendeeIds: body.attendeeIds,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      mode: 'executed',
      employeeId,
      result,
      projectOpsEvent,
    };
  });

  app.post('/employees/:employeeId/actions/find-project-chat', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      query: string;
      dryRun?: boolean;
    };

    const command = buildFeishuChatSearchCommand(body);

    if (body.dryRun ?? false) {
      return {
        mode: 'dry-run',
        employeeId,
        command,
      };
    }

    const result = await feishuChatSearch(body);
    const chats = Array.isArray(result?.data?.chats) ? result.data.chats : Array.isArray(result?.chats) ? result.chats : [];
    const firstChat = chats[0];
    const projectOpsEvent = projectOpsEventRepository.create(
      {
        employeeId,
        actionKey: 'find_project_chat',
        summary: firstChat
          ? `查找项目群：${body.query} -> ${firstChat.name}（${firstChat.chatId}）`
          : `查找项目群：${body.query}`,
        nextStepSummary: '确认目标项目群后绑定为默认群或继续发送推进消息',
        targetRef: typeof firstChat?.chatId === 'string' ? firstChat.chatId : body.query,
        detail: {
          query: body.query,
          result,
        },
      },
      now().toISOString(),
    );

    return {
      employeeId,
      result: {
        ...result,
        chats,
      },
      projectOpsEvent,
    };
  });

  app.get('/employees/:employeeId/project-ops-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return projectOpsEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/reflections/refresh', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const memory = await memoryLoader(employeeId as 'lushirong' | 'zhouyongkang');
    const summary =
      memory.length > 0
        ? '围绕导流推进形成了一次新的反思'
        : '围绕当前工作形成了一次新的反思';

    const reflection = reflectionRepository.create({
      employeeId,
      summary,
    });

    return reply.code(201).send(reflection);
  });

  app.get('/employees/:employeeId/reflections', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reflectionRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/emotion-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      eventType: string;
      intensityDelta: number;
      nextEmotion: string;
      summary: string;
    };

    const nextIntensity = Math.max(0, Math.min(1, employee.emotionIntensity + body.intensityDelta));
    const event = emotionEventRepository.create({
      employeeId,
      eventType: body.eventType,
      intensityDelta: body.intensityDelta,
      nextEmotion: body.nextEmotion,
      summary: body.summary,
    });

    employeeRepository.updateEmotion(employeeId, {
      emotionCurrent: body.nextEmotion,
      emotionIntensity: nextIntensity,
      emotionSummary: body.summary,
    });

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/emotion-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return emotionEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/performance-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      eventType: string;
      reliabilityDelta: number;
      nextDeliveryTrend: string;
      nextPromotionReadiness: string;
      nextRetentionRisk: string;
      summary: string;
    };

    const nextReliability = Math.max(0, Math.min(1, employee.reliabilityScore + body.reliabilityDelta));
    const event = performanceEventRepository.create({
      employeeId,
      eventType: body.eventType,
      reliabilityDelta: body.reliabilityDelta,
      nextDeliveryTrend: body.nextDeliveryTrend,
      nextPromotionReadiness: body.nextPromotionReadiness,
      nextRetentionRisk: body.nextRetentionRisk,
      summary: body.summary,
    });

    employeeRepository.updatePerformance(employeeId, {
      deliveryTrend: body.nextDeliveryTrend,
      promotionReadiness: body.nextPromotionReadiness,
      retentionRisk: body.nextRetentionRisk,
      reliabilityScore: nextReliability,
    });
    if (body.nextRetentionRisk === 'high') {
      employeeRepository.updateResignationIntent(employeeId, 'watch');
    }

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/performance-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return performanceEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/manager-proxy-reviews', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      reviewTopic: string;
      conclusion: string;
      nextSteps: string[];
    };

    const review = managerProxyReviewRepository.create({
      employeeId,
      reviewTopic: body.reviewTopic,
      conclusion: body.conclusion,
      nextSteps: body.nextSteps,
    });

    employeeRepository.updateWorkState(employeeId, {
      recentDoneSummary: body.conclusion,
      nextStepSummary: body.nextSteps[0] ?? employee.nextStepSummary,
    });

    return reply.code(201).send(review);
  });

  app.get('/employees/:employeeId/manager-proxy-reviews', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return managerProxyReviewRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/resignation-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const body = request.body as {
      nextIntent: string;
      summary: string;
    };

    const event = resignationEventRepository.create({
      employeeId,
      nextIntent: body.nextIntent,
      summary: body.summary,
    });
    employeeRepository.updateResignationIntent(employeeId, body.nextIntent);

    return reply.code(201).send(event);
  });

  app.get('/employees/:employeeId/resignation-events', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return resignationEventRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/actions/accept-resignation', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    employeeRepository.updateEmploymentStatus(employeeId, 'resigned');
    return { ok: true, employeeId, employmentStatus: 'resigned' };
  });

  app.post('/employees/:employeeId/actions/run-autonomous-learning', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    await runEmployeeAutonomousOperations(employeeId, 'manual');
    const run = await runEmployeeAutonomousLearning(employeeId, 'manual');
    if (!run) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return reply.code(201).send(run);
  });

  app.post('/employees/:employeeId/learning-records/promote-latest-reflection', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const latest = reflectionRepository.latestForEmployee(employeeId);
    if (!latest) {
      return reply.code(404).send({ message: 'reflection not found' });
    }

    const body = request.body as { scope: 'personal' | 'direction' };
    const learningRecord = learningRecordRepository.create({
      employeeId,
      reflectionId: latest.reflectionId,
      title: '导流推进经验沉淀',
      summary: latest.summary,
      scope: body.scope,
    });

    return reply.code(201).send(learningRecord);
  });

  app.get('/employees/:employeeId/learning-records', async (request, reply) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    return learningRecordRepository.listForEmployee(employeeId);
  });

  app.post('/employees/:employeeId/learning-records/:recordId/promote-to-direction-knowledge', async (request, reply) => {
    const { employeeId, recordId } = request.params as { employeeId: string; recordId: string };
    const employee = employeeRepository.get(employeeId);
    if (!employee) {
      return reply.code(404).send({ message: 'employee not found' });
    }

    const record = learningRecordRepository.get(recordId);
    if (!record || record.employeeId !== employeeId) {
      return reply.code(404).send({ message: 'learning record not found' });
    }

    const directionRecord = directionKnowledgeRepository.create({
      employeeId,
      directionId: employee.directionId,
      learningRecordId: record.recordId,
      title: record.title,
      summary: record.summary,
    });

    return reply.code(201).send(directionRecord);
  });

  app.post('/autonomy/run-due-cycles', async () => {
    const maintenance = await runRuntimeMaintenanceSweep();
    const operations = await runAutonomousOperationsSweep('manual_batch', { dueOnly: true });
    const runs = await runDueAutonomousLearningCycles();
    return {
      ok: true,
      maintenanceCount: maintenance.length,
      operationCount: operations.length,
      runCount: runs.length,
      maintenance,
      operations,
      runs,
    };
  });

  app.post('/admin/dev/reset-demo-state', async () => {
    return resetDemoState();
  });

  app.get('/admin/qa/latest-smoke-report', async (request, reply) => {
    try {
      const payload = JSON.parse(await readFile(latestSmokeReportPath, 'utf8'));
      return payload;
    } catch (error) {
      return reply.code(404).send({
        message: 'latest smoke report not found',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/admin/qa/latest-runtime-endurance', async (request, reply) => {
    try {
      const payload = JSON.parse(await readFile(latestRuntimeEndurancePath, 'utf8'));
      return payload;
    } catch (error) {
      return reply.code(404).send({
        message: 'latest runtime endurance report not found',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/admin/qa/latest-group-route-repair', async (request, reply) => {
    try {
      const payload = JSON.parse(await readFile(latestGroupRouteRepairPath, 'utf8'));
      return payload;
    } catch (error) {
      return reply.code(404).send({
        message: 'latest group route repair report not found',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/admin/qa/external-blockers', async () => {
    let latestRuntimeEnduranceReport: unknown;
    try {
      latestRuntimeEnduranceReport = JSON.parse(await readFile(latestRuntimeEndurancePath, 'utf8'));
    } catch {
      latestRuntimeEnduranceReport = undefined;
    }

    const managerProxyBindings = (
      await Promise.all(
        employeeRepository.list().map(async (employee) => {
          const groups = await listProjectGroupsWithRouteStatus(employee.employeeId);
          return groups
            .filter(
              (binding) =>
                binding.status === 'active' &&
                !binding.isDemoPlaceholder &&
                binding.managerProxyRequired &&
                binding.currentBotInChat !== true,
            )
            .map((binding) => ({
              employeeId: employee.employeeId,
              chatId: binding.chatId,
              chatName: binding.chatName,
            }));
        }),
      )
    ).flat();
    const dedupedManagerProxyBindings = Array.from(
      new Map(managerProxyBindings.map((binding) => [`${binding.chatId}:${binding.chatName}`, binding])).values(),
    );

    const items = [];
    const groupSendScopeBlocker = buildGroupSendScopeBlocker({
      managerProxyBindings: dedupedManagerProxyBindings,
    });
    if (groupSendScopeBlocker) {
      items.push(groupSendScopeBlocker);
    }
    const runtimeEnduranceBlocker = buildRuntimeEnduranceBlocker(latestRuntimeEnduranceReport);
    if (runtimeEnduranceBlocker) {
      items.push(runtimeEnduranceBlocker);
    }

    return {
      items,
    };
  });

  app.post('/admin/lark/group-send-scope-auth/begin', async () => {
    return beginGroupSendScopeAuth();
  });

  app.post('/admin/lark/group-send-scope-auth/complete', async (request, reply) => {
    const body = request.body as { deviceCode?: string };
    if (!body.deviceCode?.trim()) {
      return reply.code(400).send({ message: 'deviceCode is required' });
    }
    return completeGroupSendScopeAuth(body.deviceCode.trim());
  });

  app.post('/admin/lark/group-send-scope-auth/open', async (request, reply) => {
    const body = request.body as { verificationUrl?: string };
    if (!body.verificationUrl?.trim()) {
      return reply.code(400).send({ message: 'verificationUrl is required' });
    }

    try {
      return await openGroupSendScopeAuthUrl(body.verificationUrl);
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/admin/lark/open-chat-in-desktop', async (request, reply) => {
    const body = request.body as { chatId?: string };
    if (!body.chatId?.trim()) {
      return reply.code(400).send({ message: 'chatId is required' });
    }

    try {
      return await openLarkChatInDesktop(body.chatId);
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/admin/system/copy-to-clipboard', async (request, reply) => {
    const body = request.body as { text?: string };
    if (typeof body.text !== 'string') {
      return reply.code(400).send({ message: 'text is required' });
    }

    try {
      return await copyTextToClipboard(body.text);
    } catch (error) {
      return reply.code(500).send({
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/directions/:directionId/knowledge-records', async (request) => {
    const { directionId } = request.params as { directionId: string };
    return directionKnowledgeRepository.listForDirection(directionId);
  });

  return app;
}
