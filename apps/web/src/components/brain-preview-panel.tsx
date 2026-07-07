import { useEffect, useState } from 'react';
import { getBrainPreview, type BrainPreview, type BrainPreviewTaskType } from '../lib/api';

const TASK_TYPES: BrainPreviewTaskType[] = ['coding', 'coordination', 'status', 'reflection', 'collaboration'];

function normalizePreviewItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      return JSON.stringify(item);
    });
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${typeof item === 'string' ? item : JSON.stringify(item)}`);
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [String(value)];
}

function renderPayload(payload: unknown) {
  if (payload === null || payload === undefined) return '-';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    return (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {payload.map((item, index) => (
          <li key={`${index}-${typeof item === 'string' ? item : JSON.stringify(item)}`}>{renderPayload(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof payload === 'object') {
    return (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {Object.entries(payload).map(([key, value]) => (
          <li key={key}>
            <strong>{key}</strong>
            {': '}
            {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? (
              <span>{String(value)}</span>
            ) : (
              <div style={{ marginTop: 4 }}>{renderPayload(value)}</div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function PreviewList(props: { title: string; items: unknown }) {
  const normalizedItems = normalizePreviewItems(props.items);

  return (
    <details
      open
      style={{
        border: '1px solid #dbe4ff',
        borderRadius: 12,
        padding: 12,
        background: '#f8faff',
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{props.title}</summary>
      {normalizedItems.length ? (
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          {normalizedItems.map((item) => (
            <li key={`${props.title}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={{ marginTop: 8, color: '#566070' }}>暂无预览</div>
      )}
    </details>
  );
}

export function BrainPreviewPanel(props: { employeeId: string }) {
  const [taskType, setTaskType] = useState<BrainPreviewTaskType>('coding');
  const [preview, setPreview] = useState<BrainPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    void getBrainPreview(props.employeeId, taskType)
      .then((payload) => {
        if (!active) return;
        setPreview(payload);
      })
      .catch(() => {
        if (!active) return;
        setPreview(null);
        setError('脑内预览加载失败');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.employeeId, taskType]);

  return (
    <section style={{ marginTop: 24 }}>
      <h3>脑内预览</h3>
      <p>当前任务类型：{taskType}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {TASK_TYPES.map((item) => (
          <button
            key={item}
            onClick={() => setTaskType(item)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: item === taskType ? '1px solid #375dfb' : '1px solid #d0d7e2',
              background: item === taskType ? '#eef2ff' : '#fff',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? <p>脑内预览加载中...</p> : null}
      {error ? <p>{error}</p> : null}

      {preview ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <section
            style={{
              border: '1px solid #dbe4ff',
              borderRadius: 12,
              padding: 12,
              background: '#fff',
            }}
          >
            <strong>Layer 顺序</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {preview.layers.map((item) => (
                <li key={item.layer} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{item.layer}</div>
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ cursor: 'pointer' }}>查看 payload</summary>
                    <div style={{ marginTop: 8 }}>{renderPayload(item.payload)}</div>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          <PreviewList title="workingMemory" items={preview.inputsPreview?.workingMemory} />
          <PreviewList title="episodicMemory" items={preview.inputsPreview?.episodicMemory} />
          <PreviewList title="knowledgeItems" items={preview.inputsPreview?.knowledgeItems} />
        </div>
      ) : null}
    </section>
  );
}
