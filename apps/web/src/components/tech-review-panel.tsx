import { useState } from 'react';
import { createTechReviewDocAction, scheduleTechReviewAction } from '../lib/api';

export function TechReviewPanel(props: {
  employeeId: string;
  onOperationRecorded?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [docTitle, setDocTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [docPreview, setDocPreview] = useState('');
  const [docResult, setDocResult] = useState('');

  const [meetingSummary, setMeetingSummary] = useState('');
  const [meetingStart, setMeetingStart] = useState('');
  const [meetingEnd, setMeetingEnd] = useState('');
  const [attendeeIds, setAttendeeIds] = useState('');
  const [meetingPreview, setMeetingPreview] = useState('');
  const [meetingResult, setMeetingResult] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(Boolean(props.defaultOpen));

  function revealPanel() {
    if (props.collapsible) {
      setIsExpanded(true);
    }
  }

  async function previewDoc() {
    try {
      setError('');
      const payload = await createTechReviewDocAction(props.employeeId, {
        title: docTitle,
        problem,
        nextSteps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
        dryRun: true,
      });
      setDocPreview((payload.command ?? []).join(' '));
      revealPanel();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '预览技术文档命令失败');
    }
  }

  async function executeDoc() {
    try {
      setError('');
      const payload = await createTechReviewDocAction(props.employeeId, {
        title: docTitle,
        problem,
        nextSteps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
        approved: true,
      });
      setDocResult(`文档已创建：${payload.result.title}`);
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '创建技术文档失败');
    }
  }

  async function previewMeeting() {
    try {
      setError('');
      const payload = await scheduleTechReviewAction(props.employeeId, {
        summary: meetingSummary,
        description: problem,
        start: meetingStart,
        end: meetingEnd,
        attendeeIds: attendeeIds.split(',').map((item) => item.trim()).filter(Boolean),
        dryRun: true,
      });
      setMeetingPreview((payload.command ?? []).join(' '));
      revealPanel();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '预览评审会议命令失败');
    }
  }

  async function executeMeeting() {
    try {
      setError('');
      const payload = await scheduleTechReviewAction(props.employeeId, {
        summary: meetingSummary,
        description: problem,
        start: meetingStart,
        end: meetingEnd,
        attendeeIds: attendeeIds.split(',').map((item) => item.trim()).filter(Boolean),
        approved: true,
      });
      setMeetingResult(`会议已创建：${payload.result.summary}`);
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '发起评审会议失败');
    }
  }

  const latestNote = error || meetingResult || docResult || '评审文档和评审会议都在这里，默认折叠避免打断主推进视图。';

  const sectionBody = (
    <>
      <div className="ops-section__helper">
        <strong>适合场景</strong>
        <p>需要补技术方案、拉评审会、统一参会人时再展开。日常浏览时保持紧凑。</p>
      </div>
      <div className="ops-form-grid ops-form-grid--segmented">
        <details className="ops-segment">
          <summary>评审文档</summary>
          <input placeholder="评审文档标题" value={docTitle} onChange={(event) => setDocTitle(event.target.value)} />
          <input placeholder="这次要评审的技术问题" value={problem} onChange={(event) => setProblem(event.target.value)} />
          <textarea placeholder="下一步（每行一条）" value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void previewDoc()}>预览文档命令</button>
            <button onClick={() => void executeDoc()}>批准后创建文档</button>
          </div>
          {docPreview ? <pre>{docPreview}</pre> : null}
          {docResult ? <p className="ops-inline-note">{docResult}</p> : null}
        </details>

        <details className="ops-segment">
          <summary>评审会议</summary>
          <input placeholder="会议主题" value={meetingSummary} onChange={(event) => setMeetingSummary(event.target.value)} />
          <input placeholder="会议开始时间" value={meetingStart} onChange={(event) => setMeetingStart(event.target.value)} />
          <input placeholder="会议结束时间" value={meetingEnd} onChange={(event) => setMeetingEnd(event.target.value)} />
          <input placeholder="参会人飞书 ID（逗号分隔）" value={attendeeIds} onChange={(event) => setAttendeeIds(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void previewMeeting()}>预览会议命令</button>
            <button onClick={() => void executeMeeting()}>批准后发起会议</button>
          </div>
          {meetingPreview ? <pre>{meetingPreview}</pre> : null}
          {meetingResult ? <p className="ops-inline-note">{meetingResult}</p> : null}
        </details>
        {error ? <p role="alert" className="ops-inline-error">{error}</p> : null}
      </div>
    </>
  );

  if (props.collapsible) {
    return (
      <details className="ops-section ops-section--foldable" open={isExpanded} onToggle={(event) => setIsExpanded(event.currentTarget.open)}>
        <summary className="ops-section__foldable-summary">
          <div>
            <p className="eyebrow">技术评审</p>
            <h3>技术评审动作</h3>
            <p className="ops-section__summary-note">{latestNote}</p>
          </div>
          <div className="ops-section__summary-badges">
            <span className="inline-state inline-state--light">文档 / 会议</span>
          </div>
        </summary>
        <div className="ops-section__content">{sectionBody}</div>
      </details>
    );
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">技术评审</p>
          <h3>技术评审动作</h3>
        </div>
      </div>
      {sectionBody}
    </section>
  );
}
