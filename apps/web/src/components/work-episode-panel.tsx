import { useEffect, useState } from 'react';
import { createWorkEpisode, getWorkEpisodes, type WorkEpisode } from '../lib/api';
import { formatDisplayReference, formatDisplayText } from '../lib/display';

function normalizeEpisodes(payload: WorkEpisode[] | null | undefined) {
  return Array.isArray(payload) ? payload : [];
}

function formatEpisodeStatusLabel(status: string) {
  if (status === 'in_progress') return '进行中';
  if (status === 'blocked') return '阻塞';
  if (status === 'done' || status === 'completed') return '已完成';
  return status;
}

export function WorkEpisodePanel(props: {
  employeeId: string;
  initialEpisodes?: WorkEpisode[] | null;
  onEpisodeCreated?: (episode: WorkEpisode) => void;
}) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [blocker, setBlocker] = useState('');
  const [reasoningSummary, setReasoningSummary] = useState('');
  const [artifactRefs, setArtifactRefs] = useState('');
  const [episodes, setEpisodes] = useState<WorkEpisode[]>(normalizeEpisodes(props.initialEpisodes));

  useEffect(() => {
    setEpisodes(normalizeEpisodes(props.initialEpisodes));
  }, [props.initialEpisodes]);

  useEffect(() => {
    void getWorkEpisodes(props.employeeId).then((payload) => {
      setEpisodes(normalizeEpisodes(payload));
    });
  }, [props.employeeId]);

  async function recordEpisode() {
    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      status: status.trim(),
      blocker: blocker.trim() || undefined,
      reasoningSummary: reasoningSummary.trim() || undefined,
      artifactRefs: artifactRefs
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    if (!payload.title || !payload.summary || !payload.status) return;

    const episode = await createWorkEpisode(props.employeeId, payload);
    setEpisodes((current) => [episode, ...current]);
    props.onEpisodeCreated?.(episode);
    setTitle('');
    setSummary('');
    setStatus('in_progress');
    setBlocker('');
    setReasoningSummary('');
    setArtifactRefs('');
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">观测</p>
          <h3>工作片段观测</h3>
        </div>
        <span className="inline-state inline-state--light">{episodes.length} 条片段</span>
      </div>
      <details className="ops-segment">
        <summary>记录工作片段</summary>
        <div className="ops-form-grid">
          <input placeholder="工作记录标题" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea placeholder="工作记录摘要" value={summary} onChange={(event) => setSummary(event.target.value)} />
          <label className="ops-field-label">
            <span>当前状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="in_progress">进行中</option>
              <option value="blocked">阻塞</option>
              <option value="done">已完成</option>
            </select>
          </label>
          <input placeholder="当前阻塞项（可选）" value={blocker} onChange={(event) => setBlocker(event.target.value)} />
          <textarea placeholder="最新推理摘要（可选）" value={reasoningSummary} onChange={(event) => setReasoningSummary(event.target.value)} />
          <textarea placeholder="任务 / 结果产物引用（每行一条）" value={artifactRefs} onChange={(event) => setArtifactRefs(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void recordEpisode()}>记录工作片段</button>
          </div>
        </div>
      </details>
      <ul className="ops-list ops-list--compact ops-scroll-list">
        {episodes.map((episode) => (
          <li key={episode.episodeId} className="ops-list-item">
            <div className="ops-list-item__header">
              <strong>{episode.title}</strong>
              <span className="ops-badge ops-badge--neutral">{formatEpisodeStatusLabel(episode.status)}</span>
            </div>
            <p>{formatDisplayText(episode.summary)}</p>
            {episode.blocker ? <p>当前阻塞项：{formatDisplayText(episode.blocker)}</p> : null}
            {episode.reasoningSummary ? <p>推理摘要：{formatDisplayText(episode.reasoningSummary)}</p> : null}
            {(episode.artifactRefs ?? []).length ? (
              <div>
                <strong>产物引用</strong>
                <ul className="ops-sublist">
                  {(episode.artifactRefs ?? []).map((artifactRef) => (
                    <li key={`${episode.episodeId}-${artifactRef}`}>
                      <span className="reference-text">{formatDisplayReference(artifactRef)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
