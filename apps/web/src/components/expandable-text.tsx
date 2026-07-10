import { useMemo, useState } from 'react';

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function ExpandableText(props: {
  text: string;
  maxLength?: number;
  previewClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const normalized = useMemo(() => normalizeText(props.text || '-'), [props.text]);
  const maxLength = props.maxLength ?? 180;
  const collapsed = normalized.length > maxLength;
  const preview = collapsed ? `${normalized.slice(0, maxLength)}…` : normalized;

  return (
    <div className="expandable-text">
      <div className={props.previewClassName}>{expanded ? normalized : preview}</div>
      {collapsed ? (
        <button
          type="button"
          className="text-link-button"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? '收起' : '展开'}
        </button>
      ) : null}
    </div>
  );
}
