import { useState } from 'react';
import {
  createMeegoCommentAction,
  findProjectChatAction,
  lookupMeegoWorkitemAction,
  updateMeegoWorkitemAction,
} from '../lib/api';

export function ProjectOpsActionPanel(props: {
  employeeId: string;
  onOperationRecorded?: () => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [workitemQuery, setWorkitemQuery] = useState('');
  const [workitemProjectKey, setWorkitemProjectKey] = useState('e-commerce');
  const [workitemPreview, setWorkitemPreview] = useState('');
  const [workitemResult, setWorkitemResult] = useState('');
  const [updateWorkItemId, setUpdateWorkItemId] = useState('');
  const [updateProjectKey, setUpdateProjectKey] = useState('');
  const [updateFields, setUpdateFields] = useState('');
  const [updatePreview, setUpdatePreview] = useState('');
  const [updateResult, setUpdateResult] = useState('');
  const [commentWorkItemId, setCommentWorkItemId] = useState('');
  const [commentProjectKey, setCommentProjectKey] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentPreview, setCommentPreview] = useState('');
  const [commentResult, setCommentResult] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(Boolean(props.defaultOpen));

  function revealPanel() {
    if (props.collapsible) {
      setIsExpanded(true);
    }
  }

  async function previewWorkitemLookup() {
    try {
      setError('');
      const payload = await lookupMeegoWorkitemAction(props.employeeId, {
        lookupType: 'title',
        query: workitemQuery,
        projectKey: workitemProjectKey,
        dryRun: true,
      });
      setWorkitemPreview((payload.command ?? []).join(' '));
      revealPanel();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '预览 Meego 查询命令失败');
    }
  }

  async function runWorkitemLookup() {
    try {
      setError('');
      const payload = await lookupMeegoWorkitemAction(props.employeeId, {
        lookupType: 'title',
        query: workitemQuery,
        projectKey: workitemProjectKey,
      });
      const first = payload.result?.items?.[0];
      if (first) {
        setWorkitemResult(`工作项：${first.id} · ${first.title}`);
      } else if (payload.result?.ok === false) {
        setWorkitemResult(`查询失败：${payload.result?.error ?? '未知错误'}`);
      } else {
        setWorkitemResult('未找到匹配的 Meego 工作项');
      }
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '执行 Meego 查询失败');
    }
  }

  async function runProjectChatLookup() {
    try {
      setError('');
      const payload = await findProjectChatAction(props.employeeId, {
        query: chatQuery,
      });
      const first = payload.result?.chats?.[0];
      if (first) {
        setChatResult(`项目群：${first.name}（${first.chatId}）`);
      } else {
        setChatResult('未找到匹配的项目群');
      }
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '查找项目群失败');
    }
  }

  async function previewWorkitemUpdate() {
    try {
      setError('');
      const payload = await updateMeegoWorkitemAction(props.employeeId, {
        workItemId: updateWorkItemId,
        projectKey: updateProjectKey,
        fields: updateFields,
        dryRun: true,
      });
      setUpdatePreview((payload.command ?? []).join(' '));
      revealPanel();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '预览 Meego 更新命令失败');
    }
  }

  async function executeWorkitemUpdate() {
    try {
      setError('');
      const payload = await updateMeegoWorkitemAction(props.employeeId, {
        workItemId: updateWorkItemId,
        projectKey: updateProjectKey,
        fields: updateFields,
        approved: true,
      });
      setUpdateResult(`已更新工作项：${payload.projectOpsEvent?.summary ?? updateWorkItemId}`);
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '执行 Meego 更新失败');
    }
  }

  async function previewCommentCreate() {
    try {
      setError('');
      const payload = await createMeegoCommentAction(props.employeeId, {
        workItemId: commentWorkItemId,
        projectKey: commentProjectKey,
        commentContent,
        dryRun: true,
      });
      setCommentPreview((payload.command ?? []).join(' '));
      revealPanel();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '预览 Meego 评论命令失败');
    }
  }

  async function executeCommentCreate() {
    try {
      setError('');
      const payload = await createMeegoCommentAction(props.employeeId, {
        workItemId: commentWorkItemId,
        projectKey: commentProjectKey,
        commentContent,
        approved: true,
      });
      setCommentResult(`已创建评论：${payload.projectOpsEvent?.summary ?? commentWorkItemId}`);
      revealPanel();
      props.onOperationRecorded?.();
    } catch (err) {
      revealPanel();
      setError(err instanceof Error ? err.message : '执行 Meego 评论失败');
    }
  }

  const latestNote =
    error ||
    commentResult ||
    updateResult ||
    chatResult ||
    workitemResult ||
    'Meego 查询、项目群定位、字段更新和补评论都放在这里。';

  const sectionBody = (
    <>
      <div className="ops-section__helper">
        <strong>适合场景</strong>
        <p>查工单、搜项目群、补字段、补评论。低频但关键，默认折叠避免把主工作台挤乱。</p>
      </div>
      <div className="ops-form-grid ops-form-grid--segmented">
        <details className="ops-segment">
          <summary>Meego 查询</summary>
          <input placeholder="想查的工作项关键词" value={workitemQuery} onChange={(event) => setWorkitemQuery(event.target.value)} />
          <input placeholder="Meego 项目标识（默认 e-commerce）" value={workitemProjectKey} onChange={(event) => setWorkitemProjectKey(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void previewWorkitemLookup()}>预览查询命令</button>
            <button onClick={() => void runWorkitemLookup()}>执行查询</button>
          </div>
          {workitemPreview ? <pre>{workitemPreview}</pre> : null}
          {workitemResult ? <p className="ops-inline-note">{workitemResult}</p> : null}
        </details>

        <details className="ops-segment">
          <summary>项目群搜索</summary>
          <input placeholder="项目名 / 群名关键词" value={chatQuery} onChange={(event) => setChatQuery(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void runProjectChatLookup()}>查找项目群</button>
          </div>
          {chatResult ? <p className="ops-inline-note">{chatResult}</p> : null}
        </details>

        <details className="ops-segment">
          <summary>Meego 字段更新</summary>
          <input placeholder="Meego 工作项 ID" value={updateWorkItemId} onChange={(event) => setUpdateWorkItemId(event.target.value)} />
          <input placeholder="Meego 项目标识（可留空）" value={updateProjectKey} onChange={(event) => setUpdateProjectKey(event.target.value)} />
          <textarea placeholder='字段 JSON（例如 {"state":"处理中"}）' value={updateFields} onChange={(event) => setUpdateFields(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void previewWorkitemUpdate()}>预览更新命令</button>
            <button onClick={() => void executeWorkitemUpdate()}>批准后更新</button>
          </div>
          {updatePreview ? <pre>{updatePreview}</pre> : null}
          {updateResult ? <p className="ops-inline-note">{updateResult}</p> : null}
        </details>

        <details className="ops-segment">
          <summary>Meego 评论</summary>
          <input placeholder="Meego 工作项 ID" value={commentWorkItemId} onChange={(event) => setCommentWorkItemId(event.target.value)} />
          <input placeholder="Meego 项目标识（可留空）" value={commentProjectKey} onChange={(event) => setCommentProjectKey(event.target.value)} />
          <textarea placeholder="准备补充到工单的评论内容" value={commentContent} onChange={(event) => setCommentContent(event.target.value)} />
          <div className="ops-actions">
            <button onClick={() => void previewCommentCreate()}>预览评论命令</button>
            <button onClick={() => void executeCommentCreate()}>批准后创建评论</button>
          </div>
          {commentPreview ? <pre>{commentPreview}</pre> : null}
          {commentResult ? <p className="ops-inline-note">{commentResult}</p> : null}
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
            <p className="eyebrow">项目动作</p>
            <h3>项目推进动作</h3>
            <p className="ops-section__summary-note">{latestNote}</p>
          </div>
          <div className="ops-section__summary-badges">
            <span className="inline-state inline-state--light">Meego / 项目群</span>
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
          <p className="eyebrow">项目动作</p>
          <h3>项目推进动作</h3>
        </div>
      </div>
      {sectionBody}
    </section>
  );
}
