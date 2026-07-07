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

export function AutonomyPanel(props: { employeeId: string }) {
  const [settings, setSettings] = useState<AutonomySettings | null>(null);
  const [runs, setRuns] = useState<AutonomousLearningRun[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [cadenceHours, setCadenceHours] = useState(6);
  const [autoPromoteToDirectionKnowledge, setAutoPromoteToDirectionKnowledge] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setStatusMessage('');

    void getAutonomySettings(props.employeeId).then((payload) => {
      setSettings(payload);
      setEnabled(payload.enabled);
      setCadenceHours(payload.cadenceHours);
      setAutoPromoteToDirectionKnowledge(payload.autoPromoteToDirectionKnowledge);
    });

    void getAutonomousLearningRuns(props.employeeId).then((payload) => {
      setRuns(Array.isArray(payload) ? payload : []);
    });
  }, [props.employeeId]);

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
    <section style={{ marginTop: 24 }}>
      <h3>自主学习闭环</h3>
      <p>自治学习：{settings?.enabled ? '开启' : '关闭'}</p>
      <p>节奏：{settings ? `${settings.cadenceHours} 小时` : '-'}</p>
      <p>自动提升方向知识：{settings?.autoPromoteToDirectionKnowledge ? '开启' : '关闭'}</p>
      <p>最近运行：{displayValue(settings?.lastRunAt)}</p>
      <p>下次运行：{displayValue(settings?.nextRunAt)}</p>
      <p>运行次数：{displayValue(settings?.runCount)}</p>
      <p>最近结果：{displayValue(settings?.lastOutcome)}</p>
      <p>最近摘要：{displayValue(settings?.lastSummary)}</p>

      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" aria-label="启用自主学习" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          启用自主学习
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>学习节奏（小时）</span>
          <input
            aria-label="学习节奏（小时）"
            type="number"
            min={1}
            value={cadenceHours}
            onChange={(event) => setCadenceHours(Number(event.target.value) || 1)}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            aria-label="自动提升到方向知识"
            checked={autoPromoteToDirectionKnowledge}
            onChange={(event) => setAutoPromoteToDirectionKnowledge(event.target.checked)}
          />
          自动提升到方向知识
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => void saveSettings()}>保存自治设置</button>
          <button onClick={() => void runNow()}>立即运行自学习</button>
        </div>
        {statusMessage ? <div>{statusMessage}</div> : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 8 }}>最近自治运行</h4>
        <ul style={{ paddingLeft: 20 }}>
          {runs.map((run) => (
            <li key={run.cycleRunId} style={{ marginBottom: 8 }}>
              <strong>
                {run.trigger} · {run.createdAt}
              </strong>
              <div>{displayValue(run.summary)}</div>
              {run.reflection?.summary ? <div>反思：{run.reflection.summary}</div> : null}
              {run.learningRecord?.title ? <div>学习记录：{run.learningRecord.title}</div> : null}
              {run.directionKnowledgeRecord?.title ? <div>方向知识：{run.directionKnowledgeRecord.title}</div> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
