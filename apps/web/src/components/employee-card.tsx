import { StatusPill } from './status-pill';

function formatDirection(directionId?: string) {
  if (directionId === 'independent-growth-diversion') {
    return '独立端增长导流';
  }

  if (directionId === 'core-platform') {
    return '核心平台';
  }

  return directionId ?? '-';
}

export function EmployeeCard(props: {
  employee: {
    employeeId: string;
    displayName: string;
    level: string;
    recentDoneSummary: string;
    nextStepSummary: string;
    emotionCurrent: string;
    directionId?: string;
    retentionRisk?: string;
    runtimeKind?: string;
    activeTaskCount?: number;
  };
  onSelect: (employeeId: string) => void;
}) {
  return (
    <button
      className="employee-card"
      onClick={() => props.onSelect(props.employee.employeeId)}
    >
      <h3>{props.employee.displayName}</h3>
      <p>职级：{props.employee.level}</p>
      <p>方向：{formatDirection(props.employee.directionId)}</p>
      <p>已做：{props.employee.recentDoneSummary}</p>
      <p>下一步：{props.employee.nextStepSummary}</p>
      {typeof props.employee.activeTaskCount === 'number' ? <p>活跃任务数：{props.employee.activeTaskCount}</p> : null}
      <p>留存风险：{props.employee.retentionRisk ?? '-'}</p>
      <p>Runtime：{props.employee.runtimeKind ?? '-'}</p>
      <StatusPill label={props.employee.emotionCurrent} />
    </button>
  );
}
