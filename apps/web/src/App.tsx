import { useEffect, useRef, useState } from 'react';
import {
  getAutonomySettings,
  getEmployeeDetail,
  getDirections,
  getEmployees,
  getFeishuAgentRuntimeStatus,
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
import { FeishuAgentPanel } from './components/feishu-agent-panel';
import { FeishuConversationPanel } from './components/feishu-conversation-panel';
import { FeishuRuntimeHealthCard } from './components/feishu-runtime-health-card';
import { QaOpsPanel } from './components/qa-ops-panel';
import { ExpandableText } from './components/expandable-text';
import { formatDisplayReference, formatDisplayText, formatWorkspacePath } from './lib/display';

function normalizeStringList(items: unknown) {
  return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalizeArtifacts(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { label: '引用', value: formatDisplayReference(item) };
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

        return value ? { label, value: formatDisplayReference(value) } : null;
      }

      return null;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function describeKnowledgeBase(knowledgeBaseId: string) {
  if (knowledgeBaseId.startsWith('repo-')) {
    return {
      title: knowledgeBaseId.replace(/^repo-/, ''),
      kind: '代码仓',
      description: '代码仓知识与约束入口',
    };
  }

  if (knowledgeBaseId.startsWith('dir-')) {
    return {
      title: knowledgeBaseId.replace(/^dir-/, ''),
      kind: '方向',
      description: '方向知识与方法论沉淀',
    };
  }

  return {
    title: knowledgeBaseId,
    kind: '知识',
    description: '默认知识来源',
  };
}

function buildEmptyAssignmentsMessage() {
  return '暂无显式任务，建议先同步老板并领取下一步目标。';
}

function formatPersonaTrait(label: string, value: string) {
  return `${label} ${value}`;
}

function formatIntegrationStateLabel(value?: string | null) {
  if (value === 'ready') return '就绪';
  if (value === 'installed') return '已安装';
  if (value === 'authenticated') return '已认证';
  if (value === 'missing') return '缺失';
  return value ?? '-';
}

function formatRuntimeKindLabel(value?: string | null) {
  if (value === 'larklink') return '飞书代理';
  if (value === 'trae_acp') return 'Trae 运行时';
  if (value === 'codex_adapter') return 'Codex 运行时';
  return value ?? '-';
}

function formatRuntimeStatusLabel(value?: string | null) {
  if (value === 'running') return '运行中';
  if (value === 'stopped') return '已停止';
  if (value === 'multiple') return '多实例异常';
  if (value === 'degraded') return '降级';
  return value ?? '-';
}

function formatRiskLevelLabel(value?: string | null) {
  if (value === 'low') return '低';
  if (value === 'medium') return '中';
  if (value === 'high') return '高';
  return value ?? '-';
}

function formatEmotionLabel(value?: string | null) {
  if (value === 'focused') return '专注';
  if (value === 'proud') return '自信';
  if (value === 'calm') return '平稳';
  if (value === 'anxious') return '紧张';
  if (value === 'tired') return '疲惫';
  return value ?? '-';
}

function formatBooleanLabel(value: boolean) {
  return value ? '是' : '否';
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

function formatShortDateTime(value?: string | null) {
  if (!value) return '';
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

function formatConversationRole(value?: string | null) {
  if (value === 'manager') return '老板';
  if (value === 'employee') return '员工';
  if (value === 'internal_staff') return '内部协作';
  return value ?? '消息';
}

type DetailTab = 'overview' | 'execution' | 'collaboration' | 'growth' | 'management';

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: '总览' },
  { id: 'execution', label: '执行' },
  { id: 'collaboration', label: '推进' },
  { id: 'growth', label: '成长' },
  { id: 'management', label: '管理' },
];

const NON_CRITICAL_FETCH_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function parseDetailTab(value: string | null | undefined): DetailTab {
  if (value === 'execution' || value === 'collaboration' || value === 'growth' || value === 'management') {
    return value;
  }
  return 'overview';
}

function readInitialUiState() {
  if (typeof window === 'undefined') {
    return {
      employeeId: 'lushirong',
      tab: 'overview' as DetailTab,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    employeeId: params.get('employee')?.trim() || 'lushirong',
    tab: parseDetailTab(params.get('tab')),
  };
}

export function App() {
  const initialUiState = readInitialUiState();
  const [employees, setEmployees] = useState<any[]>([]);
  const [directions, setDirections] = useState<Array<{ directionId: string; displayName: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialUiState.employeeId);
  const [selectedDetailTab, setSelectedDetailTab] = useState<DetailTab>(initialUiState.tab);
  const [showFormerEmployees, setShowFormerEmployees] = useState(false);
  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [bootReloadKey, setBootReloadKey] = useState(0);
  const [detailState, setDetailState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [detail, setDetail] = useState<any | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<any | null>(null);
  const [meegoAuth, setMeegoAuth] = useState<any | null>(null);
  const [integrationState, setIntegrationState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [feishuBotPreview, setFeishuBotPreview] = useState<any | null>(null);
  const [feishuAgentRuntimeStatus, setFeishuAgentRuntimeStatus] = useState<any | null>(null);
  const [projectOpsPreview, setProjectOpsPreview] = useState<any | null>(null);
  const [projectOpsRefreshKey, setProjectOpsRefreshKey] = useState(0);
  const [preferredProjectGroupChatId, setPreferredProjectGroupChatId] = useState('');
  const [employeeAutonomyMap, setEmployeeAutonomyMap] = useState<Record<string, any>>({});
  const lastSelectedEmployeeId = useRef<string | null>(null);
  const visibleEmployees = showFormerEmployees
    ? employees
    : employees.filter((employee) => employee.employmentStatus !== 'fired');

  useEffect(() => {
    let active = true;
    setBootState('loading');

    void Promise.all([getEmployees(), getDirections()])
      .then(([nextEmployees, nextDirections]) => {
        if (!active) return;
        setEmployees(Array.isArray(nextEmployees) ? nextEmployees : []);
        setDirections(Array.isArray(nextDirections) ? nextDirections : []);
        setBootState('ready');
      })
      .catch(() => {
        if (!active) return;
        setEmployees([]);
        setDirections([]);
        setIntegrationStatus(null);
        setMeegoAuth(null);
        setDetail(null);
        setBootState('error');
      });

    return () => {
      active = false;
    };
  }, [bootReloadKey]);

  useEffect(() => {
    let active = true;
    setIntegrationState('loading');

    void Promise.allSettled([
      withTimeout(getIntegrationStatus(), NON_CRITICAL_FETCH_TIMEOUT_MS),
      withTimeout(getMeegoAuth(), NON_CRITICAL_FETCH_TIMEOUT_MS),
    ]).then(([integrationResult, meegoResult]) => {
      if (!active) return;

      const nextIntegrationStatus = integrationResult.status === 'fulfilled' ? integrationResult.value : null;
      const nextMeegoAuth = meegoResult.status === 'fulfilled' ? meegoResult.value : null;
      setIntegrationStatus(nextIntegrationStatus);
      setMeegoAuth(nextMeegoAuth);
      setIntegrationState(
        integrationResult.status === 'fulfilled' && meegoResult.status === 'fulfilled' ? 'ready' : 'error',
      );
    });

    return () => {
      active = false;
    };
  }, [bootReloadKey]);

  useEffect(() => {
    if (employees.length === 0) {
      return;
    }

    if (!employees.some((employee) => employee.employeeId === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0]!.employeeId);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (employees.length === 0) {
      setEmployeeAutonomyMap({});
      return;
    }

    let active = true;
    async function loadAutonomy() {
      const entries = await Promise.all(
        employees.map(async (employee) => {
          const settings = await getAutonomySettings(employee.employeeId).catch(() => null);
          return [employee.employeeId, settings] as const;
        }),
      );
      if (!active) return;
      setEmployeeAutonomyMap(
        Object.fromEntries(entries.filter((entry) => entry[1])),
      );
    }

    void loadAutonomy();
    const timer = window.setInterval(() => {
      void loadAutonomy();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [employees]);

  useEffect(() => {
    if (bootState !== 'ready') {
      return;
    }

    let active = true;
    setDetailState('loading');
    setDetail(null);
    setFeishuBotPreview(null);
    setFeishuAgentRuntimeStatus(null);
    setProjectOpsPreview(null);

    void getEmployeeDetail(selectedEmployeeId)
      .then((nextDetail) => {
        if (!active) return;
        setDetail(nextDetail);
        setDetailState('ready');
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
        setDetailState('error');
      });
    void getFeishuBotPreview(selectedEmployeeId)
      .then((preview) => {
        if (active && preview?.employeeId === selectedEmployeeId) setFeishuBotPreview(preview);
      })
      .catch(() => undefined);
    void getFeishuAgentRuntimeStatus(selectedEmployeeId)
      .then((status) => {
        if (active && status?.employeeId === selectedEmployeeId) setFeishuAgentRuntimeStatus(status);
      })
      .catch(() => undefined);
    void getProjectOpsPreview(selectedEmployeeId)
      .then((preview) => {
        if (active && preview?.employeeId === selectedEmployeeId) setProjectOpsPreview(preview);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [selectedEmployeeId, detailReloadKey, bootState]);

  useEffect(() => {
    if (lastSelectedEmployeeId.current === null) {
      lastSelectedEmployeeId.current = selectedEmployeeId;
      return;
    }

    if (lastSelectedEmployeeId.current !== selectedEmployeeId) {
      lastSelectedEmployeeId.current = selectedEmployeeId;
      setSelectedDetailTab('overview');
      setPreferredProjectGroupChatId('');
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('employee', selectedEmployeeId);
    url.searchParams.set('tab', selectedDetailTab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [selectedEmployeeId, selectedDetailTab]);

  useEffect(() => {
    if (bootState !== 'ready') {
      return;
    }

    let active = true;
    const timer = window.setInterval(() => {
      void getEmployees()
        .then((nextEmployees) => {
          if (!active) return;
          setEmployees(Array.isArray(nextEmployees) ? nextEmployees : []);
        })
        .catch(() => undefined);
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [bootState]);

  useEffect(() => {
    if (bootState !== 'ready') {
      return;
    }

    let active = true;
    const detailRefreshIntervalMs = selectedDetailTab === 'management' ? 3000 : 8000;
    const timer = window.setInterval(() => {
      void getEmployeeDetail(selectedEmployeeId)
        .then((nextDetail) => {
          if (!active) return;
          setDetail(nextDetail);
          setDetailState('ready');
        })
        .catch(() => undefined);
      void getFeishuBotPreview(selectedEmployeeId)
        .then((preview) => {
          if (active && preview?.employeeId === selectedEmployeeId) setFeishuBotPreview(preview);
        })
        .catch(() => undefined);
      void getFeishuAgentRuntimeStatus(selectedEmployeeId)
        .then((status) => {
          if (active && status?.employeeId === selectedEmployeeId) setFeishuAgentRuntimeStatus(status);
        })
        .catch(() => undefined);
      void getProjectOpsPreview(selectedEmployeeId)
        .then((preview) => {
          if (active && preview?.employeeId === selectedEmployeeId) setProjectOpsPreview(preview);
        })
        .catch(() => undefined);
    }, detailRefreshIntervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [bootState, selectedEmployeeId, selectedDetailTab]);

  return (
    <main className="rdleader-app">
      <section className="app-shell__sidebar">
        <div className="panel-card sidebar-header">
          <h1>RDLeader</h1>
          <p>研发员工总览</p>
        </div>
        <section className="panel-card panel-card--telemetry">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">系统</p>
              <h3>本机集成状态</h3>
            </div>
            <span className={`inline-state inline-state--${integrationState}`}>
              {integrationState === 'loading' ? '同步中' : integrationState === 'ready' ? '已就绪' : '部分失败'}
            </span>
          </div>
          <div className="telemetry-grid">
            <div className="telemetry-item">
              <span>trae-acp</span>
              <strong>{formatIntegrationStateLabel(integrationStatus?.traeAcp)}</strong>
            </div>
            <div className="telemetry-item">
              <span>codex</span>
              <strong>{formatIntegrationStateLabel(integrationStatus?.codex)}</strong>
            </div>
            <div className="telemetry-item">
              <span>bytedcli</span>
              <strong>{formatIntegrationStateLabel(integrationStatus?.bytedcli)}</strong>
            </div>
            <div className="telemetry-item">
              <span>lark-cli</span>
              <strong>{formatIntegrationStateLabel(integrationStatus?.larkCli)}</strong>
            </div>
            <div className="telemetry-item telemetry-item--wide">
              <span>meego</span>
              <strong>{meegoAuth ? (meegoAuth.authenticated ? '已认证' : '缺失') : '-'}</strong>
            </div>
          </div>
          {integrationState === 'error' ? <p className="inline-note">集成状态暂不可用，主界面仍可继续使用。</p> : null}
        </section>
        <QaOpsPanel
          compact
          onDemoReset={() => {
            setBootReloadKey((current) => current + 1);
            setDetailReloadKey((current) => current + 1);
          }}
        />
        <div className="employee-list-shell">
          <div className="employee-list__header">
            <div>
              <p className="eyebrow">花名册</p>
              <h3>研发员工</h3>
            </div>
            <div className="employee-list__controls">
              <label className="employee-list__toggle">
                <input
                  checked={showFormerEmployees}
                  type="checkbox"
                  onChange={(event) => setShowFormerEmployees(event.target.checked)}
                />
                <span>显示已解雇员工</span>
              </label>
              <span className="inline-state inline-state--neutral">
                {showFormerEmployees || visibleEmployees.length === employees.length
                  ? `${employees.length} 人`
                  : `${visibleEmployees.length} / ${employees.length} 人`}
              </span>
            </div>
          </div>
          <div className="employee-list">
            {visibleEmployees.map((employee) => (
              <EmployeeCard
                key={employee.employeeId}
                employee={employee}
                autonomySettings={employeeAutonomyMap[employee.employeeId] ?? null}
                selected={employee.employeeId === selectedEmployeeId}
                onSelect={setSelectedEmployeeId}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="app-shell__detail">
        {bootState === 'error' ? (
          <section className="panel-card">
            <h3>控制面连接失败</h3>
            <p>无法连接 RDLeader 控制面，请先启动控制面服务后重试。</p>
            <button type="button" onClick={() => setBootReloadKey((current) => current + 1)}>
              重试连接
            </button>
          </section>
        ) : bootState !== 'ready' ? (
          <section className="panel-card">
            <p>正在连接 RDLeader 控制面...</p>
          </section>
        ) : detailState === 'error' ? (
          <section className="panel-card">
            <h3>员工详情加载失败</h3>
            <p>员工详情加载失败，请确认控制面服务可用后重试。</p>
            <button type="button" onClick={() => setDetailReloadKey((current) => current + 1)}>
              重试详情
            </button>
          </section>
        ) : detail ? (
          <>
            {(() => {
              const bridgeRuntimeReady =
                feishuAgentRuntimeStatus?.employeeId === detail.employeeId && feishuAgentRuntimeStatus?.daemon?.ok;
              const bridgeRuntimeState =
                feishuAgentRuntimeStatus?.employeeId === detail.employeeId
                  ? String(feishuAgentRuntimeStatus?.daemon?.status?.status ?? (bridgeRuntimeReady ? 'running' : 'degraded'))
                  : null;
              const displayRuntimeKindRaw = bridgeRuntimeReady ? 'larklink' : detail.runtime.runtimeKind;
              const displayRuntimeStatusRaw = bridgeRuntimeReady ? bridgeRuntimeState ?? 'running' : detail.runtime.status;
              const displayRuntimeKind = formatRuntimeKindLabel(displayRuntimeKindRaw);
              const displayRuntimeStatus = formatRuntimeStatusLabel(displayRuntimeStatusRaw);

              return (
            <section className={`detail-hero panel-card${selectedDetailTab === 'management' ? ' detail-hero--compact' : ''}`}>
              <div className="detail-hero__header">
                <div>
                  <p className="eyebrow">当前员工</p>
                  <h2>{detail.displayName}</h2>
                  <p>方向：{formatDirection(detail.directionId, directions, detail.directionConfig?.displayName)}</p>
                </div>
                <div className="detail-hero__badges">
                  <span className="detail-badge">{displayRuntimeKind}</span>
                  <span className="detail-badge detail-badge--accent">{displayRuntimeStatus}</span>
                </div>
              </div>
              <div className="detail-summary-grid">
                <div className="detail-summary-item">
                  <span>职级</span>
                  <strong>{detail.level}</strong>
                </div>
                <div className="detail-summary-item detail-summary-item--path">
                  <span>工作区</span>
                  <strong className="reference-text" title={detail.workspacePath}>{formatWorkspacePath(detail.workspacePath)}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>情绪</span>
                  <strong>{formatEmotionLabel(detail.emotionState.current)}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>留存风险</span>
                  <strong>{formatRiskLevelLabel(detail.performanceState.retentionRisk)}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>离职倾向</span>
                  <strong>{detail.resignationIntent}</strong>
                </div>
                <div className="detail-summary-item">
                  <span>运行时</span>
                  <strong>
                    {displayRuntimeKind} / {displayRuntimeStatus}
                  </strong>
                </div>
                <div className="detail-summary-item">
                  <span>自治唤醒</span>
                  <strong>
                    {employeeAutonomyMap[detail.employeeId]?.enabled ? '已开启' : '未开启'}
                    {employeeAutonomyMap[detail.employeeId]?.nextRunAt
                      ? ` / ${new Date(employeeAutonomyMap[detail.employeeId].nextRunAt).toLocaleString('zh-CN', { hour12: false })}`
                      : ''}
                  </strong>
                </div>
              </div>
              <div className={`detail-story-grid${selectedDetailTab === 'management' ? ' detail-story-grid--compact' : ''}`}>
                <div>
                  <h3>已做</h3>
                          <ExpandableText text={formatDisplayText(detail.recentDoneSummary)} maxLength={selectedDetailTab === 'management' ? 90 : 132} previewClassName="detail-story-text" />
                </div>
                <div>
                  <h3>下一步</h3>
                          <ExpandableText text={formatDisplayText(detail.nextStepSummary)} maxLength={selectedDetailTab === 'management' ? 90 : 132} previewClassName="detail-story-text" />
                </div>
              </div>
            </section>
              );
            })()}
            <div className="detail-tabs" role="tablist" aria-label="员工详情分页">
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedDetailTab === tab.id}
                  className={`detail-tab${selectedDetailTab === tab.id ? ' detail-tab--active' : ''}`}
                  onClick={() => setSelectedDetailTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {selectedDetailTab === 'overview' ? (() => {
              const blockerItems = normalizeStringList(detail.currentBlockers).map((item) => formatDisplayText(item));
              const assignmentItems = Array.isArray(detail.currentAssignments) ? detail.currentAssignments : [];
              const memoryItems = Array.isArray(detail.memory) ? detail.memory : [];
              const knowledgeBaseIds = detail.defaultKnowledgeBaseIds ?? detail.directionConfig?.defaultKnowledgeBaseIds ?? [];
              const recentRuntimeResults = Array.isArray(detail.recentRuntimeResults) ? detail.recentRuntimeResults : [];
              const recentFeishuConversations = Array.isArray(detail.recentFeishuConversations) ? detail.recentFeishuConversations : [];

              return (
                <div className="detail-tab-panel detail-tab-panel--overview" role="tabpanel" aria-label="总览">
                  <div className="overview-workspace">
                    <div className="overview-workspace__main">
                      <section className="panel-card overview-card overview-card--signal-strip">
                        <div className="overview-signal-strip">
                          <article className="overview-signal-card">
                            <span>当前任务</span>
                            <strong>{assignmentItems.length}</strong>
                            <p>{assignmentItems.length ? '已有明确推进项' : '等待领取任务'}</p>
                          </article>
                          <article className="overview-signal-card">
                            <span>阻塞项</span>
                            <strong>{blockerItems.length}</strong>
                            <p>{blockerItems.length ? '需要优先盯住风险' : '暂无新增 blocker'}</p>
                          </article>
                          <article className="overview-signal-card">
                            <span>最近记忆</span>
                            <strong>{memoryItems.length}</strong>
                            <p>默认展示最近沉淀与上下文线索</p>
                          </article>
                          <article className="overview-signal-card">
                            <span>知识来源</span>
                            <strong>{knowledgeBaseIds.length}</strong>
                            <p>当前方向默认挂载的知识入口</p>
                          </article>
                        </div>
                      </section>

                      <section className="panel-card overview-card">
                        <div className="section-heading-row">
                          <div>
                            <p className="eyebrow">工作可观测性</p>
                            <h3>工作可观测性</h3>
                          </div>
                          <span className="inline-state inline-state--light">{blockerItems.length > 0 ? '需关注' : '稳定'}</span>
                        </div>
                        <div className="observation-row">
                          <strong>当前阻塞项</strong>
                          <ExpandableText text={blockerItems.join('；') || '-'} />
                        </div>
                        <div className="observation-row">
                          <strong>最新推理摘要</strong>
                          <ExpandableText text={formatDisplayText(detail.latestReasoningSummary ?? '-')} />
                        </div>
                        <div className="observation-row">
                          <strong>任务 / 结果产物</strong>
                          <ul className="overview-artifact-list">
                            {normalizeArtifacts(detail.latestArtifacts).map((artifact) => (
                              <li key={`${artifact.label}-${artifact.value}`}>
                                <strong>{artifact.label}</strong>
                                <ExpandableText text={artifact.value} maxLength={140} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>

                      <section className="panel-card overview-card">
                        <div className="section-heading-row">
                          <div>
                            <p className="eyebrow">当前任务</p>
                            <h3>当前任务</h3>
                          </div>
                          <span className="inline-state inline-state--light">{assignmentItems.length} 项</span>
                        </div>
                        {assignmentItems.length > 0 ? (
                          <div className="overview-task-grid">
                            {assignmentItems.map((assignment: string, index: number) => (
                              <article key={assignment} className="overview-task-card">
                                <span className="overview-task-card__index">#{index + 1}</span>
                                <strong>{assignment}</strong>
                                <p>当前正在推进的工作事项</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="overview-empty-state">
                            <strong>当前任务待领取</strong>
                            <p>{buildEmptyAssignmentsMessage()}</p>
                          </div>
                        )}
                      </section>

                      <section className="panel-card overview-card">
                        <div className="section-heading-row">
                          <div>
                            <p className="eyebrow">记忆</p>
                            <h3>记忆</h3>
                          </div>
                          <span className="inline-state inline-state--light">{memoryItems.length} 条</span>
                        </div>
                        <div className="overview-memory-list">
                          {memoryItems.map((item: { ref: string; summary: string; source: string }) => (
                            <article key={`${item.source}-${item.ref}`} className="overview-memory-item">
                              <span>{item.source}</span>
                              <ExpandableText text={formatDisplayText(item.summary)} maxLength={150} />
                            </article>
                          ))}
                        </div>
                      </section>

                      <div className="overview-activity-grid">
                        <section className="panel-card overview-card">
                          <div className="section-heading-row">
                            <div>
                              <p className="eyebrow">执行回流</p>
                              <h3>最近执行结果</h3>
                            </div>
                            <span className="inline-state inline-state--light">{recentRuntimeResults.length} 条</span>
                          </div>
                          {recentRuntimeResults.length > 0 ? (
                            <div className="overview-activity-list">
                              {recentRuntimeResults.slice(0, 4).map((result: any) => (
                                <article key={result.eventId} className="overview-activity-item">
                                  <div className="overview-activity-item__header">
                                    <strong>{result.status === 'completed' ? '已完成' : result.status === 'blocked' ? '阻塞' : '失败'}</strong>
                                    <span>{formatShortDateTime(result.createdAt)}</span>
                                  </div>
                                  <ExpandableText text={formatDisplayText(result.summary)} maxLength={150} />
                                  {result.nextStepSummary ? <p>下一步：{formatDisplayText(result.nextStepSummary)}</p> : null}
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="ops-inline-note">最近还没有新的执行结果回流。</p>
                          )}
                        </section>

                        <section className="panel-card overview-card">
                          <div className="section-heading-row">
                            <div>
                              <p className="eyebrow">飞书回流</p>
                              <h3>最近飞书消息</h3>
                            </div>
                            <span className="inline-state inline-state--light">{recentFeishuConversations.length} 条</span>
                          </div>
                          {recentFeishuConversations.length > 0 ? (
                            <div className="overview-activity-list">
                              {recentFeishuConversations.slice(0, 4).map((turn: any) => (
                                <article key={turn.turnId} className="overview-activity-item">
                                  <div className="overview-activity-item__header">
                                    <strong>{formatConversationRole(turn.senderRole)}</strong>
                                    <span>{formatShortDateTime(turn.createdAt)}</span>
                                  </div>
                                  <ExpandableText text={formatDisplayText(turn.body)} maxLength={150} />
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="ops-inline-note">最近还没有新的飞书消息回流。</p>
                          )}
                        </section>
                      </div>
                    </div>

                    <div className="overview-workspace__rail">
                      <section className="panel-card overview-card">
                        <div className="section-heading-row">
                          <div>
                            <p className="eyebrow">知识来源</p>
                            <h3>知识来源</h3>
                          </div>
                          <span className="inline-state inline-state--light">{knowledgeBaseIds.length} 个默认来源</span>
                        </div>
                        <div className="overview-kb-grid">
                          {knowledgeBaseIds.map((knowledgeBaseId: string) => {
                            const knowledgeBase = describeKnowledgeBase(knowledgeBaseId);
                            return (
                              <article key={knowledgeBaseId} className="overview-kb-card">
                                <span className="overview-kb-card__kind">{knowledgeBase.kind}</span>
                                <strong>{knowledgeBase.title}</strong>
                                <p>{knowledgeBase.description}</p>
                                <code>{knowledgeBaseId}</code>
                              </article>
                            );
                          })}
                        </div>
                      </section>

                      <PersonaPanel personaProfile={detail.personaProfile} formatTrait={formatPersonaTrait} />

                      {projectOpsPreview ? (
                        <section className="panel-card overview-card overview-preview-card">
                          <div className="section-heading-row">
                            <div>
                              <p className="eyebrow">项目推进</p>
                              <h3>项目推进预览</h3>
                            </div>
                            <span className="inline-state inline-state--light">
                              {formatBooleanLabel(projectOpsPreview.managerProxyRequired)}
                            </span>
                          </div>
                          <p className="overview-preview-card__note">
                            经理代理参会：{formatBooleanLabel(projectOpsPreview.managerProxyRequired)}
                          </p>
                          <ul className="overview-preview-card__commands">
                            {(projectOpsPreview.recommendedCommands ?? []).map((command: string) => (
                              <li key={command}>{command}</li>
                            ))}
                          </ul>
                        </section>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })() : null}
            {selectedDetailTab === 'execution' ? (
              (() => {
                const runtimeSessions = Array.isArray(detail.runtimeSessions) ? detail.runtimeSessions : [];
                const recentRuntimeResults = Array.isArray(detail.recentRuntimeResults) ? detail.recentRuntimeResults : [];
                const latestRuntimeResult = recentRuntimeResults[0] ?? null;
                const runningSessionCount = runtimeSessions.filter((session: any) => session.status === 'running').length;
                const latestRuntimeResultStatus =
                  latestRuntimeResult?.status === 'completed'
                    ? '已回流'
                    : latestRuntimeResult?.status === 'blocked'
                      ? '阻塞'
                      : latestRuntimeResult?.status === 'failed'
                        ? '失败'
                        : '暂无结果';
                const latestRuntimeSessionTime =
                  runtimeSessions[0]?.startedAt ? formatShortDateTime(runtimeSessions[0].startedAt) : '';
                return (
              <div className="detail-tab-panel detail-tab-panel--execution" role="tabpanel" aria-label="执行">
                <div className="execution-workspace">
                  <div className="execution-workspace__main">
                    <section className="panel-card overview-card overview-card--signal-strip">
                      <div className="overview-signal-strip">
                        <article className="overview-signal-card">
                          <span>当前任务</span>
                          <strong>{(detail.currentAssignments ?? []).length}</strong>
                          <p>正在执行中的工作项</p>
                        </article>
                        <article className="overview-signal-card">
                          <span>运行时状态</span>
                          <strong>{formatRuntimeStatusLabel(detail.runtime.status)}</strong>
                          <p>{detail.runtime.pid ? `当前进程号 ${detail.runtime.pid}` : '当前没有活跃运行时进程'}</p>
                        </article>
                        <article className="overview-signal-card">
                          <span>活跃会话</span>
                          <strong>{runningSessionCount}</strong>
                          <p>{runtimeSessions.length ? `最近会话：${latestRuntimeSessionTime || '刚刚更新'}` : '当前还没有会话记录'}</p>
                        </article>
                        <article className="overview-signal-card">
                          <span>最近回流</span>
                          <strong>{latestRuntimeResultStatus}</strong>
                          <p>
                            {latestRuntimeResult
                              ? `${formatShortDateTime(latestRuntimeResult.createdAt)} · 共 ${recentRuntimeResults.length} 条结果`
                              : '最近还没有结果回流'}
                          </p>
                        </article>
                      </div>
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
                  </div>
                  <div className="execution-workspace__rail">
                    <RuntimeDispatchPanel
                      employeeId={detail.employeeId}
                      initialResults={recentRuntimeResults}
                      initialSessions={runtimeSessions}
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
                  </div>
                </div>
              </div>
                );
              })()
            ) : null}
            {selectedDetailTab === 'collaboration' ? (
              <div className="detail-tab-panel detail-tab-panel--collaboration" role="tabpanel" aria-label="推进">
                <div className="collaboration-workspace">
                  <div className="collaboration-workspace__main">
                    <GroupMessagePanel
                      employeeId={detail.employeeId}
                      groups={detail.projectGroups}
                      preferredChatId={preferredProjectGroupChatId}
                      onOperationRecorded={() => {
                        setProjectOpsRefreshKey((current) => current + 1);
                        setDetailReloadKey((current) => current + 1);
                      }}
                    />
                    <ChatPanel
                      employeeId={detail.employeeId}
                      latestReasoningSummary={detail.latestReasoningSummary}
                      latestArtifacts={normalizeArtifacts(detail.latestArtifacts)}
                    />
                    <ProjectOpsHistoryPanel employeeId={detail.employeeId} refreshKey={projectOpsRefreshKey} />
                  </div>
                  <div className="collaboration-workspace__rail">
                    <ProjectGroupPanel
                      employeeId={detail.employeeId}
                      onPreferredGroupChange={(chatId) => setPreferredProjectGroupChatId(chatId)}
                      onGroupsChange={(groups) =>
                        setDetail((current: any) => ({
                          ...current,
                          projectGroups: groups,
                        }))
                      }
                    />
                    <TechReviewPanel
                      employeeId={detail.employeeId}
                      collapsible
                      onOperationRecorded={() => setProjectOpsRefreshKey((current) => current + 1)}
                    />
                    <ProjectOpsActionPanel
                      employeeId={detail.employeeId}
                      collapsible
                      onOperationRecorded={() => setProjectOpsRefreshKey((current) => current + 1)}
                    />
                    <InternalMessagePanel
                      currentEmployeeId={detail.employeeId}
                      collapsible
                      employees={employees.map((employee) => ({
                        employeeId: employee.employeeId,
                        displayName: employee.displayName,
                      }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
            {selectedDetailTab === 'growth' ? (
              <div className="detail-tab-panel detail-tab-panel--growth" role="tabpanel" aria-label="成长">
                <div className="growth-workspace">
                  <div className="growth-workspace__main">
                    <section className="panel-card overview-card overview-card--signal-strip">
                      <div className="overview-signal-strip">
                        <article className="overview-signal-card">
                          <span>当前情绪</span>
                          <strong>{formatEmotionLabel(detail.emotionState.current)}</strong>
                          <p>{detail.emotionState.summary || '近期情绪状态稳定'}</p>
                        </article>
                        <article className="overview-signal-card">
                          <span>留存风险</span>
                          <strong>{formatRiskLevelLabel(detail.performanceState.retentionRisk)}</strong>
                          <p>交付、评审与压力反馈的综合信号</p>
                        </article>
                        <article className="overview-signal-card">
                          <span>自治学习</span>
                          <strong>{employeeAutonomyMap[detail.employeeId]?.enabled ? '开启' : '关闭'}</strong>
                          <p>
                            {employeeAutonomyMap[detail.employeeId]?.nextRunAt
                              ? `下次：${new Date(employeeAutonomyMap[detail.employeeId].nextRunAt).toLocaleString('zh-CN', { hour12: false })}`
                              : '当前没有排队中的自治唤醒'}
                          </p>
                        </article>
                        <article className="overview-signal-card">
                          <span>经验沉淀</span>
                          <strong>{detail.latestLearningRecordId ? '已沉淀' : '待沉淀'}</strong>
                          <p>{detail.latestLearningRecordId ? `最近记录：${detail.latestLearningRecordId}` : '最近还没有新的经验记录'}</p>
                        </article>
                      </div>
                    </section>
                    <ReflectionPanel employeeId={detail.employeeId} />
                    <LearningRecordPanel
                      employeeId={detail.employeeId}
                      onLatestRecordChange={(record) =>
                        setDetail((current: any) => ({
                          ...current,
                          latestLearningRecordId: record.recordId,
                        }))
                      }
                    />
                    <DirectionKnowledgePanel
                      employeeId={detail.employeeId}
                      directionId={detail.directionId}
                      latestLearningRecordId={detail.latestLearningRecordId}
                    />
                    <div className="growth-secondary-grid">
                      <EmotionPanel
                        employeeId={detail.employeeId}
                        onEmotionStateChange={(emotionState) => {
                          setDetail((current: any) => ({
                            ...current,
                            emotionState: {
                              ...current.emotionState,
                              current: emotionState.current,
                              summary: emotionState.summary,
                            },
                          }));
                          setEmployees((current: any[]) =>
                            current.map((employee) =>
                              employee.employeeId === detail.employeeId
                                ? {
                                    ...employee,
                                    emotionCurrent: emotionState.current,
                                  }
                                : employee,
                            ),
                          );
                        }}
                      />
                      <PerformancePanel
                        employeeId={detail.employeeId}
                        onPerformanceStateChange={(performanceState) => {
                          setDetail((current: any) => ({
                            ...current,
                            performanceState: {
                              ...current.performanceState,
                              retentionRisk: performanceState.retentionRisk,
                            },
                          }));
                          setEmployees((current: any[]) =>
                            current.map((employee) =>
                              employee.employeeId === detail.employeeId
                                ? {
                                    ...employee,
                                    retentionRisk: performanceState.retentionRisk,
                                  }
                                : employee,
                            ),
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="growth-workspace__rail">
                    <AutonomyPanel
                      employeeId={detail.employeeId}
                      initialSettings={employeeAutonomyMap[detail.employeeId] ?? null}
                    />
                    <BrainPreviewPanel employeeId={detail.employeeId} />
                  </div>
                </div>
              </div>
            ) : null}
            {selectedDetailTab === 'management' ? (
              <div className="detail-tab-panel detail-tab-panel--management" role="tabpanel" aria-label="管理">
                <div className="management-workspace">
                  <div className="management-workspace__main">
                    <HrPanel
                      employeeId={detail.employeeId}
                      currentLevel={detail.level}
                      employmentStatus={detail.employmentStatus}
                      currentDirectionId={detail.directionId}
                      currentDefaultKnowledgeBaseIds={
                        detail.defaultKnowledgeBaseIds ?? detail.directionConfig?.defaultKnowledgeBaseIds ?? []
                      }
                      directions={directions}
                      onLevelChange={(level) => {
                        setDetail((current: any) => ({ ...current, level }));
                        setEmployees((current) =>
                          current.map((employee) =>
                            employee.employeeId === detail.employeeId ? { ...employee, level } : employee,
                          ),
                        );
                      }}
                      onEmploymentStatusChange={(employmentStatus) => {
                        setDetail((current: any) => ({ ...current, employmentStatus }));
                        setEmployees((current) =>
                          current.map((employee) =>
                            employee.employeeId === detail.employeeId ? { ...employee, employmentStatus } : employee,
                          ),
                        );
                      }}
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
                        setEmployees((current: any[]) => {
                          const nextEmployee = {
                            employeeId,
                            displayName,
                            level,
                            directionId,
                            employmentStatus: 'active',
                            recentDoneSummary: '新员工已入职，等待领取首个任务',
                            nextStepSummary: '完成环境熟悉并领取首个任务',
                            emotionCurrent: 'focused',
                            retentionRisk: 'low',
                            runtimeKind: 'trae_acp',
                            activeTaskCount: 1,
                          };

                          const alreadyExists = current.some((employee) => employee.employeeId === employeeId);
                          return alreadyExists
                            ? current.map((employee) =>
                                employee.employeeId === employeeId ? { ...employee, ...nextEmployee } : employee,
                              )
                            : [...current, nextEmployee];
                        });
                      }}
                    />
                  </div>
                  <div className="management-workspace__rail">
                    <FeishuRuntimeHealthCard
                      runtimeStatus={
                        feishuAgentRuntimeStatus?.employeeId === detail.employeeId ? feishuAgentRuntimeStatus : null
                      }
                    />
                    {feishuBotPreview?.employeeId === detail.employeeId ? (
                      <FeishuAgentPanel
                        employeeId={detail.employeeId}
                        preview={feishuBotPreview}
                        onBound={(binding) => {
                          setFeishuBotPreview((current: any) => ({
                            ...current,
                            ...binding,
                            employeeId: detail.employeeId,
                            bindingStatus: binding.bindingStatus,
                            canJoinProjectGroups: true,
                          }));
                          setDetailReloadKey((current) => current + 1);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <FeishuConversationPanel
                  conversations={detail.recentFeishuConversations}
                  onRefresh={() => setDetailReloadKey((current) => current + 1)}
                />
                <div className="management-secondary-grid">
                  <ManagerProxyReviewPanel
                    employeeId={detail.employeeId}
                    compact
                    onWorkStateUpdate={(update) =>
                      setDetail((current: any) => ({
                        ...current,
                        recentDoneSummary: update.recentDoneSummary,
                        nextStepSummary: update.nextStepSummary,
                      }))
                    }
                  />
                  <ResignationPanel
                    employeeId={detail.employeeId}
                    compact
                    onEmploymentStatusChange={(employmentStatus) => {
                      setDetail((current: any) => ({
                        ...current,
                        employmentStatus,
                        resignationIntent: employmentStatus === 'resigned' ? 'submitted' : current.resignationIntent,
                      }));
                      setEmployees((current) =>
                        current.map((employee) =>
                          employee.employeeId === detail.employeeId ? { ...employee, employmentStatus } : employee,
                        ),
                      );
                    }}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p>Loading...</p>
        )}
      </section>
    </main>
  );
}
