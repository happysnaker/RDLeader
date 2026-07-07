import { useState } from 'react';
import { createTechReviewDocAction, scheduleTechReviewAction } from '../lib/api';

export function TechReviewPanel(props: { employeeId: string; onOperationRecorded?: () => void }) {
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

  async function previewDoc() {
    const payload = await createTechReviewDocAction(props.employeeId, {
      title: docTitle,
      problem,
      nextSteps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
      dryRun: true,
    });
    setDocPreview((payload.command ?? []).join(' '));
  }

  async function executeDoc() {
    const payload = await createTechReviewDocAction(props.employeeId, {
      title: docTitle,
      problem,
      nextSteps: nextSteps.split('\n').map((item) => item.trim()).filter(Boolean),
      approved: true,
    });
    setDocResult(`文档已创建：${payload.result.title}`);
    props.onOperationRecorded?.();
  }

  async function previewMeeting() {
    const payload = await scheduleTechReviewAction(props.employeeId, {
      summary: meetingSummary,
      description: problem,
      start: meetingStart,
      end: meetingEnd,
      attendeeIds: attendeeIds.split(',').map((item) => item.trim()).filter(Boolean),
      dryRun: true,
    });
    setMeetingPreview((payload.command ?? []).join(' '));
  }

  async function executeMeeting() {
    const payload = await scheduleTechReviewAction(props.employeeId, {
      summary: meetingSummary,
      description: problem,
      start: meetingStart,
      end: meetingEnd,
      attendeeIds: attendeeIds.split(',').map((item) => item.trim()).filter(Boolean),
      approved: true,
    });
    setMeetingResult(`会议已创建：${payload.result.summary}`);
    props.onOperationRecorded?.();
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>技术评审动作</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="技术评审文档标题" value={docTitle} onChange={(event) => setDocTitle(event.target.value)} />
        <input placeholder="技术问题背景" value={problem} onChange={(event) => setProblem(event.target.value)} />
        <textarea
          placeholder="下一步（每行一条）"
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void previewDoc()}>预览技术文档命令</button>
          <button onClick={() => void executeDoc()}>批准后创建技术文档</button>
        </div>
        {docPreview ? <div>{docPreview}</div> : null}
        {docResult ? <div>{docResult}</div> : null}

        <input placeholder="评审会议标题" value={meetingSummary} onChange={(event) => setMeetingSummary(event.target.value)} />
        <input placeholder="会议开始时间" value={meetingStart} onChange={(event) => setMeetingStart(event.target.value)} />
        <input placeholder="会议结束时间" value={meetingEnd} onChange={(event) => setMeetingEnd(event.target.value)} />
        <input
          placeholder="参会人 open_id，逗号分隔"
          value={attendeeIds}
          onChange={(event) => setAttendeeIds(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void previewMeeting()}>预览评审会议命令</button>
          <button onClick={() => void executeMeeting()}>批准后发起评审会议</button>
        </div>
        {meetingPreview ? <div>{meetingPreview}</div> : null}
        {meetingResult ? <div>{meetingResult}</div> : null}
      </div>
    </section>
  );
}
