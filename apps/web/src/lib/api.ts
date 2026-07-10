export type AutonomySettings = {
  employeeId: string;
  enabled: boolean;
  cadenceHours: number;
  autoPromoteToDirectionKnowledge: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  runCount: number;
  lastOutcome?: string | null;
  lastSummary?: string | null;
};

export type AutonomousLearningRun = {
  cycleRunId: string;
  employeeId: string;
  trigger: string;
  createdAt: string;
  summary?: string | null;
  reflection?: {
    reflectionId?: string;
    summary?: string | null;
  } | null;
  learningRecord?: {
    recordId?: string;
    title?: string | null;
    summary?: string | null;
  } | null;
  directionKnowledgeRecord?: {
    recordId?: string;
    title?: string | null;
  } | null;
  autonomySettings?: AutonomySettings | null;
};

export type WorkEpisode = {
  episodeId: string;
  employeeId: string;
  title: string;
  summary: string;
  status: string;
  blocker?: string | null;
  reasoningSummary?: string | null;
  artifactRefs?: string[] | null;
  createdAt?: string | null;
};

export type WorkItemStatus = 'active' | 'blocked' | 'completed';

export type WorkItem = {
  workItemId: string;
  employeeId: string;
  title: string;
  summary: string;
  status: WorkItemStatus;
  source: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RuntimeDispatch = {
  dispatchId: string;
  employeeId: string;
  workItemId?: string | null;
  taskTitle: string;
  taskBody: string;
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  status: 'queued' | 'dispatched';
  workspaceTaskRef: string;
  createdAt: string;
  runtimeReceipt?: {
    workspacePath: string;
    taskFilePath: string;
    dispatchedAt: string;
  };
};

export type RuntimeResultEvent = {
  eventId: string;
  employeeId: string;
  dispatchId?: string | null;
  workItemId?: string | null;
  status: 'completed' | 'blocked' | 'failed';
  summary: string;
  nextStepSummary?: string | null;
  artifactRefs: string[];
  sourceFilePath: string;
  processedFilePath: string;
  createdAt: string;
};

export type RuntimeSession = {
  sessionId: string;
  employeeId: string;
  runtimeKind: string;
  status: 'running' | 'stopped';
  pid: number | null;
  startedAt: string;
  stoppedAt?: string | null;
};


export type FeishuAgentSetupPlan = {
  employeeId: string;
  botName: string;
  setupMode: string;
  daemonHomePath?: string;
  configPath?: string;
  recommendedAgentId?: string;
  launchMode?: string;
  requiredCapabilities: string[];
  createCommand: string[];
  bindCommandPreview: string[];
  launchCommand?: string[];
  statusCommand?: string[];
  stopCommand?: string[];
};

export type FeishuAgentBindResult = {
  employeeId: string;
  bindingStatus: 'bound' | 'unbound';
  appId?: string;
  appSecretRef?: string;
  botOpenId?: string;
  managerOpenId?: string;
  chatMode?: 'mention' | 'all';
  dmPolicy?: 'manager-only';
  agentSource?: string;
  configPath?: string;
  launchCommand?: string[];
  statusCommand?: string[];
  stopCommand?: string[];
  bindCommand?: string[];
  canJoinProjectGroups?: boolean;
  configMaterialized?: boolean;
  configMaterializationMessage?: string;
};

export type FeishuAgentRuntimeStatus = {
  employeeId: string;
  configPath: string;
  launchCommand: string[];
  statusCommand: string[];
  stopCommand: string[];
  bindingStatus: 'bound' | 'unbound';
  configured: boolean;
  agentSource?: string;
  daemon: {
    ok: boolean;
    status?: Record<string, unknown>;
    error?: string;
  };
};

export type ProjectGroupBinding = {
  bindingId: string;
  employeeId: string;
  chatId: string;
  chatName: string;
  status: 'active' | 'watching' | 'archived';
  isDefault: boolean;
  managerProxyRequired: boolean;
  lastSyncedAt?: string | null;
  currentBotInChat?: boolean | null;
  recommendedRoute?: 'bot' | 'user' | 'bind_real_group';
  botPresenceState?: 'in_chat' | 'not_in_chat' | 'unknown' | 'placeholder';
  botIdentitySource?: 'employee_bot' | 'shared_bot' | 'unknown';
  employeeBotBound?: boolean;
  isDemoPlaceholder?: boolean;
};

export type ProjectOpsEvent = {
  eventId: string;
  employeeId: string;
  actionKey: string;
  summary: string;
  nextStepSummary?: string | null;
  targetRef?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt: string;
};

export type ManagerConversationMessage = {
  messageId: string;
  employeeId: string;
  role: string;
  body: string;
  taskType?: string | null;
  reasoningSummary?: string | null;
  artifactRefs?: string[] | null;
  approvalRequired?: boolean | null;
  approvalSummary?: string | null;
  createdAt?: string | null;
};

export type SendManagerMessageInput = {
  employeeId: string;
  body: string;
};

export type SendManagerMessageResult = {
  ok: boolean;
  message: ManagerConversationMessage;
  reply?: ManagerConversationMessage | null;
  replyPending?: boolean;
  dispatchId?: string | null;
};

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected';

export type ApprovalRequestDecision = 'approved' | 'rejected';

export type ApprovalRequest = {
  requestId: string;
  employeeId: string;
  sourceMessageId?: string | null;
  summary: string;
  riskLevel?: string | null;
  status: ApprovalRequestStatus | string;
  approvalSummary?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
};

export type DirectionDefinition = {
  directionId: string;
  displayName: string;
};

export type DirectionConfig = {
  directionId: string;
  displayName?: string;
  defaultKnowledgeBaseIds: string[];
};

export type BrainPreviewTaskType = 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';

export type BrainPreviewLayer = {
  layer: string;
  payload: unknown;
};

export type BrainPreview = {
  employeeId: string;
  taskType: BrainPreviewTaskType;
  layers: BrainPreviewLayer[];
  inputsPreview: {
    workingMemory: unknown;
    episodicMemory: unknown;
    knowledgeItems: unknown;
  };
};

const CONTROL_PLANE_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://127.0.0.1:3001';
})();

function rewriteControlPlaneTarget(input: Parameters<typeof globalThis.fetch>[0]) {
  if (typeof input === 'string') {
    return input.replace('http://localhost:3001', CONTROL_PLANE_BASE_URL);
  }

  if (input instanceof URL) {
    return new URL(input.toString().replace('http://localhost:3001', CONTROL_PLANE_BASE_URL));
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    const nextUrl = input.url.replace('http://localhost:3001', CONTROL_PLANE_BASE_URL);
    if (nextUrl === input.url) {
      return input;
    }

    return new Request(nextUrl, input);
  }

  return input;
}

const fetch: typeof globalThis.fetch = (input, init) => globalThis.fetch(rewriteControlPlaneTarget(input), init);

async function throwDetailedError(response: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text);
        message =
          (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message) ||
          (payload &&
            typeof payload === 'object' &&
            typeof payload.error === 'object' &&
            payload.error &&
            typeof (payload.error as { message?: unknown }).message === 'string' &&
            (payload.error as { message: string }).message) ||
          (payload && typeof payload === 'object' && typeof payload.error === 'string' && payload.error) ||
          text ||
          fallbackMessage;
      } catch {
        message = text;
      }
    }
  } catch {
    message = fallbackMessage;
  }

  throw new Error(message || fallbackMessage);
}

export type LatestSmokeReport = {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

export type LatestRuntimeEnduranceReport = {
  baseUrl: string;
  employeeId: string;
  startedAt: string;
  finishedAt: string;
  summary: {
    cycles: number;
    passed: number;
    failed: number;
  };
};

export type LatestGroupRouteRepairReport = {
  baseUrl?: string;
  employeeId: string;
  startedAt?: string;
  finishedAt?: string;
  targetChat?: {
    chatId: string;
    chatName: string;
    source: string;
  };
  checks?: {
    bindOk: boolean;
    sendOk: boolean;
    identityUsed: string | null;
    autoRepairedBotRoute: boolean;
    bindingManagerProxyRequired: boolean | null;
    botPresenceState: string | null;
  };
  latestGroup?: {
    chatId: string;
    chatName: string;
    managerProxyRequired: boolean;
    botPresenceState?: string | null;
    currentBotInChat?: boolean | null;
  };
};

export type ExternalBlocker = {
  key: string;
  title: string;
  status: string;
  detail: string;
};

export type GroupSendScopeAuthBeginResult = {
  verificationUrl: string;
  deviceCode: string;
  expiresIn: number;
  qrImagePath?: string | null;
  qrDataUrl?: string | null;
};

export type FeishuAgentOnboardingBeginResult = {
  sessionId?: string;
  domain: 'feishu' | 'lark';
  verificationUrl: string;
  deviceCode: string;
  expiresIn: number;
  interval: number;
  qrImagePath?: string | null;
  qrDataUrl?: string | null;
  createdAt?: string;
};

export async function getEmployees() {
  const response = await fetch('http://localhost:3001/employees');
  if (!response.ok) throw new Error('Failed to load employees');
  return response.json();
}

export async function getLatestSmokeReport(): Promise<LatestSmokeReport> {
  const response = await fetch('http://localhost:3001/admin/qa/latest-smoke-report');
  if (!response.ok) throw new Error('Failed to load latest smoke report');
  return response.json();
}

export async function getLatestRuntimeEnduranceReport(): Promise<LatestRuntimeEnduranceReport> {
  const response = await fetch('http://localhost:3001/admin/qa/latest-runtime-endurance');
  if (!response.ok) throw new Error('Failed to load latest runtime endurance report');
  return response.json();
}

export async function getLatestGroupRouteRepairReport(): Promise<LatestGroupRouteRepairReport> {
  const response = await fetch('http://localhost:3001/admin/qa/latest-group-route-repair');
  if (!response.ok) throw new Error('Failed to load latest group route repair report');
  return response.json();
}

export async function getExternalBlockers(): Promise<{ items: ExternalBlocker[] }> {
  const response = await fetch('http://localhost:3001/admin/qa/external-blockers');
  if (!response.ok) throw new Error('Failed to load external blockers');
  return response.json();
}

export async function beginGroupSendScopeAuthAction(): Promise<GroupSendScopeAuthBeginResult> {
  const response = await fetch('http://localhost:3001/admin/lark/group-send-scope-auth/begin', {
    method: 'POST',
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to begin group-send scope auth');
  return response.json();
}

export async function completeGroupSendScopeAuthAction(deviceCode: string) {
  const response = await fetch('http://localhost:3001/admin/lark/group-send-scope-auth/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to complete group-send scope auth');
  return response.json();
}

export async function openGroupSendScopeAuthInChromeAction(verificationUrl: string) {
  const response = await fetch('http://localhost:3001/admin/lark/group-send-scope-auth/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ verificationUrl }),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to open group-send scope auth in Chrome');
  return response.json();
}

export async function openLarkChatInDesktopAction(chatId: string) {
  const response = await fetch('http://localhost:3001/admin/lark/open-chat-in-desktop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chatId }),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to open Lark chat in desktop');
  return response.json();
}

export async function copyTextToClipboardAction(text: string) {
  const response = await fetch('http://localhost:3001/admin/system/copy-to-clipboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to copy text to clipboard');
  return response.json();
}

export async function resetDemoStateAction(): Promise<{
  ok: boolean;
  employees: string[];
  clearedTables: string[];
}> {
  const response = await fetch('http://localhost:3001/admin/dev/reset-demo-state', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to reset demo state');
  return response.json();
}

export async function getDirections(): Promise<DirectionDefinition[]> {
  const response = await fetch('http://localhost:3001/directions');
  if (!response.ok) throw new Error('Failed to load directions');
  return response.json();
}

export async function getDirectionConfig(directionId: string): Promise<DirectionConfig> {
  const response = await fetch(`http://localhost:3001/directions/${directionId}/config`);
  if (!response.ok) throw new Error('Failed to load direction config');
  return response.json();
}

export async function updateDirectionConfig(
  directionId: string,
  payload: { defaultKnowledgeBaseIds: string[] },
): Promise<DirectionConfig> {
  const response = await fetch(`http://localhost:3001/directions/${directionId}/config`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update direction config');
  return response.json();
}

export async function updateEmployeeDirection(employeeId: string, directionId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/direction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ directionId }),
  });
  if (!response.ok) throw new Error('Failed to update employee direction');
  return response.json();
}

export async function getEmployeeDetail(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}`);
  if (!response.ok) throw new Error('Failed to load employee detail');
  return response.json();
}

export async function getWorkEpisodes(employeeId: string): Promise<WorkEpisode[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/work-episodes`);
  if (!response.ok) throw new Error('Failed to load work episodes');
  return response.json();
}

export async function createWorkEpisode(
  employeeId: string,
  payload: {
    title: string;
    summary: string;
    status: string;
    blocker?: string;
    reasoningSummary?: string;
    artifactRefs?: string[];
  },
): Promise<WorkEpisode> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/work-episodes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create work episode');
  return response.json();
}

export async function getWorkItems(employeeId: string): Promise<WorkItem[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/work-items`);
  if (!response.ok) throw new Error('Failed to load work items');
  return response.json();
}

export async function createWorkItem(
  employeeId: string,
  payload: {
    title: string;
    summary: string;
    status?: WorkItemStatus;
  },
): Promise<WorkItem> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/work-items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create work item');
  return response.json();
}

export async function updateWorkItemStatus(workItemId: string, status: WorkItemStatus): Promise<WorkItem> {
  const response = await fetch(`http://localhost:3001/work-items/${workItemId}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update work item status');
  return response.json();
}

export async function getRuntimeDispatches(employeeId: string): Promise<RuntimeDispatch[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime-dispatches`);
  if (!response.ok) throw new Error('Failed to load runtime dispatches');
  return response.json();
}

export async function createRuntimeDispatch(
  employeeId: string,
  payload: {
    workItemId?: string;
    taskTitle: string;
    taskBody: string;
    taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  },
): Promise<
  RuntimeDispatch & {
    runtime?: { employeeId: string; runtimeKind: string; status: string; pid: number | null };
    session?: RuntimeSession | null;
  }
> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime-dispatches`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create runtime dispatch');
  return response.json();
}

export async function getRuntimeResults(employeeId: string): Promise<RuntimeResultEvent[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime-results`);
  if (!response.ok) throw new Error('Failed to load runtime results');
  return response.json();
}

export async function collectRuntimeEventsAction(employeeId: string): Promise<{
  ok: boolean;
  count: number;
  events: RuntimeResultEvent[];
}> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/collect-runtime-events`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to collect runtime events');
  return response.json();
}

export async function getRuntimeSessions(employeeId: string): Promise<RuntimeSession[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime-sessions`);
  if (!response.ok) throw new Error('Failed to load runtime sessions');
  return response.json();
}

export async function startRuntimeAction(employeeId: string): Promise<{
  ok: boolean;
  runtime: { employeeId: string; runtimeKind: string; status: string; pid: number | null };
  session: RuntimeSession | null;
}> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime/start`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start runtime');
  return response.json();
}

export async function stopRuntimeAction(employeeId: string): Promise<{
  ok: boolean;
  runtime: { employeeId: string; runtimeKind: string; status: string; pid: number | null };
  session: RuntimeSession | null;
}> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/runtime/stop`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to stop runtime');
  return response.json();
}

export async function getProjectGroups(employeeId: string): Promise<ProjectGroupBinding[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups`);
  if (!response.ok) throw new Error('Failed to load project groups');
  return response.json();
}

export async function getProjectOpsEvents(employeeId: string): Promise<ProjectOpsEvent[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-ops-events`);
  if (!response.ok) throw new Error('Failed to load project ops events');
  return response.json();
}

export async function createProjectGroup(
  employeeId: string,
  payload: {
    chatId: string;
    chatName: string;
    status?: 'active' | 'watching' | 'archived';
    isDefault?: boolean;
    managerProxyRequired?: boolean;
  },
): Promise<ProjectGroupBinding> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create project group');
  return response.json();
}

export async function createBotProjectGroup(
  employeeId: string,
  payload: {
    chatName?: string;
    isDefault?: boolean;
  } = {},
): Promise<{
  employeeId: string;
  binding: ProjectGroupBinding;
  result: unknown;
  projectOpsEvent?: ProjectOpsEvent;
}> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups/create-bot-qa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to create bot project group');
  return response.json();
}

export async function enableBotProjectGroupRoute(
  employeeId: string,
  bindingId: string,
): Promise<{
  employeeId: string;
  binding: ProjectGroupBinding;
  result: unknown;
  projectOpsEvent?: ProjectOpsEvent;
}> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups/${bindingId}/enable-bot-route`, {
    method: 'POST',
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to enable bot project group route');
  return response.json();
}

export async function updateProjectGroupStatus(
  employeeId: string,
  bindingId: string,
  status: 'active' | 'watching' | 'archived',
): Promise<ProjectGroupBinding> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups/${bindingId}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update project group status');
  return response.json();
}

export async function setDefaultProjectGroup(employeeId: string, bindingId: string): Promise<ProjectGroupBinding> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-groups/${bindingId}/default`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to set default project group');
  return response.json();
}

export async function createCandidate(input: { name: string; interviewNotes: string }) {
  const response = await fetch('http://localhost:3001/hr/candidates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to create candidate');
  return response.json();
}

export async function getCandidates() {
  const response = await fetch('http://localhost:3001/hr/candidates');
  if (!response.ok) throw new Error('Failed to load candidates');
  return response.json();
}

export async function updateCandidateDecision(candidateId: string, status: 'offered' | 'rejected') {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update candidate decision');
  return response.json();
}

export async function convertCandidateToEmployee(
  candidateId: string,
  payload: {
    employeeId: string;
    directionId: string;
    level?: '1-2' | '2-1' | '2-2';
  },
) {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/convert-to-employee`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = 'Failed to convert candidate to employee';
    try {
      const errorPayload = (await response.json()) as { message?: string };
      if (typeof errorPayload?.message === 'string' && errorPayload.message.trim()) {
        message = errorPayload.message;
      }
    } catch {
      // ignore malformed error payloads and use the fallback message
    }
    throw new Error(message);
  }
  return response.json();
}

export type CandidateInterviewChatMessage = {
  messageId: string;
  candidateId: string;
  role: 'system' | 'interviewer' | 'candidate';
  body: string;
  createdAt: string;
};

export async function getCandidateInterviewChat(candidateId: string): Promise<CandidateInterviewChatMessage[]> {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/interview-chat`);
  if (!response.ok) throw new Error('Failed to load candidate interview chat');
  return response.json();
}

export async function sendCandidateInterviewMessage(
  candidateId: string,
  payload: {
    body: string;
  },
): Promise<{
  ok: boolean;
  interviewerMessage: CandidateInterviewChatMessage;
  candidateMessage: CandidateInterviewChatMessage;
  messages: CandidateInterviewChatMessage[];
}> {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/interview-chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to send candidate interview message');
  return response.json();
}

export type CandidateInterview = {
  interviewId: string;
  candidateId: string;
  stage: string;
  scheduledAt: string;
  summary: string;
  recommendation: 'hire' | 'hold' | 'reject';
  createdAt: string;
};

export async function getCandidateInterviews(candidateId: string): Promise<CandidateInterview[]> {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/interviews`);
  if (!response.ok) throw new Error('Failed to load candidate interviews');
  return response.json();
}

export async function createCandidateInterview(
  candidateId: string,
  payload: {
    stage: string;
    scheduledAt: string;
    summary: string;
    recommendation: 'hire' | 'hold' | 'reject';
  },
): Promise<CandidateInterview> {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/interviews`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create candidate interview');
  return response.json();
}

export type CandidateLifecycleEvent = {
  eventId: string;
  candidateId: string;
  eventType: 'candidate_created' | 'interview_recorded' | 'decision_updated' | 'candidate_hired';
  status: 'interviewing' | 'offered' | 'rejected' | 'hired';
  summary: string;
  createdAt: string;
};

export async function getCandidateLifecycle(candidateId: string): Promise<CandidateLifecycleEvent[]> {
  const response = await fetch(`http://localhost:3001/hr/candidates/${candidateId}/lifecycle`);
  if (!response.ok) throw new Error('Failed to load candidate lifecycle');
  return response.json();
}

export async function updateEmployeeLevel(employeeId: string, level: '1-2' | '2-1' | '2-2') {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/level`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ level }),
  });
  if (!response.ok) throw new Error('Failed to update employee level');
  return response.json();
}

export async function updateEmploymentStatus(employeeId: string, employmentStatus: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/employment-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employmentStatus }),
  });
  if (!response.ok) throw new Error('Failed to update employment status');
  return response.json();
}

export async function getInternalMessages(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/internal-messages`);
  if (!response.ok) throw new Error('Failed to load internal messages');
  return response.json();
}

export async function getManagerConversation(employeeId: string): Promise<ManagerConversationMessage[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/manager-conversation`);
  if (!response.ok) throw new Error('Failed to load manager conversation');
  return response.json();
}

export async function sendManagerMessage(input: SendManagerMessageInput): Promise<SendManagerMessageResult> {
  const response = await fetch('http://localhost:3001/chat/manager-message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to send manager message');
  return response.json();
}

export async function getApprovalRequests(employeeId: string): Promise<ApprovalRequest[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/approval-requests`);
  if (!response.ok) throw new Error('Failed to load approval requests');
  return response.json();
}

export async function decideApprovalRequest(
  requestId: string,
  decision: ApprovalRequestDecision,
): Promise<ApprovalRequest> {
  const response = await fetch(`http://localhost:3001/approval-requests/${requestId}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) throw new Error('Failed to decide approval request');
  return response.json();
}

export async function sendInternalMessage(input: {
  senderEmployeeId: string;
  recipientEmployeeId: string;
  body: string;
}) {
  const response = await fetch('http://localhost:3001/chat/internal-message', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to send internal message');
  return response.json();
}

export async function getIntegrationStatus() {
  const response = await fetch('http://localhost:3001/integrations/status');
  if (!response.ok) throw new Error('Failed to load integration status');
  return response.json();
}

export async function getMeegoAuth() {
  const response = await fetch('http://localhost:3001/integrations/meego/auth');
  if (!response.ok) throw new Error('Failed to load meego auth');
  return response.json();
}

export async function getFeishuBotPreview(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-bot-preview`);
  if (!response.ok) throw new Error('Failed to load feishu bot preview');
  return response.json();
}


export async function getFeishuAgentSetupPlan(employeeId: string): Promise<FeishuAgentSetupPlan> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/setup-plan`);
  if (!response.ok) throw new Error('Failed to load feishu agent setup plan');
  return response.json();
}

export async function bindFeishuAgent(
  employeeId: string,
  payload: {
    appId: string;
    appSecretRef?: string;
    botOpenId?: string;
    managerOpenId?: string;
    chatMode?: 'mention' | 'all';
  },
): Promise<FeishuAgentBindResult> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/bind`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to bind feishu agent');
  return response.json();
}

export async function beginFeishuAgentOnboarding(employeeId: string): Promise<FeishuAgentOnboardingBeginResult> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/onboarding/begin`, {
    method: 'POST',
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to begin feishu agent onboarding');
  return response.json();
}

export async function completeFeishuAgentOnboarding(
  employeeId: string,
  payload: { deviceCode: string; timeoutSeconds?: number; chatMode?: 'mention' | 'all' },
): Promise<FeishuAgentBindResult> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/onboarding/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to complete feishu agent onboarding');
  return response.json();
}

export async function getFeishuAgentOnboardingSession(
  employeeId: string,
): Promise<FeishuAgentOnboardingBeginResult | null> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/onboarding-session`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) return throwDetailedError(response, 'Failed to load feishu agent onboarding session');
  return response.json();
}

export async function getFeishuAgentRuntimeStatus(employeeId: string): Promise<FeishuAgentRuntimeStatus> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/runtime-status`);
  if (!response.ok) throw new Error('Failed to load feishu agent runtime status');
  return response.json();
}

export async function startFeishuAgentRuntime(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/start`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start feishu agent runtime');
  return response.json();
}

export async function stopFeishuAgentRuntime(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/feishu-agent/stop`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to stop feishu agent runtime');
  return response.json();
}

export async function getProjectOpsPreview(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/project-ops-preview`);
  if (!response.ok) throw new Error('Failed to load project ops preview');
  return response.json();
}

export async function getBrainPreview(employeeId: string, taskType: BrainPreviewTaskType): Promise<BrainPreview> {
  const response = await fetch(
    `http://localhost:3001/employees/${employeeId}/brain-preview?taskType=${encodeURIComponent(taskType)}`,
  );
  if (!response.ok) throw new Error('Failed to load brain preview');
  return response.json();
}

export async function getReflections(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/reflections`);
  if (!response.ok) throw new Error('Failed to load reflections');
  return response.json();
}

export async function refreshReflection(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/reflections/refresh`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to refresh reflection');
  return response.json();
}

export async function getLearningRecords(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/learning-records`);
  if (!response.ok) throw new Error('Failed to load learning records');
  return response.json();
}

export async function promoteLatestReflection(employeeId: string, scope: 'personal' | 'direction') {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/learning-records/promote-latest-reflection`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scope }),
  });
  if (!response.ok) throw new Error('Failed to promote reflection');
  return response.json();
}

export async function getDirectionKnowledgeRecords(directionId: string) {
  const response = await fetch(`http://localhost:3001/directions/${directionId}/knowledge-records`);
  if (!response.ok) throw new Error('Failed to load direction knowledge records');
  return response.json();
}

export async function promoteLearningRecordToDirectionKnowledge(employeeId: string, recordId: string) {
  const response = await fetch(
    `http://localhost:3001/employees/${employeeId}/learning-records/${recordId}/promote-to-direction-knowledge`,
    {
      method: 'POST',
    },
  );
  if (!response.ok) throw new Error('Failed to promote learning record to direction knowledge');
  return response.json();
}

export async function getEmotionEvents(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/emotion-events`);
  if (!response.ok) throw new Error('Failed to load emotion events');
  return response.json();
}

export async function createEmotionEvent(
  employeeId: string,
  payload: {
    eventType: string;
    intensityDelta: number;
    nextEmotion: string;
    summary: string;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/emotion-events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create emotion event');
  return response.json();
}

export async function getPerformanceEvents(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/performance-events`);
  if (!response.ok) throw new Error('Failed to load performance events');
  return response.json();
}

export async function createPerformanceEvent(
  employeeId: string,
  payload: {
    eventType: string;
    reliabilityDelta: number;
    nextDeliveryTrend: string;
    nextPromotionReadiness: string;
    nextRetentionRisk: string;
    summary: string;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/performance-events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create performance event');
  return response.json();
}

export async function getResignationEvents(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/resignation-events`);
  if (!response.ok) throw new Error('Failed to load resignation events');
  return response.json();
}

export async function createResignationEvent(
  employeeId: string,
  payload: {
    nextIntent: string;
    summary: string;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/resignation-events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create resignation event');
  return response.json();
}

export async function acceptResignationAction(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/accept-resignation`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to accept resignation');
  return response.json();
}

export async function getManagerProxyReviews(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/manager-proxy-reviews`);
  if (!response.ok) throw new Error('Failed to load manager proxy reviews');
  return response.json();
}

export async function createManagerProxyReview(
  employeeId: string,
  payload: {
    reviewTopic: string;
    conclusion: string;
    nextSteps: string[];
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/manager-proxy-reviews`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create manager proxy review');
  return response.json();
}

export async function sendGroupMessageAction(
  employeeId: string,
  payload: {
    chatId: string;
    body: string;
    dryRun?: boolean;
    approved?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/send-group-message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to send group message action');
  return response.json();
}

export async function getAutonomySettings(employeeId: string): Promise<AutonomySettings> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/autonomy-settings`);
  if (!response.ok) throw new Error('Failed to load autonomy settings');
  return response.json();
}

export async function updateAutonomySettings(
  employeeId: string,
  payload: {
    enabled?: boolean;
    cadenceHours?: number;
    autoPromoteToDirectionKnowledge?: boolean;
  },
): Promise<AutonomySettings> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/autonomy-settings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update autonomy settings');
  return response.json();
}

export async function getAutonomousLearningRuns(employeeId: string): Promise<AutonomousLearningRun[]> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/autonomous-learning-runs`);
  if (!response.ok) throw new Error('Failed to load autonomous learning runs');
  return response.json();
}

export async function runAutonomousLearningAction(
  employeeId: string,
  payload?: Record<string, unknown>,
): Promise<AutonomousLearningRun> {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/run-autonomous-learning`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  if (!response.ok) throw new Error('Failed to run autonomous learning action');
  return response.json();
}

export async function lookupMeegoWorkitemAction(
  employeeId: string,
  payload: {
    lookupType: 'id' | 'title';
    query: string;
    projectKey?: string;
    dryRun?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/meego-workitem-lookup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to lookup meego workitem');
  return response.json();
}

export async function findProjectChatAction(
  employeeId: string,
  payload: {
    query: string;
    dryRun?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/find-project-chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to find project chat');
  return response.json();
}

export async function updateMeegoWorkitemAction(
  employeeId: string,
  payload: {
    workItemId: string;
    projectKey: string;
    fields: string;
    dryRun?: boolean;
    approved?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/meego-workitem-update`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to update meego workitem');
  return response.json();
}

export async function createMeegoCommentAction(
  employeeId: string,
  payload: {
    workItemId: string;
    projectKey: string;
    commentContent: string;
    dryRun?: boolean;
    approved?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/meego-comment-create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to create meego comment');
  return response.json();
}

export async function createTechReviewDocAction(
  employeeId: string,
  payload: {
    title: string;
    problem: string;
    nextSteps: string[];
    dryRun?: boolean;
    approved?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/create-tech-review-doc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to create tech review doc');
  return response.json();
}

export async function scheduleTechReviewAction(
  employeeId: string,
  payload: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendeeIds: string[];
    dryRun?: boolean;
    approved?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/schedule-tech-review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return throwDetailedError(response, 'Failed to schedule tech review');
  return response.json();
}
