import { useEffect, useState } from 'react';
import { getEmployeeDetail, getEmployees } from './lib/api';
import { EmployeeCard } from './components/employee-card';
import { ChatPanel } from './components/chat-panel';
import { HrPanel } from './components/hr-panel';
import { InternalMessagePanel } from './components/internal-message-panel';

export function App() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('lushirong');
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    void getEmployees().then(setEmployees);
  }, []);

  useEffect(() => {
    void getEmployeeDetail(selectedEmployeeId).then(setDetail);
  }, [selectedEmployeeId]);

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
      <section>
        <h1>RDLeader</h1>
        <p>研发员工总览</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {employees.map((employee) => (
            <EmployeeCard key={employee.employeeId} employee={employee} onSelect={setSelectedEmployeeId} />
          ))}
        </div>
      </section>

      <section>
        {detail ? (
          <>
            <h2>{detail.displayName}</h2>
            <p>职级：{detail.level}</p>
            <p>已做：{detail.recentDoneSummary}</p>
            <p>下一步：{detail.nextStepSummary}</p>
            <p>工作区：{detail.workspacePath}</p>
            <p>
              情绪：{detail.emotionState.current} / {detail.emotionState.summary}
            </p>
            <p>
              Runtime：{detail.runtime.runtimeKind} / {detail.runtime.status}
            </p>
            <section style={{ marginTop: 24 }}>
              <h3>记忆</h3>
              <ul>
                {(detail.memory ?? []).map((item: { ref: string; summary: string; source: string }) => (
                  <li key={`${item.source}-${item.ref}`}>{item.summary}</li>
                ))}
              </ul>
            </section>
            <HrPanel
              employeeId={detail.employeeId}
              currentLevel={detail.level}
              employmentStatus={detail.employmentStatus}
              onLevelChange={(level) => setDetail((current: any) => ({ ...current, level }))}
              onEmploymentStatusChange={(employmentStatus) =>
                setDetail((current: any) => ({ ...current, employmentStatus }))
              }
            />
            <InternalMessagePanel
              currentEmployeeId={detail.employeeId}
              employees={employees.map((employee) => ({
                employeeId: employee.employeeId,
                displayName: employee.displayName,
              }))}
            />
            <ChatPanel employeeId={detail.employeeId} />
          </>
        ) : (
          <p>Loading...</p>
        )}
      </section>
    </main>
  );
}
