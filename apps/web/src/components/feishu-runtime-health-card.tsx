export function FeishuRuntimeHealthCard(props: {
  runtimeStatus?: {
    daemon?: {
      ok?: boolean;
      error?: string;
      status?: {
        status?: string;
        processes?: Array<{ pid?: number | null }>;
        ancillaryProcesses?: Array<{ pid?: number | null }>;
      };
    };
  } | null;
}) {
  const daemon = props.runtimeStatus?.daemon;
  const processes = Array.isArray(daemon?.status?.processes) ? daemon?.status?.processes : [];
  const ancillaryProcesses = Array.isArray(daemon?.status?.ancillaryProcesses) ? daemon?.status?.ancillaryProcesses : [];
  const healthState = daemon?.ok ? 'healthy' : 'degraded';
  const healthLabel = daemon?.ok ? '桥接正常' : '桥接异常';
  const healthBadgeClass = daemon?.ok ? 'ops-badge--success' : 'ops-badge--failed';
  const runtimeLabel =
    daemon?.status?.status === 'running'
      ? '运行中'
      : daemon?.status?.status === 'multiple'
        ? '多实例异常'
        : daemon?.ok
          ? String(daemon?.status?.status ?? '运行中')
          : '未运行';

  return (
    <section className={`ops-section runtime-health-card runtime-health-card--${healthState}`}>
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">飞书桥接</p>
          <h3>飞书链路健康</h3>
        </div>
        <span className={`ops-badge ${healthBadgeClass}`}>{healthLabel}</span>
      </div>
      <div className="runtime-health-card__stats">
        <div className="runtime-health-card__stat">
          <span>运行态</span>
          <strong>{runtimeLabel}</strong>
        </div>
        <div className="runtime-health-card__stat">
          <span>主桥接进程</span>
          <strong>{processes.length}</strong>
        </div>
        <div className="runtime-health-card__stat">
          <span>辅助进程</span>
          <strong>{ancillaryProcesses.length}</strong>
        </div>
      </div>
      {daemon?.error ? <p className="ops-inline-error">{daemon.error}</p> : <p className="ops-inline-note">当前桥接进程状态正常，可继续通过飞书派任务。</p>}
    </section>
  );
}
