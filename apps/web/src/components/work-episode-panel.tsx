import { useEffect, useState } from 'react';
import { createWorkEpisode, getWorkEpisodes, type WorkEpisode } from '../lib/api';

function normalizeEpisodes(payload: WorkEpisode[] | null | undefined) {
  return Array.isArray(payload) ? payload : [];
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
    <section style={{ marginTop: 24 }}>
      <h3>工作片段观测</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="工作记录标题" value={title} onChange={(event) => setTitle(event.target.value)} />
        <textarea placeholder="工作记录摘要" value={summary} onChange={(event) => setSummary(event.target.value)} />
        <input
          placeholder="状态，如 in_progress / blocked / done"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        <input
          placeholder="当前阻塞项（可选）"
          value={blocker}
          onChange={(event) => setBlocker(event.target.value)}
        />
        <textarea
          placeholder="最新推理摘要（可选）"
          value={reasoningSummary}
          onChange={(event) => setReasoningSummary(event.target.value)}
        />
        <textarea
          placeholder="任务 / 结果产物引用（每行一条）"
          value={artifactRefs}
          onChange={(event) => setArtifactRefs(event.target.value)}
        />
        <button onClick={() => void recordEpisode()}>记录工作片段</button>
      </div>
      <ul>
        {episodes.map((episode) => (
          <li key={episode.episodeId}>
            <strong>
              {episode.title} · {episode.status}
            </strong>
            <div>{episode.summary}</div>
            {episode.blocker ? <div>当前阻塞项：{episode.blocker}</div> : null}
            {episode.reasoningSummary ? <div>推理摘要：{episode.reasoningSummary}</div> : null}
            {(episode.artifactRefs ?? []).length ? (
              <div>
                产物：
                <ul>
                  {(episode.artifactRefs ?? []).map((artifactRef) => (
                    <li key={`${episode.episodeId}-${artifactRef}`}>{artifactRef}</li>
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
