import { useEffect, useState } from 'react';
import {
  beginGroupSendScopeAuthAction,
  completeGroupSendScopeAuthAction,
  getExternalBlockers,
  getLatestGroupRouteRepairReport,
  getLatestRuntimeEnduranceReport,
  getLatestSmokeReport,
  openGroupSendScopeAuthInChromeAction,
  resetDemoStateAction,
  type ExternalBlocker,
  type LatestGroupRouteRepairReport,
  type LatestRuntimeEnduranceReport,
  type LatestSmokeReport,
} from '../lib/api';

function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function QaOpsPanel(props: {
  onDemoReset?: () => void;
  compact?: boolean;
}) {
  const [report, setReport] = useState<LatestSmokeReport | null>(null);
  const [enduranceReport, setEnduranceReport] = useState<LatestRuntimeEnduranceReport | null>(null);
  const [groupRouteRepairReport, setGroupRouteRepairReport] = useState<LatestGroupRouteRepairReport | null>(null);
  const [blockers, setBlockers] = useState<ExternalBlocker[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [groupSendScopeAuth, setGroupSendScopeAuth] = useState<{
    verificationUrl: string;
    deviceCode: string;
    qrDataUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      getLatestSmokeReport(),
      getLatestRuntimeEnduranceReport(),
      getLatestGroupRouteRepairReport(),
      getExternalBlockers(),
    ]).then((results) => {
      if (!active) return;
      setReport(results[0]?.status === 'fulfilled' ? results[0].value : null);
      setEnduranceReport(results[1]?.status === 'fulfilled' ? results[1].value : null);
      setGroupRouteRepairReport(results[2]?.status === 'fulfilled' ? results[2].value : null);
      setBlockers(
        results[3]?.status === 'fulfilled' && Array.isArray(results[3].value.items) ? results[3].value.items : [],
      );
    });

    return () => {
      active = false;
    };
  }, []);

  async function resetDemo() {
    setLoading(true);
    setStatusMessage('');
    try {
      const payload = await resetDemoStateAction();
      setStatusMessage(`演示态已重置：${payload.employees.join(', ')}`);
      props.onDemoReset?.();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '重置演示态失败');
    } finally {
      setLoading(false);
    }
  }

  async function beginGroupSendScopeAuth() {
    setLoading(true);
    setStatusMessage('');
    try {
      const payload = await beginGroupSendScopeAuthAction();
      setGroupSendScopeAuth({
        verificationUrl: payload.verificationUrl,
        deviceCode: payload.deviceCode,
        qrDataUrl: payload.qrDataUrl,
      });
      setStatusMessage('已生成群消息权限授权链接');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '发起群消息权限授权失败');
    } finally {
      setLoading(false);
    }
  }

  async function completeGroupSendScopeAuth() {
    if (!groupSendScopeAuth?.deviceCode) {
      return;
    }

    setLoading(true);
    setStatusMessage('');
    try {
      const payload = await completeGroupSendScopeAuthAction(groupSendScopeAuth.deviceCode);
      const message =
        (payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error.message === 'string'
          ? payload.error.message
          : null) ||
        '群消息权限轮询已完成';
      setStatusMessage(message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '轮询群消息权限失败');
    } finally {
      setLoading(false);
    }
  }

  async function openGroupSendScopeAuthInChrome() {
    if (!groupSendScopeAuth?.verificationUrl) {
      return;
    }

    setLoading(true);
    setStatusMessage('');
    try {
      await openGroupSendScopeAuthInChromeAction(groupSendScopeAuth.verificationUrl);
      setStatusMessage('已在 Chrome 打开授权页');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '打开授权页失败');
    } finally {
      setLoading(false);
    }
  }

  const smokeSummary = report?.summary;
  const smokePassed = typeof smokeSummary?.passed === 'number' ? smokeSummary.passed : '-';
  const smokeTotal = typeof smokeSummary?.total === 'number' ? smokeSummary.total : '-';
  const smokeFailed = typeof smokeSummary?.failed === 'number' ? smokeSummary.failed : '-';
  const hasSmokeReport = Boolean(report && smokeSummary);
  const enduranceSummary = enduranceReport?.summary;
  const endurancePassed = typeof enduranceSummary?.passed === 'number' ? enduranceSummary.passed : '-';
  const enduranceCycles = typeof enduranceSummary?.cycles === 'number' ? enduranceSummary.cycles : '-';
  const hasEnduranceReport = Boolean(enduranceReport && enduranceSummary);
  const groupRouteRepairChecks = groupRouteRepairReport?.checks;
  const groupRouteRepairLatestGroup = groupRouteRepairReport?.latestGroup;
  const groupRouteRepairPassed =
    (groupRouteRepairChecks?.bindOk &&
      groupRouteRepairChecks?.sendOk &&
      groupRouteRepairChecks?.identityUsed === 'bot' &&
      groupRouteRepairChecks?.bindingManagerProxyRequired === false) ||
    (groupRouteRepairLatestGroup?.managerProxyRequired === false);
  const groupRouteRepairChatName =
    (groupRouteRepairReport &&
      groupRouteRepairReport.targetChat &&
      typeof groupRouteRepairReport.targetChat.chatName === 'string'
      ? groupRouteRepairReport.targetChat.chatName
      : null) ??
    (groupRouteRepairLatestGroup?.chatName ?? '-');
  const hasGroupRouteRepairReport = Boolean(groupRouteRepairReport);
  const hasAnyReport = hasSmokeReport || hasEnduranceReport || hasGroupRouteRepairReport;
  const latestFinishedAt =
    report?.finishedAt ?? enduranceReport?.finishedAt ?? groupRouteRepairReport?.finishedAt ?? undefined;
  const compact = props.compact === true;

  if (compact) {
    return (
      <section className="panel-card qa-panel qa-panel--compact">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">验收</p>
            <h3>值班 / 验收工具</h3>
          </div>
          <span className={`inline-state ${
            hasSmokeReport ? (smokeFailed === 0 ? 'inline-state--ready' : 'inline-state--error') : 'inline-state--neutral'
          }`}>
            {hasSmokeReport ? `验收 ${smokePassed}/${smokeTotal}` : '等待验收'}
          </span>
        </div>
        <div className="qa-summary-grid qa-summary-grid--compact">
          {hasSmokeReport ? (
            <div className="qa-summary-card">
              <span>最新验收</span>
              <strong>{`${smokePassed} / ${smokeTotal}`}</strong>
              <small>失败数：{smokeFailed}</small>
            </div>
          ) : null}
          {hasEnduranceReport ? (
            <div className="qa-summary-card">
              <span>稳定性回归</span>
              <strong>{`${endurancePassed} / ${enduranceCycles}`}</strong>
              <small>{formatTime(enduranceReport?.finishedAt)}</small>
            </div>
          ) : null}
          {!hasSmokeReport && !hasEnduranceReport ? (
            <div className="qa-summary-card qa-summary-card--wide qa-summary-card--empty">
              <span>最近验收</span>
              <strong>暂无可展示结果</strong>
              <small>需要时再展开更多工具。</small>
            </div>
          ) : null}
        </div>
        <details className="qa-panel__more">
          <summary>更多验收操作</summary>
          {hasGroupRouteRepairReport ? (
            <div className="qa-summary-card qa-summary-card--wide">
              <span>群路由修复</span>
              <strong>
                群路由修复：
                {`${groupRouteRepairPassed ? 'PASS' : 'FAIL'} · ${groupRouteRepairChatName}`}
              </strong>
              <small>群路由时间：{formatTime(groupRouteRepairReport?.finishedAt)}</small>
            </div>
          ) : null}
          {hasAnyReport ? <p className="qa-panel__timestamp">最近完成：{formatTime(latestFinishedAt)}</p> : null}
          {blockers.length ? (
            <details className="qa-blocker-details">
              <summary>剩余 blocker（{blockers.length}）</summary>
              <ul>
                {blockers.map((item) => (
                  <li key={item.key}>
                    <strong>{item.title}</strong>：{item.detail}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="qa-panel__clear">当前无真实 blocker（默认演示占位群不计入）。</p>
          )}
          {blockers.some((item) => item.key === 'group-send-scope') ? (
            <section className="qa-auth-card">
              <strong>经理代理权限修复</strong>
              <p>机器人直发与自动邀请机器人入群修复已可用；这里只处理无法改走机器人直发时的用户权限问题。</p>
              <div className="ops-actions">
                <button type="button" onClick={() => void beginGroupSendScopeAuth()} disabled={loading}>
                  申请群消息权限
                </button>
                {groupSendScopeAuth ? (
                  <>
                    <button type="button" onClick={() => void openGroupSendScopeAuthInChrome()} disabled={loading}>
                      在 Chrome 打开授权页
                    </button>
                    <button type="button" onClick={() => void completeGroupSendScopeAuth()} disabled={loading}>
                      完成授权轮询
                    </button>
                  </>
                ) : null}
              </div>
              {groupSendScopeAuth ? (
                <div className="qa-auth-card__result">
                  <div>{groupSendScopeAuth.verificationUrl}</div>
                  {groupSendScopeAuth.qrDataUrl ? (
                    <img
                      src={groupSendScopeAuth.qrDataUrl}
                      alt="群消息权限二维码"
                      className="ops-qr-image"
                    />
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}
          <div className="ops-actions qa-panel__actions">
            <button type="button" onClick={() => void resetDemo()} disabled={loading}>
              {loading ? '重置中...' : '重置演示态'}
            </button>
          </div>
          {statusMessage ? <p className="ops-inline-note">{statusMessage}</p> : null}
        </details>
      </section>
    );
  }

  return (
    <section className="panel-card qa-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">验收</p>
          <h3>值班 / 验收工具</h3>
        </div>
        <span className={`inline-state ${
          hasSmokeReport ? (smokeFailed === 0 ? 'inline-state--ready' : 'inline-state--error') : 'inline-state--neutral'
        }`}>
          {hasSmokeReport ? `验收 ${smokePassed}/${smokeTotal}` : '等待验收'}
        </span>
      </div>
      <div className="qa-summary-grid">
        {hasSmokeReport ? (
          <div className="qa-summary-card">
            <span>最新验收</span>
            <strong>最新验收：{`${smokePassed} / ${smokeTotal}`}</strong>
            <small>失败数：{smokeFailed}</small>
          </div>
        ) : null}
        {hasEnduranceReport ? (
          <div className="qa-summary-card">
            <span>稳定性回归</span>
            <strong>稳定性回归：{`${endurancePassed} / ${enduranceCycles}`}</strong>
            <small>回归时间：{formatTime(enduranceReport?.finishedAt)}</small>
          </div>
        ) : null}
        {hasGroupRouteRepairReport ? (
          <div className="qa-summary-card qa-summary-card--wide">
            <span>群路由修复</span>
            <strong>
              群路由修复：
              {`${groupRouteRepairPassed ? 'PASS' : 'FAIL'} · ${groupRouteRepairChatName}`}
            </strong>
            <small>群路由时间：{formatTime(groupRouteRepairReport?.finishedAt)}</small>
          </div>
        ) : null}
        {!hasAnyReport ? (
          <div className="qa-summary-card qa-summary-card--wide qa-summary-card--empty">
            <span>最近验收</span>
            <strong>暂时还没有可展示的本地验收结果</strong>
            <small>运行 smoke / endurance 后会自动回流到这里。</small>
          </div>
        ) : null}
      </div>
      {hasAnyReport ? <p className="qa-panel__timestamp">最近完成：{formatTime(latestFinishedAt)}</p> : null}
      {blockers.length ? (
        <details className="qa-blocker-details">
          <summary>剩余 blocker（{blockers.length}）</summary>
          <ul>
            {blockers.map((item) => (
              <li key={item.key}>
                <strong>{item.title}</strong>：{item.detail}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="qa-panel__clear">当前无真实 blocker（默认演示占位群不计入）。</p>
      )}
      {blockers.some((item) => item.key === 'group-send-scope') ? (
        <section className="qa-auth-card">
          <strong>经理代理权限修复</strong>
          <p>机器人直发与自动邀请机器人入群修复已可用；这里只处理无法改走机器人直发时的用户权限问题。</p>
          <div className="ops-actions">
            <button type="button" onClick={() => void beginGroupSendScopeAuth()} disabled={loading}>
              申请群消息权限
            </button>
            {groupSendScopeAuth ? (
              <>
                <button type="button" onClick={() => void openGroupSendScopeAuthInChrome()} disabled={loading}>
                  在 Chrome 打开授权页
                </button>
                <button type="button" onClick={() => void completeGroupSendScopeAuth()} disabled={loading}>
                  完成授权轮询
                </button>
              </>
            ) : null}
          </div>
          {groupSendScopeAuth ? (
            <div className="qa-auth-card__result">
              <div>{groupSendScopeAuth.verificationUrl}</div>
              {groupSendScopeAuth.qrDataUrl ? (
                <img
                  src={groupSendScopeAuth.qrDataUrl}
                  alt="群消息权限二维码"
                  className="ops-qr-image"
                />
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="ops-actions qa-panel__actions">
        <button type="button" onClick={() => void resetDemo()} disabled={loading}>
          {loading ? '重置中...' : '重置演示态'}
        </button>
      </div>
      {statusMessage ? <p className="ops-inline-note">{statusMessage}</p> : null}
    </section>
  );
}
