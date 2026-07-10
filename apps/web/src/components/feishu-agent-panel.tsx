import { useEffect, useState } from 'react';
import {
  bindFeishuAgent,
  beginFeishuAgentOnboarding,
  completeFeishuAgentOnboarding,
  getFeishuAgentOnboardingSession,
  getFeishuAgentRuntimeStatus,
  getFeishuAgentSetupPlan,
  startFeishuAgentRuntime,
  stopFeishuAgentRuntime,
  type FeishuAgentBindResult,
  type FeishuAgentRuntimeStatus,
  type FeishuAgentSetupPlan,
} from '../lib/api';

function formatCommand(command?: string[]) {
  return Array.isArray(command) ? command.join(' ') : '-';
}

function formatChatMode(mode?: 'mention' | 'all' | null) {
  if (mode === 'all') return '接收全部消息';
  return '仅在被 @ 时接收';
}

function formatDmPolicy(policy?: string | null) {
  if (policy === 'manager-only' || !policy) return '仅老板私聊';
  return policy;
}

function formatGroupPolicy(policy?: string | null) {
  if (policy === 'allowlist' || !policy) return '白名单项目群';
  return policy;
}

function formatBindingStatus(status?: string | null) {
  if (status === 'bound') return '已绑定';
  if (status === 'unbound' || !status) return '未绑定';
  return status;
}

function formatDaemonStatus(status?: string | null, ok?: boolean) {
  if (!ok) return '未运行';
  if (status === 'running') return '运行中';
  if (status === 'multiple') return '多实例异常';
  if (status === 'stopped') return '已停止';
  return status || '运行中';
}

export function FeishuAgentPanel(props: {
  employeeId: string;
  preview: any;
  onBound?: (binding: FeishuAgentBindResult) => void;
}) {
  const [setupPlan, setSetupPlan] = useState<FeishuAgentSetupPlan | null>(null);
  const [binding, setBinding] = useState<FeishuAgentBindResult | null>(null);
  const [appId, setAppId] = useState('');
  const [appSecretRef, setAppSecretRef] = useState('');
  const [botOpenId, setBotOpenId] = useState('');
  const [managerOpenId, setManagerOpenId] = useState('');
  const [chatMode, setChatMode] = useState<'mention' | 'all'>('mention');
  const [runtimeStatus, setRuntimeStatus] = useState<FeishuAgentRuntimeStatus | null>(null);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [onboarding, setOnboarding] = useState<{
    verificationUrl: string;
    deviceCode: string;
    qrDataUrl?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [bindingOpen, setBindingOpen] = useState(true);
  const [identityDetailsOpen, setIdentityDetailsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getFeishuAgentSetupPlan(props.employeeId).then((plan) => {
      if (active) setSetupPlan(plan);
    });
    void getFeishuAgentRuntimeStatus(props.employeeId).then((status) => {
      if (active) setRuntimeStatus(status);
    });
    void getFeishuAgentOnboardingSession(props.employeeId).then((session) => {
      if (!active || !session) return;
      setOnboarding({
        verificationUrl: session.verificationUrl,
        deviceCode: session.deviceCode,
        qrDataUrl: session.qrDataUrl,
      });
    });
    return () => {
      active = false;
    };
  }, [props.employeeId]);

  useEffect(() => {
    setBinding(null);
    setRuntimeMessage(null);
    setOnboarding(null);
    setDiagnosticsOpen(props.preview?.bindingStatus !== 'bound');
    setBindingOpen(props.preview?.bindingStatus !== 'bound');
    setIdentityDetailsOpen(false);
  }, [props.employeeId]);

  useEffect(() => {
    setAppId(props.preview?.appId ?? '');
    setAppSecretRef(props.preview?.appSecretRef ?? '');
    setBotOpenId(props.preview?.botOpenId && props.preview.botOpenId !== 'pending' ? props.preview.botOpenId : '');
    setManagerOpenId(props.preview?.managerOpenId ?? '');
    setChatMode(props.preview?.chatMode === 'all' ? 'all' : 'mention');
    setError(null);
  }, [props.preview?.appId, props.preview?.appSecretRef, props.preview?.botOpenId, props.preview?.managerOpenId, props.preview?.chatMode]);

  const safePreview = props.preview?.employeeId === props.employeeId ? props.preview : null;
  const safeSetupPlan = setupPlan?.employeeId === props.employeeId ? setupPlan : null;
  const effective = binding ?? safePreview ?? {};
  const displayBindingStatus = formatBindingStatus(effective.bindingStatus);

  async function submit() {
    setError(null);
    const normalizedAppId = appId.trim();
    const normalizedBotOpenId = botOpenId.trim();
    const normalizedManagerOpenId = managerOpenId.trim();

    if (!normalizedAppId || !normalizedBotOpenId || !normalizedManagerOpenId) {
      setError('应用 ID、机器人身份 ID、老板飞书 ID 必填');
      return;
    }

    try {
      const result = await bindFeishuAgent(props.employeeId, {
        appId: normalizedAppId,
        appSecretRef: appSecretRef.trim(),
        botOpenId: normalizedBotOpenId,
        managerOpenId: normalizedManagerOpenId,
        chatMode,
      });
      setBinding(result);
      setDiagnosticsOpen(false);
      setBindingOpen(false);
      setIdentityDetailsOpen(false);
      setRuntimeMessage(result.configMaterializationMessage ?? null);
      const latestRuntime = await getFeishuAgentRuntimeStatus(props.employeeId).catch(() => null);
      if (latestRuntime) setRuntimeStatus(latestRuntime);
      props.onBound?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败');
    }
  }

  async function beginOnboarding() {
    setRuntimeLoading(true);
    setError(null);
    setRuntimeMessage(null);
    try {
      const payload = await beginFeishuAgentOnboarding(props.employeeId);
      setOnboarding({
        verificationUrl: payload.verificationUrl,
        deviceCode: payload.deviceCode,
        qrDataUrl: payload.qrDataUrl,
      });
      setDiagnosticsOpen(true);
      setBindingOpen(true);
      setIdentityDetailsOpen(true);
      setRuntimeMessage('请扫码创建员工智能体，完成后点击“完成扫码创建并绑定”');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发起员工智能体创建失败');
    } finally {
      setRuntimeLoading(false);
    }
  }

  async function finishOnboarding() {
    if (!onboarding?.deviceCode) return;
    setRuntimeLoading(true);
    setError(null);
    setRuntimeMessage(null);
    try {
      const result = await completeFeishuAgentOnboarding(props.employeeId, {
        deviceCode: onboarding.deviceCode,
        timeoutSeconds: 180,
        chatMode,
      });
      setBinding(result);
      setDiagnosticsOpen(false);
      setBindingOpen(false);
      setIdentityDetailsOpen(false);
      setRuntimeMessage(result.configMaterializationMessage ?? '员工智能体已创建并绑定');
      setOnboarding(null);
      const latestRuntime = await getFeishuAgentRuntimeStatus(props.employeeId).catch(() => null);
      if (latestRuntime) setRuntimeStatus(latestRuntime);
      props.onBound?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '完成员工智能体创建失败');
    } finally {
      setRuntimeLoading(false);
    }
  }

  async function refreshRuntimeStatus() {
    setRuntimeLoading(true);
    try {
      const latest = await getFeishuAgentRuntimeStatus(props.employeeId);
      setRuntimeStatus(latest);
      if (!latest.daemon.ok) {
        setDiagnosticsOpen(true);
        setIdentityDetailsOpen(true);
      }
      setRuntimeMessage(latest.daemon.ok ? '已刷新员工智能体状态' : latest.daemon.error ?? '员工智能体未运行');
    } catch (err) {
      setRuntimeMessage(err instanceof Error ? err.message : '刷新员工智能体状态失败');
    } finally {
      setRuntimeLoading(false);
    }
  }

  async function startRuntime() {
    setRuntimeLoading(true);
    try {
      const payload = await startFeishuAgentRuntime(props.employeeId);
      setDiagnosticsOpen(false);
      setRuntimeMessage(payload?.result?.status?.ok ? '员工智能体已启动' : payload?.result?.status?.error ?? '启动已触发，请稍后刷新');
      const latest = await getFeishuAgentRuntimeStatus(props.employeeId).catch(() => null);
      if (latest) setRuntimeStatus(latest);
    } catch (err) {
      setRuntimeMessage(err instanceof Error ? err.message : '启动员工智能体失败');
    } finally {
      setRuntimeLoading(false);
    }
  }

  async function stopRuntime() {
    setRuntimeLoading(true);
    try {
      const payload = await stopFeishuAgentRuntime(props.employeeId);
      setDiagnosticsOpen(true);
      setRuntimeMessage(payload?.result?.status?.ok ? '员工智能体已停止' : payload?.result?.status?.error ?? '已请求停止员工智能体');
      const latest = await getFeishuAgentRuntimeStatus(props.employeeId).catch(() => null);
      if (latest) setRuntimeStatus(latest);
    } catch (err) {
      setRuntimeMessage(err instanceof Error ? err.message : '停止员工智能体失败');
    } finally {
      setRuntimeLoading(false);
    }
  }

  return (
    <section className="ops-section feishu-agent-panel">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">员工代理</p>
          <h3>飞书员工智能体</h3>
        </div>
        <span className="inline-state inline-state--light">绑定状态：{displayBindingStatus}</span>
      </div>
      <div className="ops-section__subgrid feishu-agent-panel__overview">
        <div className="ops-segment feishu-agent-panel__identity">
          <h4>核心状态</h4>
          <p>机器人名称：{effective.botName ?? props.preview?.botName ?? safeSetupPlan?.botName ?? '-'}</p>
          <p>接入模式：{effective.agentSource === 'larklink' || safeSetupPlan?.setupMode === 'larklink-daemon' ? '飞书独立机器人' : '旧接入'}</p>
          <p>私聊策略：{formatDmPolicy(effective.dmPolicy)}</p>
          <p>群策略：{formatGroupPolicy(effective.groupPolicy)} / {formatChatMode(effective.chatMode)}</p>
          <p>能否进项目群：{effective.canJoinProjectGroups ? '可进入' : '不可进入'}</p>
          {runtimeStatus ? (
            <>
              <p>桥接状态：{formatDaemonStatus(String(runtimeStatus.daemon.status?.status ?? ''), runtimeStatus.daemon.ok)}</p>
              {!runtimeStatus.daemon.ok && runtimeStatus.daemon.error ? <p>{runtimeStatus.daemon.error}</p> : null}
            </>
          ) : null}
        </div>
        <details
          className="ops-segment feishu-agent-panel__identity-details"
          open={identityDetailsOpen}
          onToggle={(event) => setIdentityDetailsOpen((event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>身份与配置详情</summary>
          <div className="feishu-agent-panel__command-stack">
            <p>老板飞书 ID：{effective.managerOpenId ?? '-'}</p>
            {effective.appId ? <p>应用 ID：<code>{effective.appId}</code></p> : null}
            {effective.botOpenId ? <p>机器人身份 ID：<code>{effective.botOpenId}</code></p> : null}
            {safeSetupPlan?.configPath || effective.configPath ? <p>配置文件：{safeSetupPlan?.configPath ?? effective.configPath}</p> : null}
            {safeSetupPlan?.daemonHomePath ? <p>隔离目录：{safeSetupPlan.daemonHomePath}</p> : null}
            {safeSetupPlan?.recommendedAgentId ? <p>底层代理：{safeSetupPlan.recommendedAgentId}</p> : null}
            {runtimeStatus?.daemon.ok && runtimeStatus.daemon.status?.bindId ? <p>实例绑定编号：{String(runtimeStatus.daemon.status.bindId)}</p> : null}
          </div>
        </details>
        <details
          className="ops-segment feishu-agent-panel__diagnostics"
          open={diagnosticsOpen}
          onToggle={(event) => setDiagnosticsOpen((event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>命令与运行诊断</summary>
          <div className="feishu-agent-panel__command-stack">
            <strong>初始化命令</strong>
            <pre>{formatCommand(safeSetupPlan?.createCommand)}</pre>
            <strong>启动命令</strong>
            <pre>{formatCommand(effective.launchCommand ?? safeSetupPlan?.launchCommand ?? effective.bindCommand ?? safeSetupPlan?.bindCommandPreview)}</pre>
            {safeSetupPlan?.statusCommand || effective.statusCommand ? (
              <>
                <strong>状态检查命令</strong>
                <pre>{formatCommand(effective.statusCommand ?? safeSetupPlan?.statusCommand)}</pre>
              </>
            ) : null}
            {safeSetupPlan?.stopCommand || effective.stopCommand ? (
              <>
                <strong>停止命令</strong>
                <pre>{formatCommand(effective.stopCommand ?? safeSetupPlan?.stopCommand)}</pre>
              </>
            ) : null}
          </div>
        </details>
      </div>
      <p className="ops-inline-note">
        员工机器人会先经过 RDLeader 编排层，再用独立身份进入项目群与老板私聊。
      </p>
      <div className="ops-actions">
        <button type="button" onClick={() => void beginOnboarding()} disabled={runtimeLoading}>扫码创建员工智能体</button>
        {onboarding ? <button type="button" onClick={() => void finishOnboarding()} disabled={runtimeLoading}>完成扫码创建并绑定</button> : null}
        <button type="button" onClick={() => void refreshRuntimeStatus()} disabled={runtimeLoading}>刷新智能体状态</button>
        <button type="button" onClick={() => void startRuntime()} disabled={runtimeLoading}>启动员工智能体</button>
        <button type="button" onClick={() => void stopRuntime()} disabled={runtimeLoading}>停止员工智能体</button>
      </div>
      {onboarding ? (
        <div className="ops-segment">
          <div>{onboarding.verificationUrl}</div>
          {onboarding.qrDataUrl ? <img className="ops-qr-image" src={onboarding.qrDataUrl} alt="员工智能体创建二维码" /> : null}
        </div>
      ) : null}
      {runtimeMessage ? <p className="ops-inline-note">{runtimeMessage}</p> : null}
      <details
        className="ops-segment feishu-agent-panel__binding-shell"
        open={bindingOpen}
        onToggle={(event) => setBindingOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>绑定配置</summary>
        <div className="ops-form-grid feishu-agent-panel__bindings">
          <input placeholder="飞书应用 ID" value={appId} onChange={(event) => setAppId(event.target.value)} />
          <input placeholder="应用密钥引用" value={appSecretRef} onChange={(event) => setAppSecretRef(event.target.value)} />
          <input placeholder="机器人身份 ID" value={botOpenId} onChange={(event) => setBotOpenId(event.target.value)} />
          <input placeholder="老板飞书 ID" value={managerOpenId} onChange={(event) => setManagerOpenId(event.target.value)} />
          <select value={chatMode} onChange={(event) => setChatMode(event.target.value as 'mention' | 'all')}>
            <option value="mention">仅在被 @ 时接收</option>
            <option value="all">接收全部消息</option>
          </select>
          <div className="ops-actions feishu-agent-panel__binding-actions">
            <button type="button" onClick={() => void submit()}>绑定飞书智能体</button>
          </div>
        </div>
      </details>
      {error ? <p role="alert" className="ops-inline-error">{error}</p> : null}
    </section>
  );
}
