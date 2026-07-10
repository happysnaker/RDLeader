import { StatusPill } from './status-pill';
import { formatDisplayText } from '../lib/display';

function formatDirection(directionId?: string) {
  if (directionId === 'independent-growth-diversion') {
    return '独立端增长导流';
  }

  if (directionId === 'core-platform') {
    return '核心平台';
  }

  return directionId ?? '-';
}

function compactText(text: string, maxLength: number = 72) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

function formatEmploymentStatus(status?: string) {
  if (status === 'active' || !status) return '在职';
  if (status === 'fired') return '已解雇';
  if (status === 'resigned') return '已离职';
  return status;
}

function formatRuntimeKind(kind?: string) {
  if (kind === 'trae_acp') return 'Trae';
  if (kind === 'codex_adapter') return 'Codex';
  return kind ?? '-';
}

function formatRiskLevel(level?: string) {
  if (level === 'low') return '低';
  if (level === 'medium') return '中';
  if (level === 'high') return '高';
  return level ?? '-';
}

export function EmployeeCard(props: {
  employee: {
    employeeId: string;
    displayName: string;
    level: string;
    employmentStatus?: string;
    recentDoneSummary: string;
    nextStepSummary: string;
    emotionCurrent: string;
    directionId?: string;
    retentionRisk?: string;
    runtimeKind?: string;
    activeTaskCount?: number;
  };
  autonomySettings?: {
    enabled?: boolean;
    nextRunAt?: string | null;
  } | null;
  selected?: boolean;
  onSelect: (employeeId: string) => void;
}) {
  const recentDoneSummary = formatDisplayText(props.employee.recentDoneSummary?.trim() || '-');
  const nextStepSummary = formatDisplayText(props.employee.nextStepSummary?.trim() || '-');
  const recentDonePreview = compactText(recentDoneSummary);
  const nextStepPreview = compactText(nextStepSummary);

  return (
    <button
      className={`employee-card${props.selected ? ' employee-card--selected' : ''}`}
      aria-pressed={props.selected ? 'true' : 'false'}
      onClick={() => props.onSelect(props.employee.employeeId)}
    >
      <div className="employee-card__header">
        <div>
          <h3>{props.employee.displayName}</h3>
          <p className="employee-card__direction">方向：{formatDirection(props.employee.directionId)}</p>
        </div>
        <StatusPill label={props.employee.emotionCurrent} />
      </div>
      <div className="employee-card__meta-grid">
        <p>职级：{props.employee.level}</p>
        <p>状态：{formatEmploymentStatus(props.employee.employmentStatus)}</p>
        {typeof props.employee.activeTaskCount === 'number' ? <p>活跃任务数：{props.employee.activeTaskCount}</p> : <p>活跃任务数：-</p>}
        <p>留存风险：{formatRiskLevel(props.employee.retentionRisk)}</p>
      </div>
      <div className="employee-card__story">
        <p className="employee-card__summary" title={recentDoneSummary}>已做：{recentDonePreview}</p>
        <p className="employee-card__summary" title={nextStepSummary}>下一步：{nextStepPreview}</p>
      </div>
      <div className="employee-card__footer">
        <span className="employee-card__chip">运行时：{formatRuntimeKind(props.employee.runtimeKind)}</span>
        <span className="employee-card__chip">
          自治：{props.autonomySettings?.enabled ? '开启' : '关闭'}
          {props.autonomySettings?.nextRunAt
            ? ` · ${new Date(props.autonomySettings.nextRunAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}`
            : ''}
        </span>
      </div>
    </button>
  );
}
