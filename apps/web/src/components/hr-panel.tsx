import { useEffect, useMemo, useState } from 'react';
import {
  createCandidate,
  createCandidateInterview,
  convertCandidateToEmployee,
  getCandidateInterviewChat,
  getCandidateInterviews,
  getCandidateLifecycle,
  getCandidates,
  getDirectionConfig,
  sendCandidateInterviewMessage,
  updateCandidateDecision,
  updateDirectionConfig,
  updateEmployeeDirection,
  updateEmployeeLevel,
  updateEmploymentStatus,
  type CandidateInterviewChatMessage,
  type CandidateInterview,
  type CandidateLifecycleEvent,
  type DirectionConfig,
  type DirectionDefinition,
} from '../lib/api';

type CandidateStatus = 'interviewing' | 'offered' | 'rejected' | 'hired';

type CandidateListItem = {
  candidateId: string;
  name: string;
  interviewNotes?: string;
  status: CandidateStatus;
};

const INTERVIEW_PROMPT_PRESETS = [
  '请先做个自我介绍。',
  '讲一个你最有代表性的项目，重点说你的角色和结果。',
  '如果要跨团队推进一个复杂项目，你会怎么拉齐节奏？',
  '遇到高压排期和阻塞时，你一般怎么处理？',
];

type InterviewWorkspaceEntry = {
  key: string;
  sortValue: number;
  toneClassName: string;
  title: string;
  meta: string;
  summary: string;
};

function normalizeStringList(items: unknown) {
  return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function parseMultilineList(input: string) {
  return input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function candidateBadgeClass(status: CandidateStatus) {
  if (status === 'offered' || status === 'hired') {
    return 'ops-badge--success';
  }

  if (status === 'rejected') {
    return 'ops-badge--failed';
  }

  return 'ops-badge--warning';
}

function candidateStatusLabel(status: CandidateStatus) {
  if (status === 'offered') return '已通过';
  if (status === 'rejected') return '已拒绝';
  if (status === 'hired') return '已录用';
  return '面试中';
}

function employmentStatusLabel(status: string) {
  if (status === 'active') return '在职';
  if (status === 'fired') return '已解雇';
  if (status === 'resigned') return '已离职';
  return status || '-';
}

function candidateStatusRank(status: CandidateStatus) {
  if (status === 'interviewing') return 0;
  if (status === 'offered') return 1;
  if (status === 'hired') return 2;
  return 3;
}

function buildSuggestedEmployeeId(candidate?: CandidateListItem | null) {
  if (!candidate) return '';

  const normalizedName = candidate.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalizedName) {
    return normalizedName;
  }

  return `newhire-${candidate.candidateId.replace(/^candidate-/, '')}`;
}

function formatTimelineTime(value?: string | null) {
  if (!value) return '待补时间';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function toSortValue(value?: string | null) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function candidateChatRoleLabel(role: CandidateInterviewChatMessage['role'], candidateName: string) {
  if (role === 'candidate') {
    return `${candidateName}（AI 候选人）`;
  }

  if (role === 'interviewer') {
    return '你（面试官）';
  }

  return '系统提示';
}

function candidateChatToneClass(role: CandidateInterviewChatMessage['role']) {
  if (role === 'candidate') {
    return 'hr-chat-bubble--candidate';
  }

  if (role === 'interviewer') {
    return 'hr-chat-bubble--interviewer';
  }

  return 'hr-chat-bubble--system';
}

function buildInterviewSummaryFromMessages(messages: CandidateInterviewChatMessage[]) {
  const recentMessages = messages.filter((message) => message.role !== 'system').slice(-6);
  if (recentMessages.length === 0) {
    return '';
  }

  return recentMessages
    .map((message) => `${message.role === 'interviewer' ? '面试官追问' : '候选人回答'}：${message.body}`)
    .join('；');
}

function buildCurrentInterviewTimestamp() {
  return new Date().toISOString().slice(0, 16);
}

export function HrPanel(props: {
  employeeId: string;
  currentLevel: '1-2' | '2-1' | '2-2';
  employmentStatus: string;
  currentDirectionId: string;
  currentDefaultKnowledgeBaseIds: string[];
  directions: DirectionDefinition[];
  onLevelChange: (level: '1-2' | '2-1' | '2-2') => void;
  onEmploymentStatusChange: (employmentStatus: string) => void;
  onDirectionChange: (payload: {
    directionId: string;
    defaultKnowledgeBaseIds: string[];
    directionConfig: DirectionConfig;
  }) => void;
  onDirectionConfigChange: (payload: {
    directionId: string;
    defaultKnowledgeBaseIds: string[];
    directionConfig: DirectionConfig;
  }) => void;
  onEmployeeHired: (payload: {
    employeeId: string;
    displayName: string;
    level: '1-2' | '2-1' | '2-2';
    directionId: string;
    defaultKnowledgeBaseIds: string[];
  }) => void;
}) {
  const [candidateName, setCandidateName] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState(props.currentDirectionId);
  const [directionKnowledgeBases, setDirectionKnowledgeBases] = useState(props.currentDefaultKnowledgeBaseIds.join('\n'));
  const [hireEmployeeId, setHireEmployeeId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [interviewStage, setInterviewStage] = useState('');
  const [interviewScheduledAt, setInterviewScheduledAt] = useState('');
  const [interviewSummary, setInterviewSummary] = useState('');
  const [interviewRecommendation, setInterviewRecommendation] = useState<'hire' | 'hold' | 'reject'>('hold');
  const [chatDraft, setChatDraft] = useState('');
  const [candidateActionError, setCandidateActionError] = useState('');
  const [candidateActionNotice, setCandidateActionNotice] = useState('');
  const [employeeActionError, setEmployeeActionError] = useState('');
  const [employeeActionNotice, setEmployeeActionNotice] = useState('');
  const [candidateActionBusy, setCandidateActionBusy] = useState(false);
  const [employeeActionBusy, setEmployeeActionBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<CandidateInterviewChatMessage[]>([]);
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [candidateLifecycle, setCandidateLifecycle] = useState<CandidateLifecycleEvent[]>([]);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.candidateId === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );

  const candidateGroups = useMemo(() => {
    const sorted = [...candidates].sort((left, right) => {
      const rankDiff = candidateStatusRank(left.status) - candidateStatusRank(right.status);
      if (rankDiff !== 0) return rankDiff;
      return left.name.localeCompare(right.name, 'zh-CN');
    });

    return {
      active: sorted.filter((candidate) => candidate.status !== 'rejected'),
      rejected: sorted.filter((candidate) => candidate.status === 'rejected'),
    };
  }, [candidates]);

  const interviewTimeline = useMemo<InterviewWorkspaceEntry[]>(() => {
    const interviewEntries = interviews.map((interview) => ({
      key: interview.interviewId,
      sortValue: toSortValue(interview.createdAt || interview.scheduledAt),
      toneClassName: 'hr-chat-bubble--interviewer',
      title: `面试：${interview.stage} · ${interview.recommendation} · ${interview.scheduledAt}`,
      meta: `记录时间：${formatTimelineTime(interview.createdAt)}`,
      summary: interview.summary,
    }));

    const lifecycleEntries = candidateLifecycle.map((event) => ({
      key: event.eventId,
      sortValue: toSortValue(event.createdAt),
      toneClassName: 'hr-chat-bubble--system',
      title: `${event.eventType} · ${candidateStatusLabel(event.status)}`,
      meta: `流程：${event.summary}`,
      summary: `记录时间：${formatTimelineTime(event.createdAt)}`,
    }));

    return [...interviewEntries, ...lifecycleEntries].sort((left, right) => left.sortValue - right.sortValue);
  }, [candidateLifecycle, interviews]);

  const candidateStats = useMemo(() => {
    const counts = {
      interviewing: 0,
      offered: 0,
      rejected: 0,
      hired: 0,
    };

    for (const candidate of candidates) {
      counts[candidate.status] += 1;
    }

    return {
      ...counts,
      total: candidates.length,
      selectedInterviewCount: interviews.length,
      selectedTimelineCount: interviewTimeline.length,
    };
  }, [candidates, interviewTimeline.length, interviews.length]);

  useEffect(() => {
    void getCandidates().then((payload) => setCandidates(Array.isArray(payload) ? payload : []));
  }, []);

  useEffect(() => {
    setSelectedCandidateId((current) => {
      if (current && candidates.some((candidate) => candidate.candidateId === current)) {
        return current;
      }

      return candidateGroups.active[0]?.candidateId || candidates[0]?.candidateId || '';
    });
  }, [candidateGroups.active, candidates]);

  useEffect(() => {
    setSelectedDirectionId(props.currentDirectionId);
  }, [props.currentDirectionId]);

  useEffect(() => {
    if (!selectedDirectionId) {
      setDirectionKnowledgeBases('');
      return;
    }

    let active = true;

    void getDirectionConfig(selectedDirectionId).then((config) => {
      if (!active) return;
      setDirectionKnowledgeBases(normalizeStringList(config.defaultKnowledgeBaseIds).join('\n'));
    });

    return () => {
      active = false;
    };
  }, [selectedDirectionId]);

  useEffect(() => {
    const currentCandidate = candidates.find((candidate) => candidate.candidateId === selectedCandidateId);

    if (!currentCandidate) {
      setChatMessages([]);
      setInterviews([]);
      setCandidateLifecycle([]);
      setHireEmployeeId('');
      setChatDraft('');
      return;
    }

    setHireEmployeeId(buildSuggestedEmployeeId(currentCandidate));

    let active = true;

    void Promise.all([
      getCandidateInterviewChat(currentCandidate.candidateId),
      getCandidateInterviews(currentCandidate.candidateId),
      getCandidateLifecycle(currentCandidate.candidateId),
    ]).then(
      ([chatPayload, interviewPayload, lifecyclePayload]) => {
        if (!active) return;
        setChatMessages(Array.isArray(chatPayload) ? chatPayload : []);
        setInterviews(Array.isArray(interviewPayload) ? interviewPayload : []);
        setCandidateLifecycle(Array.isArray(lifecyclePayload) ? lifecyclePayload : []);
      },
    );

    return () => {
      active = false;
    };
  }, [selectedCandidateId]);

  async function refreshCandidateContext(candidateId: string) {
    const [chatPayload, interviewPayload, lifecyclePayload] = await Promise.all([
      getCandidateInterviewChat(candidateId),
      getCandidateInterviews(candidateId),
      getCandidateLifecycle(candidateId),
    ]);
    setChatMessages(Array.isArray(chatPayload) ? chatPayload : []);
    setInterviews(Array.isArray(interviewPayload) ? interviewPayload : []);
    setCandidateLifecycle(Array.isArray(lifecyclePayload) ? lifecyclePayload : []);
  }

  async function runCandidateAction(action: () => Promise<void>) {
    setCandidateActionBusy(true);
    setCandidateActionError('');
    setCandidateActionNotice('');
    try {
      await action();
    } catch (error) {
      setCandidateActionError(error instanceof Error ? error.message : '候选人操作失败');
    } finally {
      setCandidateActionBusy(false);
    }
  }

  async function runEmployeeAction(action: () => Promise<void>) {
    setEmployeeActionBusy(true);
    setEmployeeActionError('');
    setEmployeeActionNotice('');
    try {
      await action();
    } catch (error) {
      setEmployeeActionError(error instanceof Error ? error.message : '员工操作失败');
    } finally {
      setEmployeeActionBusy(false);
    }
  }

  async function addCandidate() {
    if (!candidateName.trim()) {
      setCandidateActionError('请先填写候选人姓名');
      return;
    }

    await runCandidateAction(async () => {
      const payload = await createCandidate({ name: candidateName.trim(), interviewNotes });
      const nextCandidate = payload.candidate as CandidateListItem;
      setCandidates((current) => [nextCandidate, ...current]);
      setSelectedCandidateId(nextCandidate.candidateId);
      setHireEmployeeId(buildSuggestedEmployeeId(nextCandidate));
      setCandidateName('');
      setInterviewNotes('');
      await refreshCandidateContext(nextCandidate.candidateId);
      setCandidateActionNotice(`已创建候选人 ${nextCandidate.name}，可以直接在右侧面试工作台继续推进。`);
    });
  }

  async function sendInterviewQuestion(nextBody?: string) {
    const messageBody = (nextBody ?? chatDraft).trim();

    if (!selectedCandidateId) {
      setCandidateActionError('请先选择候选人');
      return;
    }

    if (!messageBody) {
      setCandidateActionError('请输入面试问题');
      return;
    }

    await runCandidateAction(async () => {
      const payload = await sendCandidateInterviewMessage(selectedCandidateId, {
        body: messageBody,
      });
      setChatMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setChatDraft('');
      setInterviewStage((current) => current.trim() || 'ai-chat-round');
      setInterviewScheduledAt((current) => current.trim() || buildCurrentInterviewTimestamp());
      setCandidateActionNotice('AI 候选人已作答，可以继续追问，或把最近对话整理成面试纪要。');
    });
  }

  function fillInterviewSummaryFromChat() {
    const nextSummary = buildInterviewSummaryFromMessages(chatMessages);
    if (!nextSummary) {
      setCandidateActionError('当前还没有可整理的聊天内容');
      return;
    }

    setCandidateActionError('');
    setCandidateActionNotice('已把最近对话回填到面试记录摘要，接下来可直接点“记录面试”。');
    setInterviewSummary(nextSummary);
    setInterviewStage((current) => current.trim() || 'ai-chat-round');
    setInterviewScheduledAt((current) => current.trim() || buildCurrentInterviewTimestamp());
  }

  async function addInterview(passImmediately: boolean = false) {
    if (!selectedCandidateId) {
      setCandidateActionError('请先选择候选人');
      return;
    }

    if (!interviewStage.trim() || !interviewScheduledAt.trim() || !interviewSummary.trim()) {
      setCandidateActionError('请完整填写面试轮次、面试时间和面试记录摘要');
      return;
    }

    await runCandidateAction(async () => {
      await createCandidateInterview(selectedCandidateId, {
        stage: interviewStage.trim(),
        scheduledAt: interviewScheduledAt.trim(),
        summary: interviewSummary.trim(),
        recommendation: interviewRecommendation,
      });
      await refreshCandidateContext(selectedCandidateId);

      if (passImmediately) {
        await updateCandidateDecision(selectedCandidateId, 'offered');
        setCandidates((current) =>
          current.map((candidate) =>
            candidate.candidateId === selectedCandidateId ? { ...candidate, status: 'offered' } : candidate,
          ),
        );
        await refreshCandidateContext(selectedCandidateId);
      }

      setInterviewStage('');
      setInterviewScheduledAt('');
      setInterviewSummary('');
      setInterviewRecommendation('hold');
      setCandidateActionNotice(passImmediately ? '已记录面试并通过，候选人已进入 Offer 阶段。' : '已记录一轮面试。');
    });
  }

  async function decideCandidate(candidateId: string, status: 'offered' | 'rejected') {
    const candidate = candidates.find((item) => item.candidateId === candidateId);
    if (!candidate) return;

    if (candidate.status === 'hired') {
      setCandidateActionError('候选人已经录用为员工，不能再次修改招聘结论');
      return;
    }

    if (candidate.status === status) {
      setCandidateActionNotice(status === 'offered' ? '候选人已经处于通过状态。' : '候选人已经处于拒绝状态。');
      return;
    }

    await runCandidateAction(async () => {
      await updateCandidateDecision(candidateId, status);
      setCandidates((current) =>
        current.map((item) => (item.candidateId === candidateId ? { ...item, status } : item)),
      );
      if (candidateId === selectedCandidateId) {
        await refreshCandidateContext(candidateId);
      }
      setCandidateActionNotice(status === 'offered' ? '候选人已通过面试，进入 Offer 阶段。' : '候选人已标记为拒绝。');
    });
  }

  async function hireCandidate(candidateId: string, candidateName: string) {
    if (!selectedDirectionId) {
      setCandidateActionError('请先确定录用方向');
      return;
    }

    const candidate = candidates.find((item) => item.candidateId === candidateId);
    if (!candidate) return;

    if (candidate.status === 'hired') {
      setCandidateActionNotice('该候选人已经完成录用，可直接在左侧员工花名册查看。');
      return;
    }

    const employeeId = hireEmployeeId.trim() || buildSuggestedEmployeeId(candidate);

    await runCandidateAction(async () => {
      const payload = await convertCandidateToEmployee(candidateId, {
        employeeId,
        directionId: selectedDirectionId,
        level: '1-2',
      });
      setCandidates((current) =>
        current.map((item) => (item.candidateId === candidateId ? { ...item, status: 'hired' } : item)),
      );
      props.onEmployeeHired({
        employeeId: payload.employee.employeeId,
        displayName: payload.employee.displayName ?? candidateName,
        level: payload.employee.level,
        directionId: payload.employee.directionId,
        defaultKnowledgeBaseIds: payload.employee.defaultKnowledgeBaseIds ?? [],
      });
      if (candidateId === selectedCandidateId) {
        await refreshCandidateContext(candidateId);
      }
      setHireEmployeeId(payload.employee.employeeId);
      setCandidateActionNotice(`已录用为员工 ${payload.employee.employeeId}，左侧花名册会立即新增这名员工。`);
    });
  }

  async function promoteTo22() {
    await runEmployeeAction(async () => {
      const payload = await updateEmployeeLevel(props.employeeId, '2-2');
      props.onLevelChange(payload.level);
      setEmployeeActionNotice('已将当前员工晋升到 2-2。');
    });
  }

  async function fireEmployee() {
    await runEmployeeAction(async () => {
      const payload = await updateEmploymentStatus(props.employeeId, 'fired');
      props.onEmploymentStatusChange(payload.employmentStatus);
      setEmployeeActionNotice('已将当前员工标记为解雇；左侧花名册默认会隐藏已解雇员工。');
    });
  }

  async function saveDirection() {
    if (!selectedDirectionId) return;

    await runEmployeeAction(async () => {
      await updateEmployeeDirection(props.employeeId, selectedDirectionId);
      const config = await getDirectionConfig(selectedDirectionId);
      props.onDirectionChange({
        directionId: selectedDirectionId,
        defaultKnowledgeBaseIds: normalizeStringList(config.defaultKnowledgeBaseIds),
        directionConfig: {
          ...config,
          directionId: selectedDirectionId,
          defaultKnowledgeBaseIds: normalizeStringList(config.defaultKnowledgeBaseIds),
        },
      });
      setEmployeeActionNotice('已更新员工方向。');
    });
  }

  async function saveDirectionKnowledgeBases() {
    if (!selectedDirectionId) return;

    await runEmployeeAction(async () => {
      const payload = { defaultKnowledgeBaseIds: parseMultilineList(directionKnowledgeBases) };
      const config = await updateDirectionConfig(selectedDirectionId, payload);
      const defaultKnowledgeBaseIds = normalizeStringList(config.defaultKnowledgeBaseIds ?? payload.defaultKnowledgeBaseIds);
      setDirectionKnowledgeBases(defaultKnowledgeBaseIds.join('\n'));
      props.onDirectionConfigChange({
        directionId: selectedDirectionId,
        defaultKnowledgeBaseIds,
        directionConfig: {
          ...config,
          directionId: selectedDirectionId,
          defaultKnowledgeBaseIds,
        },
      });
      setEmployeeActionNotice('已保存方向知识库配置。');
    });
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">人员治理</p>
          <h3>人员治理</h3>
        </div>
        <span className="inline-state inline-state--light">职级 {props.currentLevel}</span>
      </div>
      <div className="ops-form-grid ops-form-grid--segmented hr-governance-grid">
        <div className="ops-segment">
          <h4>员工档案</h4>
          <p>当前职级：{props.currentLevel}</p>
          <p>在职状态：{employmentStatusLabel(props.employmentStatus)}</p>
          <p>当前方向：{props.currentDirectionId}</p>
          <div className="ops-actions">
            <button disabled={employeeActionBusy} onClick={() => void promoteTo22()}>晋升到 2-2</button>
            <button disabled={employeeActionBusy} onClick={() => void fireEmployee()}>解雇员工</button>
          </div>
          {employeeActionNotice ? <p className="ops-inline-success">{employeeActionNotice}</p> : null}
          {employeeActionError ? <p role="alert" className="ops-inline-error">{employeeActionError}</p> : null}
        </div>

        <div className="ops-segment">
          <h4>员工方向</h4>
          <label className="ops-field-label">
            <span>员工方向</span>
            <select value={selectedDirectionId} onChange={(event) => setSelectedDirectionId(event.target.value)}>
              {props.directions.map((direction) => (
                <option key={direction.directionId} value={direction.directionId}>{direction.displayName}</option>
              ))}
            </select>
          </label>
          <div className="ops-actions">
            <button disabled={employeeActionBusy} onClick={() => void saveDirection()}>更新员工方向</button>
          </div>
          <label className="ops-field-label">
            <span>默认知识库（每行一条）</span>
            <textarea
              placeholder="默认知识库（每行一条）"
              value={directionKnowledgeBases}
              onChange={(event) => setDirectionKnowledgeBases(event.target.value)}
            />
          </label>
          <div className="ops-actions">
            <button disabled={employeeActionBusy} onClick={() => void saveDirectionKnowledgeBases()}>保存方向知识库配置</button>
          </div>
        </div>

        <div className="ops-segment">
          <h4>候选人录入</h4>
          <p className="ops-inline-note">先录候选人，再在右侧面试工作台持续追问、记录和录用。</p>
          <input placeholder="候选人姓名" value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
          <textarea
            placeholder="面试记录"
            value={interviewNotes}
            onChange={(event) => setInterviewNotes(event.target.value)}
          />
          <div className="ops-actions">
            <button disabled={candidateActionBusy} onClick={() => void addCandidate()}>添加候选人</button>
          </div>
        </div>
      </div>

      <div className="hr-signal-strip">
        <article className="hr-signal-card">
          <span>候选人总数</span>
          <strong>{candidateStats.total}</strong>
          <p>当前招聘池规模</p>
        </article>
        <article className="hr-signal-card">
          <span>面试中</span>
          <strong>{candidateStats.interviewing}</strong>
          <p>仍在推进中的候选人</p>
        </article>
        <article className="hr-signal-card">
          <span>已通过</span>
          <strong>{candidateStats.offered}</strong>
          <p>待录用 / 待安排入职</p>
        </article>
        <article className="hr-signal-card">
          <span>已录用</span>
          <strong>{candidateStats.hired}</strong>
          <p>已转成员工档案</p>
        </article>
        <article className="hr-signal-card">
          <span>当前面试工作量</span>
          <strong>{selectedCandidate ? candidateStats.selectedInterviewCount : 0}</strong>
          <p>{selectedCandidate ? `${selectedCandidate.name} 的面试记录数` : '选择候选人后显示'}</p>
        </article>
      </div>

      <div className="hr-workspace">
        <div className="ops-segment hr-workspace__candidates">
          <div className="hr-workspace__header">
            <div>
              <h4>候选人漏斗</h4>
              <p className="ops-inline-note">支持直接点击候选人进入右侧面试窗口。</p>
            </div>
            <span className="ops-badge ops-badge--neutral">{candidates.length} 人</span>
          </div>
          <label className="ops-field-label">
            <span>面试候选人</span>
            <select aria-label="面试候选人" value={selectedCandidateId} onChange={(event) => setSelectedCandidateId(event.target.value)}>
              <option value="">选择候选人</option>
              {candidates.map((candidate) => (
                <option key={candidate.candidateId} value={candidate.candidateId}>{candidate.name}</option>
              ))}
            </select>
          </label>
          {candidates.length === 0 ? (
            <div className="hr-empty-state">
              <strong>还没有候选人</strong>
              <p>先在上面录入候选人，再进入右侧面试工作台继续推进。</p>
            </div>
          ) : (
            <>
              <ul className="hr-candidate-list">
                {candidateGroups.active.map((candidate) => (
                  <li key={candidate.candidateId}>
                    <button
                      type="button"
                      className={`hr-candidate-button${candidate.candidateId === selectedCandidateId ? ' hr-candidate-button--selected' : ''}`}
                    onClick={() => setSelectedCandidateId(candidate.candidateId)}
                  >
                    <div className="hr-candidate-button__header">
                      <strong>候选人：{candidate.name}（{candidateStatusLabel(candidate.status)}）</strong>
                      <span className={`ops-badge ${candidateBadgeClass(candidate.status)}`}>{candidateStatusLabel(candidate.status)}</span>
                    </div>
                    <p>{candidate.interviewNotes?.trim() || '暂无初始备注，可直接开始面试。'}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {candidateGroups.rejected.length > 0 ? (
                <details className="hr-candidate-archive" open={selectedCandidate?.status === 'rejected'}>
                  <summary>已拒绝候选人 · {candidateGroups.rejected.length}</summary>
                  <ul className="hr-candidate-list hr-candidate-list--archive">
                    {candidateGroups.rejected.map((candidate) => (
                      <li key={candidate.candidateId}>
                        <button
                          type="button"
                          className={`hr-candidate-button${candidate.candidateId === selectedCandidateId ? ' hr-candidate-button--selected' : ''}`}
                          onClick={() => setSelectedCandidateId(candidate.candidateId)}
                        >
                          <div className="hr-candidate-button__header">
                            <strong>候选人：{candidate.name}（{candidateStatusLabel(candidate.status)}）</strong>
                            <span className={`ops-badge ${candidateBadgeClass(candidate.status)}`}>{candidateStatusLabel(candidate.status)}</span>
                          </div>
                          <p>{candidate.interviewNotes?.trim() || '暂无初始备注，可直接开始面试。'}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </div>

        <div className="ops-segment hr-workspace__console">
          <div className="hr-workspace__header">
            <div>
              <h4>面试工作台</h4>
              <p className="ops-inline-note">这里是聊天式面试窗口：记录一轮面试、直接通过、再录用为员工。</p>
            </div>
            {selectedCandidate ? (
              <span className={`ops-badge ${candidateBadgeClass(selectedCandidate.status)}`}>{candidateStatusLabel(selectedCandidate.status)}</span>
            ) : null}
          </div>

          {selectedCandidate ? (
            <>
              <div className="hr-candidate-summary">
                <div>
                  <p className="eyebrow">当前候选人</p>
                  <strong>{selectedCandidate.name}</strong>
                </div>
                <div className="hr-candidate-summary__meta">
                  <span>建议员工 ID：</span>
                  <code>{buildSuggestedEmployeeId(selectedCandidate)}</code>
                </div>
              </div>

              <div className="hr-note-card">
                <strong>候选人背景备注</strong>
                <p>{selectedCandidate.interviewNotes?.trim() || '暂无背景备注，建议至少补一条候选人基础画像。'}</p>
              </div>

              <div className="hr-chat-panel">
                <div className="hr-chat-panel__header">
                  <div>
                    <strong>AI 候选人聊天面试</strong>
                    <p>候选人会基于录入备注和历史面试记录模拟作答，你可以直接追问项目、协作、压力和技术判断。</p>
                  </div>
                </div>

                <div className="hr-chat-stream" aria-label="AI 候选人聊天记录">
                  {chatMessages.length === 0 ? (
                    <div className="hr-empty-state">
                      <strong>聊天记录为空</strong>
                      <p>先发一个面试问题，例如“请先做个自我介绍”。</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <article key={message.messageId} className={`hr-chat-bubble ${candidateChatToneClass(message.role)}`}>
                        <strong>{candidateChatRoleLabel(message.role, selectedCandidate.name)}</strong>
                        <p>{formatTimelineTime(message.createdAt)}</p>
                        <p>{message.body}</p>
                      </article>
                    ))
                  )}
                </div>

                <div className="hr-chat-preset-grid">
                  {INTERVIEW_PROMPT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      disabled={candidateActionBusy}
                      type="button"
                      onClick={() => void sendInterviewQuestion(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="输入你的面试问题，例如：请先做个自我介绍，并讲一个你最有代表性的项目。"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                />
                <div className="ops-actions">
                  <button disabled={candidateActionBusy} onClick={() => void sendInterviewQuestion()}>发送问题</button>
                  <button disabled={candidateActionBusy} onClick={() => fillInterviewSummaryFromChat()}>用最近对话生成面试纪要</button>
                </div>
              </div>

              <div className="hr-form-grid hr-form-grid--interview">
                <input
                  placeholder="录用员工ID"
                  value={hireEmployeeId}
                  onChange={(event) => setHireEmployeeId(event.target.value)}
                />
                <input
                  placeholder="面试轮次"
                  value={interviewStage}
                  onChange={(event) => setInterviewStage(event.target.value)}
                />
                <input
                  placeholder="面试时间"
                  value={interviewScheduledAt}
                  onChange={(event) => setInterviewScheduledAt(event.target.value)}
                />
                <input
                  placeholder="面试建议（hire / hold / reject）"
                  value={interviewRecommendation}
                  onChange={(event) => setInterviewRecommendation(event.target.value as 'hire' | 'hold' | 'reject')}
                />
                <textarea
                  placeholder="面试记录摘要"
                  value={interviewSummary}
                  onChange={(event) => setInterviewSummary(event.target.value)}
                />
              </div>

              <div className="ops-actions">
                <button disabled={candidateActionBusy} onClick={() => void addInterview()}>记录面试</button>
                <button disabled={candidateActionBusy} onClick={() => void addInterview(true)}>记录并通过面试</button>
                <button disabled={candidateActionBusy} onClick={() => void decideCandidate(selectedCandidate.candidateId, 'offered')}>通过面试</button>
                <button disabled={candidateActionBusy} onClick={() => void decideCandidate(selectedCandidate.candidateId, 'rejected')}>拒绝候选人</button>
                <button disabled={candidateActionBusy} onClick={() => void hireCandidate(selectedCandidate.candidateId, selectedCandidate.name)}>录用为员工</button>
              </div>

              {candidateActionNotice ? <p className="ops-inline-success">{candidateActionNotice}</p> : null}
              {candidateActionError ? <p role="alert" className="ops-inline-error">{candidateActionError}</p> : null}

              <div className="hr-chat-stream" aria-label="候选人面试时间线">
                {interviewTimeline.length === 0 ? (
                  <div className="hr-empty-state">
                    <strong>还没有面试记录</strong>
                    <p>先输入一轮面试结论，或者直接点击“通过面试”。</p>
                  </div>
                ) : (
                  interviewTimeline.map((entry) => (
                    <article key={entry.key} className={`hr-chat-bubble ${entry.toneClassName}`}>
                      <strong>{entry.title}</strong>
                      <p>{entry.meta}</p>
                      <p>{entry.summary}</p>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="hr-empty-state">
              <strong>请选择候选人</strong>
              <p>点击左侧候选人卡片，就可以在这里继续聊天式面试和录用流转。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
