import { useEffect, useState } from 'react';
import {
  getEmployeeDetail,
  getDirections,
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
import { ManagerProxyReviewPanel } from './components/manager-proxy-review-panel';
import { AutonomyPanel } from './components/autonomy-panel';
import { WorkEpisodePanel } from './components/work-episode-panel';
import { BrainPreviewPanel } from './components/brain-preview-panel';
import { WorkItemPanel } from './components/work-item-panel';
import { RuntimeDispatchPanel } from './components/runtime-dispatch-panel';
import { ProjectGroupPanel } from './components/project-group-panel';
import { ProjectOpsHistoryPanel } from './components/project-ops-history-panel';

function normalizeStringList(items: unknown) {
  return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalizeArtifacts(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { label: '引用', value: item };
      }

      if (item && typeof item === 'object') {
        const value = typeof (item as any).ref === 'string' ? (item as any).ref : typeof (item as any).value === 'string' ? (item as any).value : '';
        const label =
          typeof (item as any).title === 'string'
            ? (item as any).title
            : typeof (item as any).label === 'string'
              ? (item as any).label
              : typeof (item as any).type === 'string'
                ? (item as any).type
                : '引用';

        return value ? { label, value } : null;
      }

      return null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function formatDirection(
  directionId?: string,
  directions: Array<{ directionId: string; displayName: string }> = [],
  fallbackDisplayName?: string,
) {
  const matchedDirection = directions.find((direction) => direction.directionId === directionId);
  if (matchedDirection?.displayName) {
    return matchedDirection.displayName;
  }

  if (fallbackDisplayName) {
    return fallbackDisplayName;
  }

  if (directionId === 'independent-growth-diversion') {
    return '独立端增长导流';
  }

  return directionId ?? '-';
}

export function App() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [directions, setDirections] = useState<Array<{ directionId: string; displayName: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('lushirong');
  const [detail, setDetail] = useState<any | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<any | null>(null);
  const [meegoAuth, setMeegoAuth] = useState<any | null>(null);
  const [feishuBotPreview, setFeishuBotPreview] = useState<any | null>(null);
  const [projectOpsPreview, setProjectOpsPreview] = useState<any | null>(null);
  const [projectOpsRefreshKey, setProjectOpsRefreshKey] = useState(0);

  useEffect(() => {
    void getEmployees().then(setEmployees);
    void getDirections().then(setDirections);
    void getIntegrationStatus().then(setIntegrationStatus);
    void getMeegoAuth().then(setMeegoAuth);
  }, []);

  useEffect(() => {
    void getEmployeeDetail(selectedEmployeeId).then(setDetail);
    void getFeishuBotPreview(selectedEmployeeId).then(setFeishuBotPreview);
    void getProjectOpsPreview(selectedEmployeeId).then(setProjectOpsPreview);
  }, [selectedEmployeeId]);

  return (
    <main className="rdleader-app">
      <section className="app-shell__sidebar">
        <div className="panel-card sidebar-header">
          <h1>RDLeader</h1>
          <p>研发员工总览</p>
        </div>
        {integrationStatus ? (
          <section className="panel-card">
            <h3>本机集成状态</h3>
            <p>trae-acp：{integrationStatus.traeAcp}</p>
            <p>codex：{integrationStatus.codex}</p>
            <p>bytedcli：{integrationStatus.bytedcli}</p>
            <p>lark-cli：{integrationStatus.larkCli}</p>
            {meegoAuth ? <p>meego：{meegoAuth.authenticated ? 'authenticated' : 'missing'}</p> : null}
          </section>
        ) : null}
        <div className="employee-list">
          {employees.map((employee) => (
            <EmployeeCard key={employee.employeeId} employee={employee} onSelect={setSelectedEmployeeId} />
          ))}
        </div>
      </section>

      <section className="app-shell__detail">
        {detail ? (
          <>
            <section className="detail-hero panel-card">
              <div className="detail-hero__header">
                <div>
                  <p className="eyebrow">当前员工</p>
                  <h2>{detail.displayName}</h2>
                  <p>方向：{formatDirection(detail.directionId, directions, detail.directionConfig?.displayName)}</p>
                </div>
                <div className="detail-hero__badges">
                  <span className="detail-badge">{detail.runtime.runtimeKind}</span>
                  <span className="detail-badge detail-badge--accent">{detail.runtime.status}</span>
                </div>
              </div>
              <div className="detail-summary-grid">
                <div className="detail-summary-item">
                  <span>职级</span>
                  <strong>{detail.level}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>工作区</span>
                  <strong>{detail.workspacePath}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>情绪</span>
                  <strong>
                    {detail.emotionState.current} / {detail.emotionState.summary}
                  </strong>
                </div>
                <div className="detail-summary-item">
                  <span>留存风险</span>
                  <strong>{detail.performanceState.retentionRisk}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>离职倾向</span>
                  <strong>{detail.resignationIntent}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>Runtime</span>
                  <strong>
                    {detail.runtime.runtimeKind} / {detail.runtime.status}
                  </strong>
                </div>
              </div>
              <div className="detail-story-grid">
                <div>
                  <h3>已做</h3>
                  <p>{detail.recentDoneSummary}</p>
                </div>
                <div>
                  <h3>下一步</h3>
                  <p>{detail.nextStepSummary}</p>
                </div>
              </div>
            </section>
            <section className="panel-card">
              <h3>工作可观测性</h3>
              <p>当前阻塞项：{normalizeStringList(detail.currentBlockers).join('；') || '-'}</p>
              <p>最新推理摘要：{detail.latestReasoningSummary ?? '-'}</p>
              <div>
                <strong>任务 / 结果产物</strong>
                <ul>
                  {normalizeArtifacts(detail.latestArtifacts).map((artifact) => (
                    <li key={`${artifact.label}-${artifact.value}`}>
                      {artifact.label}：{artifact.value}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            <section className="panel-card">
              <h3>记忆</h3>
              <ul>
                {(detail.memory ?? []).map((item: { ref: string; summary: string; source: string }) => (
                  <li key={`${item.source}-${item.ref}`}>{item.summary}</li>
                ))}
              </ul>
            </section>
            <section className="panel-card">
              <h3>当前任务</h3>
              <ul>
                {(detail.currentAssignments ?? []).map((assignment: string) => (
                  <li key={assignment}>{assignment}</li>
                ))}
              </ul>
            </section>
            <WorkItemPanel
              employeeId={detail.employeeId}
              onAssignmentsChange={(openTitles) => {
                setDetail((current: any) => ({
                  ...current,
                  currentAssignments: openTitles,
                }));
                setEmployees((current: any[]) =>
                  current.map((employee) =>
                    employee.employeeId === detail.employeeId
                      ? { ...employee, activeTaskCount: openTitles.length }
                      : employee,
                  ),
                );
              }}
            />
            <RuntimeDispatchPanel
              employeeId={detail.employeeId}
              onAssignmentsChange={(openTitles) => {
                setDetail((current: any) => ({
                  ...current,
                  currentAssignments: openTitles,
                }));
                setEmployees((current: any[]) =>
                  current.map((employee) =>
                    employee.employeeId === detail.employeeId
                      ? { ...employee, activeTaskCount: openTitles.length }
                      : employee,
                  ),
                );
              }}
              onRuntimeStateChange={(runtime) => {
                setDetail((current: any) => ({
                  ...current,
                  runtime: {
                    ...current.runtime,
                    status: runtime.status,
                    pid: runtime.pid,
                  },
                }));
              }}
              onResultsCollected={({ recentDoneSummary, nextStepSummary, currentAssignments }) => {
                setDetail((current: any) => ({
                  ...current,
                  recentDoneSummary,
                  nextStepSummary: nextStepSummary ?? current?.nextStepSummary,
                  currentAssignments,
                }));
                setEmployees((current: any[]) =>
                  current.map((employee) =>
                    employee.employeeId === detail.employeeId
                      ? {
                          ...employee,
                          activeTaskCount: currentAssignments.length,
                          recentDoneSummary,
                          nextStepSummary: nextStepSummary ?? employee.nextStepSummary,
                        }
                      : employee,
                  ),
                );
              }}
            />
            <section className="panel-card">
              <h3>默认知识库</h3>
              <ul>
                {(detail.defaultKnowledgeBaseIds ?? detail.directionConfig?.defaultKnowledgeBaseIds ?? []).map((knowledgeBaseId: string) => (
                  <li key={knowledgeBaseId}>{knowledgeBaseId}</li>
                ))}
              </ul>
            </section>
            <PersonaPanel personaProfile={detail.personaProfile} />
            {feishuBotPreview ? (
              <section className="panel-card">
                <h3>Feishu Bot 预览</h3>
                <p>Bot 名称：{feishuBotPreview.botName}</p>
                <p>经理OpenId：{feishuBotPreview.managerOpenId}</p>
                <p>私聊策略：{feishuBotPreview.dmPolicy}</p>
                <p>群策略：{feishuBotPreview.groupPolicy}</p>
              </section>
            ) : null}
            {projectOpsPreview ? (
              <section className="panel-card">
                <h3>项目推进预览</h3>
                <p>经理代理参会：{projectOpsPreview.managerProxyRequired ? 'yes' : 'no'}</p>
                <ul>
                  {(projectOpsPreview.recommendedCommands ?? []).map((command: string) => (
                    <li key={command}>{command}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <ProjectGroupPanel
              employeeId={detail.employeeId}
              onGroupsChange={(groups) =>
                setDetail((current: any) => ({
                  ...current,
                  projectGroups: groups,
                }))
              }
            />
            <TechReviewPanel
              employeeId={detail.employeeId}
              onOperationRecorded={() => setProjectOpsRefreshKey((current) => current + 1)}
            />
            <ProjectOpsActionPanel
              employeeId={detail.employeeId}
              onOperationRecorded={() => setProjectOpsRefreshKey((current) => current + 1)}
            />
            <GroupMessagePanel
              employeeId={detail.employeeId}
              onOperationRecorded={() => setProjectOpsRefreshKey((current) => current + 1)}
            />
            <ProjectOpsHistoryPanel employeeId={detail.employeeId} refreshKey={projectOpsRefreshKey} />
            <HrPanel
              employeeId={detail.employeeId}
              currentLevel={detail.level}
              employmentStatus={detail.employmentStatus}
              currentDirectionId={detail.directionId}
              currentDefaultKnowledgeBaseIds={
                detail.defaultKnowledgeBaseIds ?? detail.directionConfig?.defaultKnowledgeBaseIds ?? []
              }
              directions={directions}
              onLevelChange={(level) => setDetail((current: any) => ({ ...current, level }))}
              onEmploymentStatusChange={(employmentStatus) =>
                setDetail((current: any) => ({ ...current, employmentStatus }))
              }
              onDirectionChange={({ directionId, defaultKnowledgeBaseIds, directionConfig }) => {
                setDetail((current: any) => ({
                  ...current,
                  directionId,
                  defaultKnowledgeBaseIds,
                  directionConfig,
                }));
                setEmployees((current) =>
                  current.map((employee) =>
                    employee.employeeId === detail.employeeId ? { ...employee, directionId } : employee,
                  ),
                );
              }}
              onDirectionConfigChange={({ directionId, defaultKnowledgeBaseIds, directionConfig }) =>
                setDetail((current: any) =>
                  current?.directionId === directionId
                    ? {
                        ...current,
                        defaultKnowledgeBaseIds,
                        directionConfig,
                      }
                    : current,
                )
              }
              onEmployeeHired={({ employeeId, displayName, level, directionId }) => {
                setEmployees((current: any[]) => [
                  ...current,
                  {
                    employeeId,
                    displayName,
                    level,
                    directionId,
                    recentDoneSummary: '新员工已入职，等待领取首个任务',
                    nextStepSummary: '完成环境熟悉并领取首个任务',
                    emotionCurrent: 'focused',
                    retentionRisk: 'low',
                    runtimeKind: 'trae_acp',
                    activeTaskCount: 1,
                  },
                ]);
              }}
            />
            <ManagerProxyReviewPanel
              employeeId={detail.employeeId}
              onWorkStateUpdate={(update) =>
                setDetail((current: any) => ({
                  ...current,
                  recentDoneSummary: update.recentDoneSummary,
                  nextStepSummary: update.nextStepSummary,
                }))
              }
            />
            <WorkEpisodePanel
              employeeId={detail.employeeId}
              initialEpisodes={detail.recentWorkEpisodes}
              onEpisodeCreated={(episode) =>
                setDetail((current: any) => ({
                  ...current,
                  currentBlockers: episode.blocker
                    ? [episode.blocker, ...normalizeStringList(current?.currentBlockers).filter((item) => item !== episode.blocker)]
                    : current?.currentBlockers,
                  latestReasoningSummary: episode.reasoningSummary ?? current?.latestReasoningSummary,
                  latestArtifacts:
                    episode.artifactRefs && episode.artifactRefs.length > 0 ? episode.artifactRefs : current?.latestArtifacts,
                  recentWorkEpisodes: [episode, ...(Array.isArray(current?.recentWorkEpisodes) ? current.recentWorkEpisodes : [])],
                }))
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
            <AutonomyPanel employeeId={detail.employeeId} />
            <BrainPreviewPanel employeeId={detail.employeeId} />
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
            <ChatPanel
              employeeId={detail.employeeId}
              latestReasoningSummary={detail.latestReasoningSummary}
              latestArtifacts={normalizeArtifacts(detail.latestArtifacts)}
            />
          </>
        ) : (
          <p>Loading...</p>
        )}
      </section>
    </main>
  );
}
