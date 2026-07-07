import { useEffect, useState } from 'react';
import { createCandidate, getCandidates, updateEmployeeLevel, updateEmploymentStatus } from '../lib/api';

export function HrPanel(props: {
  employeeId: string;
  currentLevel: '1-2' | '2-1' | '2-2';
  employmentStatus: string;
  onLevelChange: (level: '1-2' | '2-1' | '2-2') => void;
  onEmploymentStatusChange: (employmentStatus: string) => void;
}) {
  const [candidateName, setCandidateName] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [candidates, setCandidates] = useState<Array<{ candidateId: string; name: string; status: string }>>([]);

  useEffect(() => {
    void getCandidates().then(setCandidates);
  }, []);

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

  return (
    <section style={{ marginTop: 24 }}>
      <h3>管理</h3>
      <p>当前职级：{props.currentLevel}</p>
      <p>在职状态：{props.employmentStatus}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => void promoteTo22()}>晋升到 2-2</button>
        <button onClick={() => void fireEmployee()}>解雇员工</button>
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
