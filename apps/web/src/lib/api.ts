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

export async function getEmployees() {
  const response = await fetch('http://localhost:3001/employees');
  if (!response.ok) throw new Error('Failed to load employees');
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
  if (!response.ok) throw new Error('Failed to send group message action');
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
    dryRun?: boolean;
  },
) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}/actions/meego-workitem-lookup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to lookup meego workitem');
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
  if (!response.ok) throw new Error('Failed to find project chat');
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
  if (!response.ok) throw new Error('Failed to create tech review doc');
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
  if (!response.ok) throw new Error('Failed to schedule tech review');
  return response.json();
}
