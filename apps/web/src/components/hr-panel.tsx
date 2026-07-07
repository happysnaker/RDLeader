import { useEffect, useState } from 'react';
import {
  createCandidate,
  createCandidateInterview,
  convertCandidateToEmployee,
  getCandidateInterviews,
  getCandidates,
  getDirectionConfig,
  updateCandidateDecision,
  updateDirectionConfig,
  updateEmployeeDirection,
  updateEmployeeLevel,
  updateEmploymentStatus,
  type DirectionConfig,
  type DirectionDefinition,
} from '../lib/api';

function normalizeStringList(items: unknown) {
  return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function parseMultilineList(input: string) {
  return input
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [candidates, setCandidates] = useState<Array<{ candidateId: string; name: string; status: string }>>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState(props.currentDirectionId);
  const [directionKnowledgeBases, setDirectionKnowledgeBases] = useState(props.currentDefaultKnowledgeBaseIds.join('\n'));
  const [hireEmployeeId, setHireEmployeeId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [interviewStage, setInterviewStage] = useState('');
  const [interviewScheduledAt, setInterviewScheduledAt] = useState('');
  const [interviewSummary, setInterviewSummary] = useState('');
  const [interviewRecommendation, setInterviewRecommendation] = useState<'hire' | 'hold' | 'reject'>('hold');
  const [candidateActionError, setCandidateActionError] = useState('');
  const [interviews, setInterviews] = useState<
    Array<{ interviewId: string; candidateId: string; stage: string; scheduledAt: string; summary: string; recommendation: string }>
  >([]);

  useEffect(() => {
    void getCandidates().then(setCandidates);
  }, []);

  useEffect(() => {
    setSelectedCandidateId((current) => current || candidates[0]?.candidateId || '');
  }, [candidates]);

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
    if (!selectedCandidateId) {
      setInterviews([]);
      return;
    }

    let active = true;

    void getCandidateInterviews(selectedCandidateId).then((payload) => {
      if (!active) return;
      setInterviews(Array.isArray(payload) ? payload : []);
    });

    return () => {
      active = false;
    };
  }, [selectedCandidateId]);

  async function addCandidate() {
    if (!candidateName.trim()) return;
    const payload = await createCandidate({
      name: candidateName,
      interviewNotes,
    });
    setCandidates((current) => [...current, payload.candidate]);
    setCandidateActionError('');
    setCandidateName('');
    setInterviewNotes('');
  }

  async function addInterview() {
    if (!selectedCandidateId || !interviewStage.trim() || !interviewScheduledAt.trim() || !interviewSummary.trim()) return;

    const interview = await createCandidateInterview(selectedCandidateId, {
      stage: interviewStage.trim(),
      scheduledAt: interviewScheduledAt.trim(),
      summary: interviewSummary.trim(),
      recommendation: interviewRecommendation,
    });
    setInterviews((current) => [interview, ...current]);
    setCandidateActionError('');
    setInterviewStage('');
    setInterviewScheduledAt('');
    setInterviewSummary('');
    setInterviewRecommendation('hold');
  }

  async function decideCandidate(candidateId: string, status: 'offered' | 'rejected') {
    await updateCandidateDecision(candidateId, status);
    setCandidateActionError('');
    setCandidates((current) =>
      current.map((candidate) => (candidate.candidateId === candidateId ? { ...candidate, status } : candidate)),
    );
  }

  async function hireCandidate(candidateId: string, candidateName: string) {
    if (!hireEmployeeId.trim() || !selectedDirectionId) return;

    try {
      const payload = await convertCandidateToEmployee(candidateId, {
        employeeId: hireEmployeeId.trim(),
        directionId: selectedDirectionId,
        level: '1-2',
      });
      setCandidates((current) =>
        current.map((candidate) => (candidate.candidateId === candidateId ? { ...candidate, status: 'hired' } : candidate)),
      );
      props.onEmployeeHired({
        employeeId: payload.employee.employeeId,
        displayName: payload.employee.displayName ?? candidateName,
        level: payload.employee.level,
        directionId: payload.employee.directionId,
        defaultKnowledgeBaseIds: payload.employee.defaultKnowledgeBaseIds ?? [],
      });
      setCandidateActionError('');
      setHireEmployeeId('');
    } catch (error) {
      setCandidateActionError(error instanceof Error ? error.message : '录用失败');
    }
  }

  async function promoteTo22() {
    const payload = await updateEmployeeLevel(props.employeeId, '2-2');
    props.onLevelChange(payload.level);
  }

  async function fireEmployee() {
    const payload = await updateEmploymentStatus(props.employeeId, 'fired');
    props.onEmploymentStatusChange(payload.employmentStatus);
  }

  async function saveDirection() {
    if (!selectedDirectionId) return;
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
  }

  async function saveDirectionKnowledgeBases() {
    if (!selectedDirectionId) return;
    const payload = {
      defaultKnowledgeBaseIds: parseMultilineList(directionKnowledgeBases),
    };
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
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>管理</h3>
      <p>当前职级：{props.currentLevel}</p>
      <p>在职状态：{props.employmentStatus}</p>
      <p>当前方向：{props.currentDirectionId}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => void promoteTo22()}>晋升到 2-2</button>
        <button onClick={() => void fireEmployee()}>解雇员工</button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>员工方向</span>
          <select value={selectedDirectionId} onChange={(event) => setSelectedDirectionId(event.target.value)}>
            {props.directions.map((direction) => (
              <option key={direction.directionId} value={direction.directionId}>
                {direction.displayName}
              </option>
            ))}
            {!props.directions.some((direction) => direction.directionId === selectedDirectionId) && selectedDirectionId ? (
              <option value={selectedDirectionId}>{selectedDirectionId}</option>
            ) : null}
          </select>
        </label>
        <button onClick={() => void saveDirection()}>更新员工方向</button>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>默认知识库（每行一条）</span>
          <textarea
            rows={4}
            value={directionKnowledgeBases}
            onChange={(event) => setDirectionKnowledgeBases(event.target.value)}
          />
        </label>
        <button onClick={() => void saveDirectionKnowledgeBases()}>保存方向知识库配置</button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <input
          placeholder="候选人姓名"
          value={candidateName}
          onChange={(event) => setCandidateName(event.target.value)}
        />
        <input
          placeholder="面试记录"
          value={interviewNotes}
          onChange={(event) => setInterviewNotes(event.target.value)}
        />
        <button onClick={() => void addCandidate()}>添加候选人</button>
        <input
          placeholder="录用员工ID"
          value={hireEmployeeId}
          onChange={(event) => setHireEmployeeId(event.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>面试候选人</span>
          <select
            aria-label="面试候选人"
            value={selectedCandidateId}
            onChange={(event) => setSelectedCandidateId(event.target.value)}
          >
            <option value="">选择候选人</option>
            {candidates.map((candidate) => (
              <option key={candidate.candidateId} value={candidate.candidateId}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
        <input placeholder="面试轮次" value={interviewStage} onChange={(event) => setInterviewStage(event.target.value)} />
        <input
          placeholder="面试时间"
          value={interviewScheduledAt}
          onChange={(event) => setInterviewScheduledAt(event.target.value)}
        />
        <textarea
          placeholder="面试记录摘要"
          value={interviewSummary}
          onChange={(event) => setInterviewSummary(event.target.value)}
        />
        <input
          placeholder="面试建议（hire / hold / reject）"
          value={interviewRecommendation}
          onChange={(event) => {
            const value = event.target.value as 'hire' | 'hold' | 'reject';
            setInterviewRecommendation(value === 'hire' || value === 'reject' ? value : 'hold');
          }}
        />
        <button onClick={() => void addInterview()}>记录面试</button>
      </div>

      <ul>
        {candidates.map((candidate) => (
          <li key={candidate.candidateId}>
            候选人：{candidate.name}（{candidate.status}）
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => void decideCandidate(candidate.candidateId, 'offered')}>发 Offer</button>
              <button onClick={() => void decideCandidate(candidate.candidateId, 'rejected')}>拒绝候选人</button>
              <button onClick={() => void hireCandidate(candidate.candidateId, candidate.name)}>录用为员工</button>
            </div>
          </li>
        ))}
      </ul>

      {candidateActionError ? (
        <p role="alert" style={{ color: '#b42318', marginTop: 8 }}>
          {candidateActionError}
        </p>
      ) : null}

      <ul>
        {interviews.map((interview) => (
          <li key={interview.interviewId}>
            面试：{interview.stage} · {interview.recommendation} · {interview.scheduledAt}
          </li>
        ))}
      </ul>
    </section>
  );
}
