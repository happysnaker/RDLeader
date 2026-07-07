import { useEffect, useState } from 'react';
import {
  createCandidate,
  getCandidates,
  getDirectionConfig,
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
}) {
  const [candidateName, setCandidateName] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [candidates, setCandidates] = useState<Array<{ candidateId: string; name: string; status: string }>>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState(props.currentDirectionId);
  const [directionKnowledgeBases, setDirectionKnowledgeBases] = useState(props.currentDefaultKnowledgeBaseIds.join('\n'));

  useEffect(() => {
    void getCandidates().then(setCandidates);
  }, []);

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

  async function addCandidate() {
    if (!candidateName.trim()) return;
    const payload = await createCandidate({
      name: candidateName,
      interviewNotes,
    });
    setCandidates((current) => [...current, payload.candidate]);
    setCandidateName('');
    setInterviewNotes('');
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
      </div>

      <ul>
        {candidates.map((candidate) => (
          <li key={candidate.candidateId}>候选人：{candidate.name}</li>
        ))}
      </ul>
    </section>
  );
}
