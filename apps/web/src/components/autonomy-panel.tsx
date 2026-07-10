import { useEffect, useState } from 'react';
import {
  getAutonomousLearningRuns,
  getAutonomySettings,
  runAutonomousLearningAction,
  type AutonomousLearningRun,
  type AutonomySettings,
  updateAutonomySettings,
} from '../lib/api';

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function formatRunTime(value?: string | null) {
  if (!value) return '-';
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

export function AutonomyPanel(props: { employeeId: string; initialSettings?: AutonomySettings | null }) {
  const [settings, setSettings] = useState<AutonomySettings | null>(props.initialSettings ?? null);
  const [runs, setRuns] = useState<AutonomousLearningRun[]>([]);
  const [enabled, setEnabled] = useState(props.initialSettings?.enabled ?? false);
  const [cadenceHours, setCadenceHours] = useState(props.initialSettings?.cadenceHours ?? 6);
  const [autoPromoteToDirectionKnowledge, setAutoPromoteToDirectionKnowledge] = useState(
    props.initialSettings?.autoPromoteToDirectionKnowledge ?? false,
  );
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setSettings(props.initialSettings ?? null);
    setRuns([]);
    setEnabled(props.initialSettings?.enabled ?? false);
    setCadenceHours(props.initialSettings?.cadenceHours ?? 6);
    setAutoPromoteToDirectionKnowledge(props.initialSettings?.autoPromoteToDirectionKnowledge ?? false);
    setStatusMessage('');
  }, [props.employeeId]);

  useEffect(() => {
    if (!props.initialSettings || settings) {
      return;
    }

    setSettings(props.initialSettings);
    setEnabled(props.initialSettings.enabled);
    setCadenceHours(props.initialSettings.cadenceHours);
    setAutoPromoteToDirectionKnowledge(props.initialSettings.autoPromoteToDirectionKnowledge);
  }, [props.initialSettings, settings]);

  useEffect(() => {
    let active = true;
    setStatusMessage('');

    async function loadAutonomy() {
      try {
        const payload = await getAutonomySettings(props.employeeId);
        if (!active) return;
        setSettings(payload);
        setEnabled(payload.enabled);
        setCadenceHours(payload.cadenceHours);
        setAutoPromoteToDirectionKnowledge(payload.autoPromoteToDirectionKnowledge);
      } catch {
        // Keep the latest visible snapshot when the refresh fails.
      }
    }

    async function loadRuns() {
      try {
        const payload = await getAutonomousLearningRuns(props.employeeId);
        if (!active) return;
        const nextRuns = Array.isArray(payload) ? payload : [];
        setRuns(nextRuns);

        const latestRunSettings = nextRuns[0]?.autonomySettings ?? null;
        if (!settings && latestRunSettings) {
          setSettings(latestRunSettings);
          setEnabled(latestRunSettings.enabled);
          setCadenceHours(latestRunSettings.cadenceHours);
          setAutoPromoteToDirectionKnowledge(latestRunSettings.autoPromoteToDirectionKnowledge);
        }
      } catch {
        // Keep the latest visible run list when the refresh fails.
      }
    }

    void loadAutonomy();
    void loadRuns();
    const timer = window.setInterval(() => {
      void loadAutonomy();
      void loadRuns();
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.employeeId]);

  const visibleSettings = settings ?? runs[0]?.autonomySettings ?? props.initialSettings ?? null;

  async function saveSettings() {
    const payload = await updateAutonomySettings(props.employeeId, {
      enabled,
      cadenceHours,
      autoPromoteToDirectionKnowledge,
    });
    setSettings(payload);
    setEnabled(payload.enabled);
    setCadenceHours(payload.cadenceHours);
    setAutoPromoteToDirectionKnowledge(payload.autoPromoteToDirectionKnowledge);
    setStatusMessage('自治设置已保存');
  }

  async function runNow() {
    const payload = await runAutonomousLearningAction(props.employeeId);
    setRuns((current) => [payload, ...current.filter((run) => run.cycleRunId !== payload.cycleRunId)]);

    if (payload.autonomySettings) {
      setSettings(payload.autonomySettings);
      setEnabled(payload.autonomySettings.enabled);
      setCadenceHours(payload.autonomySettings.cadenceHours);
      setAutoPromoteToDirectionKnowledge(payload.autonomySettings.autoPromoteToDirectionKnowledge);
    }

    setStatusMessage('已触发一次自治学习');
  }

  return (
    <section className="ops-section autonomy-panel">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">自治</p>
          <h3>自主学习闭环</h3>
          <p className="ops-section__summary-note">把节奏、提升策略和最近运行结果放在同一处，避免切页查看。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">{visibleSettings?.enabled ? '已开启' : '已关闭'}</span>
          <span className="inline-state inline-state--light">{displayValue(visibleSettings?.runCount)} 次</span>
        </div>
      </div>

      <div className="autonomy-summary-grid">
        <div className="autonomy-summary-card">
          <span>自治学习</span>
          <strong>{visibleSettings?.enabled ? '开启' : '关闭'}</strong>
          <small>自治学习：{visibleSettings?.enabled ? '开启' : '关闭'}</small>
        </div>
        <div className="autonomy-summary-card">
          <span>节奏</span>
          <strong>{visibleSettings ? `${visibleSettings.cadenceHours} 小时` : '-'}</strong>
          <small>节奏：{visibleSettings ? `${visibleSettings.cadenceHours} 小时` : '-'}</small>
        </div>
        <div className="autonomy-summary-card">
          <span>方向知识提升</span>
          <strong>{visibleSettings?.autoPromoteToDirectionKnowledge ? '开启' : '关闭'}</strong>
          <small>自动提升方向知识：{visibleSettings?.autoPromoteToDirectionKnowledge ? '开启' : '关闭'}</small>
        </div>
        <div className="autonomy-summary-card">
          <span>运行次数</span>
          <strong>{displayValue(visibleSettings?.runCount)}</strong>
          <small>运行次数：{displayValue(visibleSettings?.runCount)}</small>
        </div>
        <div className="autonomy-summary-card">
          <span>最近结果</span>
          <strong>{displayValue(visibleSettings?.lastOutcome)}</strong>
          <small>最近结果：{displayValue(visibleSettings?.lastOutcome)}</small>
        </div>
        <div className="autonomy-summary-card autonomy-summary-card--wide">
          <span>最近摘要</span>
          <strong>{displayValue(visibleSettings?.lastSummary)}</strong>
          <small>最近摘要：{displayValue(visibleSettings?.lastSummary)}</small>
        </div>
      </div>

      <div className="autonomy-settings-grid">
        <label className="ops-checkbox-row">
          <input type="checkbox" aria-label="启用自主学习" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          启用自主学习
        </label>

        <label className="ops-field-label">
          <span>学习节奏（小时）</span>
          <input
            aria-label="学习节奏（小时）"
            type="number"
            min={1}
            value={cadenceHours}
            onChange={(event) => setCadenceHours(Number(event.target.value) || 1)}
          />
        </label>

        <label className="ops-checkbox-row">
          <input
            type="checkbox"
            aria-label="自动提升到方向知识"
            checked={autoPromoteToDirectionKnowledge}
            onChange={(event) => setAutoPromoteToDirectionKnowledge(event.target.checked)}
          />
          自动提升到方向知识
        </label>

        <div className="ops-actions">
          <button onClick={() => void saveSettings()}>保存自治设置</button>
          <button onClick={() => void runNow()}>立即运行自学习</button>
        </div>
        {statusMessage ? <div className="ops-inline-note">{statusMessage}</div> : null}
      </div>

      <div>
        <div className="ops-section__header">
          <div>
            <p className="eyebrow">最近运行</p>
            <h4 className="autonomy-panel__history-title">最近自治运行</h4>
          </div>
          <span className="inline-state inline-state--light">{runs.length} 条</span>
        </div>
        <ul className="ops-list ops-list--compact ops-scroll-list">
          {runs.map((run) => (
            <li key={run.cycleRunId} className="ops-list-item">
              <div className="ops-list-item__header">
                <strong>{run.trigger}</strong>
                <span className="ops-badge ops-badge--neutral">{formatRunTime(run.createdAt)}</span>
              </div>
              <p>{displayValue(run.summary)}</p>
              {run.reflection?.summary ? <p>反思：{run.reflection.summary}</p> : null}
              {run.learningRecord?.title ? <p>学习记录：{run.learningRecord.title}</p> : null}
              {run.directionKnowledgeRecord?.title ? <p>方向知识：{run.directionKnowledgeRecord.title}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
