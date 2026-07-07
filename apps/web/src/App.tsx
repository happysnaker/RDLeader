import { useEffect, useState } from 'react';
import {
  getEmployeeDetail,
  getEmployees,
  getFeishuBotPreview,
  getIntegrationStatus,
  getMeegoAuth,
  getProjectOpsPreview,
} from './lib/api';
import { EmployeeCard } from './components/employee-card';
import { ChatPanel } from './components/chat-panel';
import { HrPanel } from './components/hr-panel';
import { InternalMessagePanel } from './components/internal-message-panel';
import { ReflectionPanel } from './components/reflection-panel';
import { GroupMessagePanel } from './components/group-message-panel';
import { ProjectOpsActionPanel } from './components/project-ops-action-panel';
import { LearningRecordPanel } from './components/learning-record-panel';
import { EmotionPanel } from './components/emotion-panel';
import { PerformancePanel } from './components/performance-panel';
import { TechReviewPanel } from './components/tech-review-panel';
import { DirectionKnowledgePanel } from './components/direction-knowledge-panel';
import { PersonaPanel } from './components/persona-panel';
import { ResignationPanel } from './components/resignation-panel';

export function App() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('lushirong');
  const [detail, setDetail] = useState<any | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<any | null>(null);
  const [meegoAuth, setMeegoAuth] = useState<any | null>(null);
  const [feishuBotPreview, setFeishuBotPreview] = useState<any | null>(null);
  const [projectOpsPreview, setProjectOpsPreview] = useState<any | null>(null);

  useEffect(() => {
    void getEmployees().then(setEmployees);
    void getIntegrationStatus().then(setIntegrationStatus);
    void getMeegoAuth().then(setMeegoAuth);
  }, []);

  useEffect(() => {
    void getEmployeeDetail(selectedEmployeeId).then(setDetail);
    void getFeishuBotPreview(selectedEmployeeId).then(setFeishuBotPreview);
    void getProjectOpsPreview(selectedEmployeeId).then(setProjectOpsPreview);
  }, [selectedEmployeeId]);

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
      <section>
        <h1>RDLeader</h1>
        <p>研发员工总览</p>
        {integrationStatus ? (
          <section style={{ marginBottom: 16 }}>
            <h3>本机集成状态</h3>
            <p>trae-acp：{integrationStatus.traeAcp}</p>
            <p>codex：{integrationStatus.codex}</p>
            <p>bytedcli：{integrationStatus.bytedcli}</p>
            <p>lark-cli：{integrationStatus.larkCli}</p>
            {meegoAuth ? <p>meego：{meegoAuth.authenticated ? 'authenticated' : 'missing'}</p> : null}
          </section>
        ) : null}
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
            <p>留存风险：{detail.performanceState.retentionRisk}</p>
            <p>离职倾向：{detail.resignationIntent}</p>
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
            <PersonaPanel personaProfile={detail.personaProfile} />
            {feishuBotPreview ? (
              <section style={{ marginTop: 24 }}>
                <h3>Feishu Bot 预览</h3>
                <p>Bot 名称：{feishuBotPreview.botName}</p>
                <p>经理OpenId：{feishuBotPreview.managerOpenId}</p>
                <p>私聊策略：{feishuBotPreview.dmPolicy}</p>
                <p>群策略：{feishuBotPreview.groupPolicy}</p>
              </section>
            ) : null}
            {projectOpsPreview ? (
              <section style={{ marginTop: 24 }}>
                <h3>项目推进预览</h3>
                <p>经理代理参会：{projectOpsPreview.managerProxyRequired ? 'yes' : 'no'}</p>
                <ul>
                  {(projectOpsPreview.recommendedCommands ?? []).map((command: string) => (
                    <li key={command}>{command}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <TechReviewPanel employeeId={detail.employeeId} />
            <ProjectOpsActionPanel employeeId={detail.employeeId} />
            <GroupMessagePanel employeeId={detail.employeeId} />
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
            <PerformancePanel employeeId={detail.employeeId} />
            <EmotionPanel employeeId={detail.employeeId} />
            <ReflectionPanel employeeId={detail.employeeId} />
            <LearningRecordPanel employeeId={detail.employeeId} />
            <DirectionKnowledgePanel
              employeeId={detail.employeeId}
              directionId={detail.directionId}
              latestLearningRecordId={detail.latestLearningRecordId}
            />
            <ResignationPanel
              employeeId={detail.employeeId}
              onEmploymentStatusChange={(employmentStatus) =>
                setDetail((current: any) => ({
                  ...current,
                  employmentStatus,
                  resignationIntent: employmentStatus === 'resigned' ? 'submitted' : current.resignationIntent,
                }))
              }
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
