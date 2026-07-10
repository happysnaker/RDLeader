function formatEmotionLabel(label: string) {
  if (label === 'focused') return '专注';
  if (label === 'proud') return '自信';
  if (label === 'calm') return '平稳';
  if (label === 'anxious') return '紧张';
  if (label === 'tired') return '疲惫';
  return label;
}

export function StatusPill(props: { label: string }) {
  return (
    <span className="status-pill">{formatEmotionLabel(props.label)}</span>
  );
}
