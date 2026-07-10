import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const baseUrl = process.env.RDLEADER_BASE_URL ?? 'http://127.0.0.1:3001';
const rootDir = '/Users/bytedance/GolandProjects/DevPlan/RdLeader';
const reportsDir = path.join(rootDir, 'docs', 'qa', 'reports');
const staleRecoveryAttempts = Number(process.env.RDLEADER_STALE_RECOVERY_ATTEMPTS ?? 25);
const staleRecoveryPollMs = Number(process.env.RDLEADER_STALE_RECOVERY_POLL_MS ?? 2000);

async function requestJson(urlPath, options = {}) {
  const headers = {
    ...(options.headers ?? {}),
  };
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${urlPath}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function truncate(value, limit = 280) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}…`;
}

function pushCheck(checks, name, passed, detail, extra = {}) {
  checks.push({
    name,
    status: passed ? 'PASS' : 'FAIL',
    detail,
    ...extra,
  });
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRuntimeStatus(employeeId, expectedStatus, attempts = 10, pollMs = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const detail = await requestJson(`/employees/${employeeId}`);
    if (detail.ok && detail.payload?.runtime?.status === expectedStatus) {
      return true;
    }
    await sleep(pollMs);
  }
  return false;
}

async function clearPendingRuntimeState(runtimeRoot) {
  for (const dirName of ['tasks', 'tasks-processing', 'results', 'results-processed']) {
    const dirPath = path.join(runtimeRoot, dirName);
    await fs.mkdir(dirPath, { recursive: true });
    const entries = await fs.readdir(dirPath).catch(() => []);
    await Promise.all(
      entries
        .filter((name) => name.endsWith('.json'))
        .map((name) => fs.rm(path.join(dirPath, name), { force: true }).catch(() => undefined)),
    );
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const checks = [];
  const smokeCandidateName = `QA Smoke ${Date.now()}`;

  const employeesResponse = await requestJson('/employees');
  const directionsResponse = await requestJson('/directions');
  pushCheck(
    checks,
    'employees_list',
    employeesResponse.ok && Array.isArray(employeesResponse.payload) && employeesResponse.payload.length >= 2,
    employeesResponse.ok ? `loaded ${employeesResponse.payload.length} employees` : truncate(employeesResponse.payload),
  );
  pushCheck(
    checks,
    'directions_list',
    directionsResponse.ok && Array.isArray(directionsResponse.payload) && directionsResponse.payload.length >= 1,
    directionsResponse.ok ? `loaded ${directionsResponse.payload.length} directions` : truncate(directionsResponse.payload),
  );
  pushCheck(
    checks,
    'core_platform_direction_present',
    directionsResponse.ok &&
      Array.isArray(directionsResponse.payload) &&
      directionsResponse.payload.some((direction) => direction.directionId === 'core-platform'),
    directionsResponse.ok ? truncate(directionsResponse.payload) : truncate(directionsResponse.payload),
  );

  for (const employeeId of ['lushirong', 'zhouyongkang']) {
    const detail = await requestJson(`/employees/${employeeId}`);
    pushCheck(
      checks,
      `employee_detail_${employeeId}`,
      detail.ok && detail.payload?.employeeId === employeeId,
      detail.ok ? truncate({ recentDoneSummary: detail.payload?.recentDoneSummary, runtime: detail.payload?.runtime }) : truncate(detail.payload),
    );
  }

  await requestJson('/employees/lushirong/autonomy-settings', {
    method: 'POST',
    body: JSON.stringify({
      enabled: false,
      cadenceHours: 24,
      autoPromoteToDirectionKnowledge: false,
    }),
  }).catch(() => undefined);

  const runtimeStart = await requestJson('/employees/lushirong/runtime/start', {
    method: 'POST',
  });
  pushCheck(
    checks,
    'runtime_start_lushirong',
    runtimeStart.ok && runtimeStart.payload?.runtime?.status === 'running',
    truncate(runtimeStart.payload),
  );

  const workspaceMapPath = path.join(os.homedir(), 'GolandProjects', 'E', 'lushirong', 'WORKSPACE_MAP.md');
  let workspaceMapExists = false;
  try {
    await fs.access(workspaceMapPath);
    workspaceMapExists = true;
  } catch {
    workspaceMapExists = false;
  }
  pushCheck(
    checks,
    'workspace_bootstrap_lushirong',
    workspaceMapExists,
    workspaceMapExists ? workspaceMapPath : 'WORKSPACE_MAP.md missing',
  );

  const runtimeRoot = path.join(os.homedir(), 'GolandProjects', 'E', 'lushirong', '.rdleader');
  const staleTaskName = 'qa-stale-recovery-task';
  const staleTaskProcessingPath = path.join(runtimeRoot, 'tasks-processing', `${staleTaskName}.json`);
  await requestJson('/employees/lushirong/runtime/stop', {
    method: 'POST',
  }).catch(() => undefined);
  await waitForRuntimeStatus('lushirong', 'stopped').catch(() => false);
  await clearPendingRuntimeState(runtimeRoot);
  await fs.mkdir(path.join(runtimeRoot, 'tasks-processing'), { recursive: true });
  await fs.writeFile(
    staleTaskProcessingPath,
    JSON.stringify(
      {
        employeeId: 'lushirong',
        taskTitle: 'QA stale recovery task',
        taskBody:
          '这是 RDLeader stale-processing recovery smoke 任务。不要检查仓库，不要扫描代码，不要做额外研究。请立即且只输出一个 JSON 对象：{"status":"completed","summary":"已完成 stale processing recovery smoke 验证任务并成功返回结构化结果。","nextStepSummary":"等待控制面收取结果。","artifactRefs":[]}',
        taskType: 'status',
        dispatchedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
  await requestJson('/employees/lushirong/runtime/start', {
    method: 'POST',
  }).catch(() => undefined);
  let staleRecovered = false;
  for (let attempt = 0; attempt < staleRecoveryAttempts; attempt += 1) {
    await sleep(staleRecoveryPollMs);
    const recoveredProcessed = await fs
      .access(path.join(runtimeRoot, 'tasks-processed', `${staleTaskName}.json`))
      .then(() => true)
      .catch(() => false);
    const recoveredResult = await fs
      .access(path.join(runtimeRoot, 'results', `${staleTaskName}.result.json`))
      .then(() => true)
      .catch(() => false);
    if (recoveredProcessed || recoveredResult) {
      staleRecovered = true;
      break;
    }
  }
  pushCheck(
    checks,
    'runtime_stale_processing_recovery',
    staleRecovered,
    staleRecovered
      ? 'stale processing task recovered'
      : `stale processing task not recovered within ${staleRecoveryAttempts * staleRecoveryPollMs}ms`,
  );

  const runtimeDispatch = await requestJson('/employees/lushirong/runtime-dispatches', {
    method: 'POST',
    body: JSON.stringify({
      taskTitle: 'QA smoke runtime status',
      taskBody: '请用结构化结果同步你当前在做什么、下一步做什么，不要编造未发生的外部动作。',
      taskType: 'status',
    }),
  });
  pushCheck(
    checks,
    'runtime_dispatch_lushirong',
    runtimeDispatch.ok && typeof runtimeDispatch.payload?.runtimeReceipt?.taskFilePath === 'string',
    truncate(runtimeDispatch.payload),
  );

  const runtimeCollect = await requestJson('/employees/lushirong/actions/collect-runtime-events', {
    method: 'POST',
  });
  pushCheck(
    checks,
    'runtime_collect_lushirong',
    runtimeCollect.ok && Array.isArray(runtimeCollect.payload?.events),
    truncate(runtimeCollect.payload),
  );

  let runtimeResults = await requestJson('/employees/lushirong/runtime-results');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (runtimeResults.ok && Array.isArray(runtimeResults.payload) && runtimeResults.payload.length >= 1) {
      break;
    }
    await sleep(5000);
    await requestJson('/employees/lushirong/actions/collect-runtime-events', {
      method: 'POST',
    }).catch(() => undefined);
    runtimeResults = await requestJson('/employees/lushirong/runtime-results');
  }
  pushCheck(
    checks,
    'runtime_results_available',
    runtimeResults.ok && Array.isArray(runtimeResults.payload) && runtimeResults.payload.length >= 1,
    runtimeResults.ok ? `results=${runtimeResults.payload.length}` : truncate(runtimeResults.payload),
  );

  const workEpisodeCreate = await requestJson('/employees/lushirong/work-episodes', {
    method: 'POST',
    body: JSON.stringify({
      title: 'QA smoke work episode',
      summary: 'QA smoke work episode summary',
      status: 'in_progress',
      blocker: 'QA smoke blocker',
      reasoningSummary: 'QA smoke reasoning',
      artifactRefs: ['artifact://qa-smoke-work-episode'],
    }),
  });
  pushCheck(
    checks,
    'work_episode_create',
    workEpisodeCreate.ok && workEpisodeCreate.payload?.title === 'QA smoke work episode',
    truncate(workEpisodeCreate.payload),
  );

  const candidateCreate = await requestJson('/hr/candidates', {
    method: 'POST',
    body: JSON.stringify({
      name: smokeCandidateName,
      interviewNotes: 'QA smoke candidate',
    }),
  });
  const candidateId = candidateCreate.payload?.candidate?.candidateId;
  pushCheck(
    checks,
    'candidate_create',
    candidateCreate.ok && typeof candidateId === 'string',
    truncate(candidateCreate.payload),
  );

  if (candidateId) {
    const interviewCreate = await requestJson(`/hr/candidates/${candidateId}/interviews`, {
      method: 'POST',
      body: JSON.stringify({
        stage: 'qa-smoke-round',
        scheduledAt: startedAt,
        summary: 'QA smoke interview summary',
        recommendation: 'hold',
      }),
    });
    pushCheck(
      checks,
      'candidate_interview_create',
      interviewCreate.ok && interviewCreate.payload?.candidateId === candidateId,
      truncate(interviewCreate.payload),
    );
  }

  const internalMessage = await requestJson('/chat/internal-message', {
    method: 'POST',
    body: JSON.stringify({
      senderEmployeeId: 'lushirong',
      recipientEmployeeId: 'zhouyongkang',
      body: 'QA smoke internal message',
    }),
  });
  pushCheck(
    checks,
    'internal_message_send',
    internalMessage.ok && typeof internalMessage.payload?.message?.body === 'string',
    truncate(internalMessage.payload),
  );

  const managerMessage = await requestJson('/chat/manager-message', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: 'lushirong',
      body: 'QA smoke：同步一下当前推进情况。',
    }),
  });
  pushCheck(
    checks,
    'manager_message_send',
    managerMessage.ok && typeof managerMessage.payload?.reply?.body === 'string',
    truncate(managerMessage.payload),
  );

  const reflectionRefresh = await requestJson('/employees/lushirong/reflections/refresh', {
    method: 'POST',
  });
  pushCheck(
    checks,
    'reflection_refresh',
    reflectionRefresh.ok && typeof reflectionRefresh.payload?.summary === 'string',
    truncate(reflectionRefresh.payload),
  );

  const emotionEvent = await requestJson('/employees/lushirong/emotion-events', {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'positive_feedback',
      intensityDelta: -0.1,
      nextEmotion: 'proud',
      summary: 'QA smoke positive feedback',
    }),
  });
  pushCheck(
    checks,
    'emotion_event_create',
    emotionEvent.ok && emotionEvent.payload?.nextEmotion === 'proud',
    truncate(emotionEvent.payload),
  );
  const detailAfterEmotion = await requestJson('/employees/lushirong');
  pushCheck(
    checks,
    'emotion_state_propagates_to_detail',
    detailAfterEmotion.ok && detailAfterEmotion.payload?.emotionState?.current === 'proud',
    truncate(detailAfterEmotion.payload?.emotionState),
  );

  const performanceEvent = await requestJson('/employees/lushirong/performance-events', {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'negative_review',
      reliabilityDelta: -0.05,
      nextDeliveryTrend: 'down',
      nextPromotionReadiness: 'hold',
      nextRetentionRisk: 'medium',
      summary: 'QA smoke performance feedback',
    }),
  });
  pushCheck(
    checks,
    'performance_event_create',
    performanceEvent.ok && performanceEvent.payload?.nextRetentionRisk === 'medium',
    truncate(performanceEvent.payload),
  );
  const detailAfterPerformance = await requestJson('/employees/lushirong');
  pushCheck(
    checks,
    'performance_state_propagates_to_detail',
    detailAfterPerformance.ok && detailAfterPerformance.payload?.performanceState?.retentionRisk === 'medium',
    truncate(detailAfterPerformance.payload?.performanceState),
  );

  const autonomyUpdate = await requestJson('/employees/lushirong/autonomy-settings', {
    method: 'POST',
    body: JSON.stringify({
      enabled: true,
      cadenceHours: 24,
      autoPromoteToDirectionKnowledge: false,
    }),
  });
  pushCheck(
    checks,
    'autonomy_settings_update',
    autonomyUpdate.ok && autonomyUpdate.payload?.enabled === true,
    truncate(autonomyUpdate.payload),
  );

  const autonomyRun = await requestJson('/employees/lushirong/actions/run-autonomous-learning', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  pushCheck(
    checks,
    'autonomous_learning_run',
    autonomyRun.ok && autonomyRun.payload?.employeeId === 'lushirong',
    truncate(autonomyRun.payload),
  );

  const feishuPreview = await requestJson('/employees/lushirong/feishu-bot-preview');
  pushCheck(
    checks,
    'feishu_preview',
    feishuPreview.ok && feishuPreview.payload?.employeeId === 'lushirong',
    truncate(feishuPreview.payload),
  );

  const projectOpsPreview = await requestJson('/employees/lushirong/project-ops-preview');
  pushCheck(
    checks,
    'project_ops_preview',
    projectOpsPreview.ok && projectOpsPreview.payload?.employeeId === 'lushirong',
    truncate(projectOpsPreview.payload),
  );

  const projectGroupCreate = await requestJson('/employees/lushirong/project-groups', {
    method: 'POST',
    body: JSON.stringify({
      chatId: `qa-smoke-chat-${Date.now()}`,
      chatName: 'QA Smoke Project Group',
      status: 'watching',
      isDefault: false,
      managerProxyRequired: true,
    }),
  });
  pushCheck(
    checks,
    'project_group_create',
    projectGroupCreate.ok && typeof projectGroupCreate.payload?.bindingId === 'string',
    truncate(projectGroupCreate.payload),
  );
  const createdBindingId = projectGroupCreate.payload?.bindingId;
  if (createdBindingId) {
    const setDefaultGroup = await requestJson(
      `/employees/lushirong/project-groups/${createdBindingId}/default`,
      {
        method: 'POST',
      },
    );
    pushCheck(
      checks,
      'project_group_set_default',
      setDefaultGroup.ok && setDefaultGroup.payload?.bindingId === createdBindingId && setDefaultGroup.payload?.isDefault === true,
      truncate(setDefaultGroup.payload),
    );

    const updateGroupStatus = await requestJson(
      `/employees/lushirong/project-groups/${createdBindingId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({
          status: 'archived',
        }),
      },
    );
    pushCheck(
      checks,
      'project_group_status_change',
      updateGroupStatus.ok && updateGroupStatus.payload?.status === 'archived',
      truncate(updateGroupStatus.payload),
    );
  }

  const groupMessageDryRun = await requestJson('/employees/lushirong/actions/send-group-message', {
    method: 'POST',
    body: JSON.stringify({
      chatId: 'oc_demo_group',
      body: 'QA smoke group message',
      dryRun: true,
    }),
  });
  pushCheck(
    checks,
    'group_message_dry_run',
    groupMessageDryRun.ok && groupMessageDryRun.payload?.mode === 'dry-run',
    truncate(groupMessageDryRun.payload),
  );

  const techDocDryRun = await requestJson('/employees/lushirong/actions/create-tech-review-doc', {
    method: 'POST',
    body: JSON.stringify({
      title: 'QA Smoke Tech Review Doc',
      problem: 'Verify dry-run tech review doc flow',
      nextSteps: ['Step 1', 'Step 2'],
      dryRun: true,
    }),
  });
  pushCheck(
    checks,
    'tech_review_doc_dry_run',
    techDocDryRun.ok && techDocDryRun.payload?.mode === 'dry-run',
    truncate(techDocDryRun.payload),
  );

  const techMeetingDryRun = await requestJson('/employees/lushirong/actions/schedule-tech-review', {
    method: 'POST',
    body: JSON.stringify({
      summary: 'QA Smoke Review Meeting',
      description: 'Verify dry-run schedule flow',
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      attendeeIds: ['ou_qa_smoke_attendee'],
      dryRun: true,
    }),
  });
  pushCheck(
    checks,
    'tech_review_meeting_dry_run',
    techMeetingDryRun.ok && techMeetingDryRun.payload?.mode === 'dry-run',
    truncate(techMeetingDryRun.payload),
  );

  const meegoStatus = await requestJson('/employees/lushirong/actions/refresh-meego-status', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  pushCheck(
    checks,
    'meego_status_refresh',
    meegoStatus.ok && typeof meegoStatus.payload?.meego?.authenticated === 'boolean',
    truncate(meegoStatus.payload),
  );

  const meegoLookup = await requestJson('/employees/lushirong/actions/meego-workitem-lookup', {
    method: 'POST',
    body: JSON.stringify({
      lookupType: 'id',
      query: '7329227575',
      projectKey: 'e-commerce',
    }),
  });
  pushCheck(
    checks,
    'meego_workitem_lookup',
    meegoLookup.ok &&
      (meegoLookup.payload?.result?.status === 'success' ||
        meegoLookup.payload?.result?.ok === true),
    truncate(meegoLookup.payload),
  );

  const projectChatLookup = await requestJson('/employees/lushirong/actions/find-project-chat', {
    method: 'POST',
    body: JSON.stringify({
      query: '独立端导流',
    }),
  });
  pushCheck(
    checks,
    'project_chat_lookup',
    projectChatLookup.ok,
    truncate(projectChatLookup.payload),
  );

  const meegoUpdateDryRun = await requestJson('/employees/lushirong/actions/meego-workitem-update', {
    method: 'POST',
    body: JSON.stringify({
      workItemId: '123456',
      projectKey: 'FUNSHOPPING',
      fields: '{"state":"doing"}',
      dryRun: true,
    }),
  });
  pushCheck(
    checks,
    'meego_workitem_update_dry_run',
    meegoUpdateDryRun.ok && meegoUpdateDryRun.payload?.mode === 'dry-run',
    truncate(meegoUpdateDryRun.payload),
  );

  const meegoCommentDryRun = await requestJson('/employees/lushirong/actions/meego-comment-create', {
    method: 'POST',
    body: JSON.stringify({
      workItemId: '123456',
      projectKey: 'FUNSHOPPING',
      commentContent: 'QA smoke meego comment',
      dryRun: true,
    }),
  });
  pushCheck(
    checks,
    'meego_comment_create_dry_run',
    meegoCommentDryRun.ok && meegoCommentDryRun.payload?.mode === 'dry-run',
    truncate(meegoCommentDryRun.payload),
  );

  const directionChange = await requestJson('/employees/lushirong/direction', {
    method: 'POST',
    body: JSON.stringify({
      directionId: 'core-platform',
    }),
  });
  pushCheck(
    checks,
    'employee_direction_change',
    directionChange.ok && directionChange.payload?.directionId === 'core-platform',
    truncate(directionChange.payload),
  );
  const detailAfterDirection = await requestJson('/employees/lushirong');
  pushCheck(
    checks,
    'direction_change_propagates_to_detail',
    detailAfterDirection.ok && detailAfterDirection.payload?.directionId === 'core-platform',
    truncate({
      directionId: detailAfterDirection.payload?.directionId,
      defaultKnowledgeBaseIds: detailAfterDirection.payload?.defaultKnowledgeBaseIds,
    }),
  );

  await requestJson('/employees/lushirong/direction', {
    method: 'POST',
    body: JSON.stringify({
      directionId: 'independent-growth-diversion',
    }),
  });

  const managerProxyReview = await requestJson('/employees/lushirong/manager-proxy-reviews', {
    method: 'POST',
    body: JSON.stringify({
      reviewTopic: 'QA smoke proxy review',
      conclusion: 'QA smoke conclusion',
      nextSteps: ['QA smoke next step'],
    }),
  });
  pushCheck(
    checks,
    'manager_proxy_review_create',
    managerProxyReview.ok && managerProxyReview.payload?.employeeId === 'lushirong',
    truncate(managerProxyReview.payload),
  );

  const resignationEvent = await requestJson('/employees/lushirong/resignation-events', {
    method: 'POST',
    body: JSON.stringify({
      nextIntent: 'low',
      summary: 'QA smoke resignation signal reset',
    }),
  });
  pushCheck(
    checks,
    'resignation_event_create',
    resignationEvent.ok && resignationEvent.payload?.employeeId === 'lushirong',
    truncate(resignationEvent.payload),
  );

  const workItemsBeforeAutonomy = await requestJson('/employees/lushirong/work-items');
  if (workItemsBeforeAutonomy.ok && Array.isArray(workItemsBeforeAutonomy.payload)) {
    for (const item of workItemsBeforeAutonomy.payload.filter((item) => item.status !== 'completed')) {
      await requestJson(`/work-items/${item.workItemId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: 'completed',
        }),
      });
    }
  }

  for (const subdir of ['tasks', 'tasks-processing', 'tasks-processed', 'results', 'results-processed']) {
    await fs.rm(path.join(runtimeRoot, subdir), { recursive: true, force: true }).catch(() => undefined);
  }
  await fs.mkdir(path.join(runtimeRoot, 'tasks'), { recursive: true });
  await fs.mkdir(path.join(runtimeRoot, 'results'), { recursive: true });

  const autonomyRunForWork = await requestJson('/employees/lushirong/actions/run-autonomous-learning', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  pushCheck(
    checks,
    'autonomy_run_after_no_work',
    autonomyRunForWork.ok && autonomyRunForWork.payload?.employeeId === 'lushirong',
    truncate(autonomyRunForWork.payload),
  );

  const workItemsAfterAutonomy = await requestJson('/employees/lushirong/work-items');
  const autonomousWorkItem = workItemsAfterAutonomy.ok && Array.isArray(workItemsAfterAutonomy.payload)
    ? workItemsAfterAutonomy.payload.find((item) => item.status === 'active' && String(item.title).includes('自主巡检'))
    : null;
  pushCheck(
    checks,
    'autonomy_auto_creates_work_item',
    Boolean(autonomousWorkItem),
    autonomousWorkItem ? truncate(autonomousWorkItem) : truncate(workItemsAfterAutonomy.payload),
  );

  const runtimeDispatchesAfterAutonomy = await requestJson('/employees/lushirong/runtime-dispatches');
  const autonomousDispatch = runtimeDispatchesAfterAutonomy.ok && Array.isArray(runtimeDispatchesAfterAutonomy.payload)
    ? runtimeDispatchesAfterAutonomy.payload.find(
        (dispatch) =>
          dispatch.workItemId === autonomousWorkItem?.workItemId &&
          String(dispatch.taskTitle).startsWith('自主推进 · '),
      )
    : null;
  pushCheck(
    checks,
    'autonomy_auto_dispatches_work',
    Boolean(autonomousDispatch),
    autonomousDispatch ? truncate(autonomousDispatch) : truncate(runtimeDispatchesAfterAutonomy.payload),
  );

  if (autonomousWorkItem?.workItemId) {
    await requestJson(`/work-items/${autonomousWorkItem.workItemId}/status`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'blocked',
      }),
    });

    for (const subdir of ['tasks', 'tasks-processing', 'tasks-processed', 'results', 'results-processed']) {
      await fs.rm(path.join(runtimeRoot, subdir), { recursive: true, force: true }).catch(() => undefined);
    }
    await fs.mkdir(path.join(runtimeRoot, 'tasks'), { recursive: true });
    await fs.mkdir(path.join(runtimeRoot, 'results'), { recursive: true });

    const autonomyRunForRecovery = await requestJson('/employees/lushirong/actions/run-autonomous-learning', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    pushCheck(
      checks,
      'autonomy_run_for_recovery',
      autonomyRunForRecovery.ok && autonomyRunForRecovery.payload?.employeeId === 'lushirong',
      truncate(autonomyRunForRecovery.payload),
    );

    const runtimeDispatchesAfterRecovery = await requestJson('/employees/lushirong/runtime-dispatches');
    const recoveryDispatch = runtimeDispatchesAfterRecovery.ok && Array.isArray(runtimeDispatchesAfterRecovery.payload)
      ? runtimeDispatchesAfterRecovery.payload.find(
          (dispatch) =>
            dispatch.workItemId === autonomousWorkItem.workItemId &&
            String(dispatch.taskTitle).startsWith('自我恢复 · '),
        )
      : null;
    pushCheck(
      checks,
      'autonomy_generates_recovery_dispatch',
      Boolean(recoveryDispatch),
      recoveryDispatch ? truncate(recoveryDispatch) : truncate(runtimeDispatchesAfterRecovery.payload),
    );

    const peerMessages = await requestJson('/employees/zhouyongkang/internal-messages');
    const peerSyncMessage =
      peerMessages.ok && Array.isArray(peerMessages.payload)
        ? peerMessages.payload.find(
            (message) =>
              message.senderEmployeeId === 'lushirong' &&
              message.recipientEmployeeId === 'zhouyongkang' &&
              String(message.body).includes(`[auto-peer-sync:${autonomousWorkItem.workItemId}]`),
          )
        : null;
    pushCheck(
      checks,
      'autonomy_peer_sync_message_created',
      Boolean(peerSyncMessage),
      peerSyncMessage ? truncate(peerSyncMessage) : truncate(peerMessages.payload),
    );
  }

  const runtimeStop = await requestJson('/employees/lushirong/runtime/stop', {
    method: 'POST',
  });
  pushCheck(
    checks,
    'runtime_stop_lushirong',
    runtimeStop.ok && runtimeStop.payload?.runtime?.status === 'stopped',
    truncate(runtimeStop.payload),
  );

  const passed = checks.filter((check) => check.status === 'PASS').length;
  const failed = checks.length - passed;
  const finishedAt = new Date().toISOString();
  const report = {
    baseUrl,
    startedAt,
    finishedAt,
    summary: {
      total: checks.length,
      passed,
      failed,
    },
    checks,
  };

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'latest-local-smoke.json'), JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(
    path.join(reportsDir, 'latest-local-smoke.md'),
    [
      '# RDLeader Local Smoke Report',
      '',
      `- startedAt: ${startedAt}`,
      `- finishedAt: ${finishedAt}`,
      `- baseUrl: ${baseUrl}`,
      `- passed: ${passed}/${checks.length}`,
      '',
      '| Check | Status | Detail |',
      '|---|---|---|',
      ...checks.map((check) => `| ${check.name} | ${check.status} | ${String(check.detail).replace(/\n/g, '<br/>')} |`),
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(JSON.stringify(report, null, 2));
  return failed === 0 ? 0 : 1;
}

main()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch(async (error) => {
    await fs.mkdir(reportsDir, { recursive: true });
    const failure = {
      startedAt: new Date().toISOString(),
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    };
    await fs.writeFile(path.join(reportsDir, 'latest-local-smoke-error.json'), JSON.stringify(failure, null, 2), 'utf8');
    console.error(failure.error);
    process.exitCode = 1;
  });
