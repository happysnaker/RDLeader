import { StatusPill } from './status-pill';

export function EmployeeCard(props: {
  employee: {
    employeeId: string;
    displayName: string;
    level: string;
    recentDoneSummary: string;
    nextStepSummary: string;
    emotionCurrent: string;
  };
  onSelect: (employeeId: string) => void;
}) {
  return (
    <button
      onClick={() => props.onSelect(props.employee.employeeId)}
      style={{
        textAlign: 'left',
        padding: 16,
        border: '1px solid #dbe4ff',
        borderRadius: 12,
        background: 'white',
      }}
    >
      <h3>{props.employee.displayName}</h3>
      <p>职级：{props.employee.level}</p>
      <p>已做：{props.employee.recentDoneSummary}</p>
      <p>下一步：{props.employee.nextStepSummary}</p>
      <StatusPill label={props.employee.emotionCurrent} />
    </button>
  );
}
