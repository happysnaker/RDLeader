export function StatusPill(props: { label: string }) {
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: '#eef2ff',
      }}
    >
      {props.label}
    </span>
  );
}
