import { useEffect, useState } from 'react';
import { getBrainPreview, type BrainPreview, type BrainPreviewTaskType } from '../lib/api';

const TASK_TYPES: BrainPreviewTaskType[] = ['coding', 'coordination', 'status', 'reflection', 'collaboration'];

function formatTaskTypeLabel(taskType: BrainPreviewTaskType) {
  if (taskType === 'coding') return '研发';
  if (taskType === 'coordination') return '协同';
  if (taskType === 'status') return '状态';
  if (taskType === 'reflection') return '复盘';
  return '协作';
}

function formatPreviewSectionTitle(title: string) {
  if (title === 'workingMemory') return '工作记忆';
  if (title === 'episodicMemory') return '经历记忆';
  if (title === 'knowledgeItems') return '知识引用';
  return title;
}

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
      <ul className="brain-preview-panel__payload-list">
        {payload.map((item, index) => (
          <li key={`${index}-${typeof item === 'string' ? item : JSON.stringify(item)}`}>{renderPayload(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof payload === 'object') {
    return (
      <ul className="brain-preview-panel__payload-list">
        {Object.entries(payload).map(([key, value]) => (
          <li key={key}>
            <strong>{key}</strong>
            {': '}
            {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? (
              <span>{String(value)}</span>
            ) : (
              <div className="brain-preview-panel__payload-nested">{renderPayload(value)}</div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <pre className="brain-preview-panel__payload-pre">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function PreviewList(props: { title: string; items: unknown }) {
  const normalizedItems = normalizePreviewItems(props.items);

  return (
    <details className="brain-preview-panel__card">
      <summary>{formatPreviewSectionTitle(props.title)}</summary>
      {normalizedItems.length ? (
        <ul className="brain-preview-panel__list">
          {normalizedItems.map((item) => (
            <li key={`${props.title}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="ops-inline-note">暂无预览</div>
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
    <section className="ops-section brain-preview-panel">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">脑预览</p>
          <h3>脑内预览</h3>
          <p className="ops-section__summary-note">默认给你看任务类型和上下文层，细节按需再展开。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--light">当前任务类型：{formatTaskTypeLabel(taskType)}</span>
          <span className="inline-state inline-state--light">{preview?.layers.length ?? 0} 层</span>
        </div>
      </div>

      <div className="brain-preview-panel__task-types">
        {TASK_TYPES.map((item) => (
          <button
            key={item}
            onClick={() => setTaskType(item)}
            className={`brain-preview-panel__task-button${item === taskType ? ' brain-preview-panel__task-button--active' : ''}`}
          >
            {formatTaskTypeLabel(item)}
          </button>
        ))}
      </div>

      {loading ? <p>脑内预览加载中...</p> : null}
      {error ? <p>{error}</p> : null}

      {preview ? (
        <div className="brain-preview-panel__content">
          <section className="brain-preview-panel__summary-grid">
            <article className="brain-preview-panel__summary-card">
              <span>工作记忆</span>
              <strong>{normalizePreviewItems(preview.inputsPreview?.workingMemory).length}</strong>
              <p>当前任务关联的短时上下文</p>
            </article>
            <article className="brain-preview-panel__summary-card">
              <span>经历记忆</span>
              <strong>{normalizePreviewItems(preview.inputsPreview?.episodicMemory).length}</strong>
              <p>最近可复用的经验片段</p>
            </article>
            <article className="brain-preview-panel__summary-card">
              <span>知识引用</span>
              <strong>{normalizePreviewItems(preview.inputsPreview?.knowledgeItems).length}</strong>
              <p>当前挂进来的文档与知识入口</p>
            </article>
          </section>

          <section className="brain-preview-panel__card">
            <strong>上下文层顺序</strong>
            <ol className="brain-preview-panel__list">
              {preview.layers.map((item) => (
                <li key={item.layer}>
                  <div className="brain-preview-panel__layer-title">{item.layer}</div>
                  <details className="brain-preview-panel__payload">
                    <summary>查看 payload</summary>
                    <div>{renderPayload(item.payload)}</div>
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
