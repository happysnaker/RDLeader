import { useEffect, useMemo, useState } from 'react';
import {
  collectRuntimeEventsAction,
  decideApprovalRequest,
  getApprovalRequests,
  getManagerConversation,
  type ApprovalRequest,
  type ApprovalRequestDecision,
  type ManagerConversationMessage,
  sendManagerMessage,
} from '../lib/api';
import { ExpandableText } from './expandable-text';
import { formatDisplayReference, formatDisplayText } from '../lib/display';

const QUICK_MANAGER_PROMPTS = [
  '同步一下你现在的真实进展',
  '现在的 blocker 是什么',
  '你接下来准备先做什么',
  '直接去看真实工作区后给我结论',
];

function formatMessageTime(createdAt?: string | null) {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function messageKey(message: ManagerConversationMessage, index: number) {
  return message.messageId || `${message.role}-${message.createdAt ?? 'unknown'}-${index}`;
}

function formatApprovalStatus(status: ApprovalRequest['status']) {
  if (status === 'approved') return '已批准';
  if (status === 'rejected') return '已拒绝';
  return '待处理';
}

export function ChatPanel(props: {
  employeeId: string;
  latestReasoningSummary?: string | null;
  latestArtifacts?: Array<{ label: string; value: string }>;
}) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ManagerConversationMessage[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [decisionRequestId, setDecisionRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadConversationAndApprovals(showLoading: boolean = true) {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      try {
        await collectRuntimeEventsAction(props.employeeId).catch(() => undefined);
        const [conversation, approvals] = await Promise.all([
          getManagerConversation(props.employeeId),
          getApprovalRequests(props.employeeId),
        ]);

        if (isActive) {
          setMessages(Array.isArray(conversation) ? conversation : []);
          setApprovalRequests(Array.isArray(approvals) ? approvals : []);
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (loadError) {
        if (isActive) {
          setMessages([]);
          setApprovalRequests([]);
          setError(loadError instanceof Error ? loadError.message : '加载沟通记录失败');
        }
      } finally {
        if (isActive && showLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadConversationAndApprovals();
    const timer = window.setInterval(() => {
      void loadConversationAndApprovals(false);
    }, 5000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [props.employeeId]);

  const hasLatestContext = useMemo(
    () => Boolean(props.latestReasoningSummary) || Boolean((props.latestArtifacts ?? []).length),
    [props.latestArtifacts, props.latestReasoningSummary],
  );

  async function handleSendMessage() {
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const payload = await sendManagerMessage({
        employeeId: props.employeeId,
        body,
      });

      setMessages((current) => [...current, payload.message, ...(payload.reply ? [payload.reply] : [])]);
      const refreshedApprovals = await getApprovalRequests(props.employeeId).catch(() => approvalRequests);
      setApprovalRequests(Array.isArray(refreshedApprovals) ? refreshedApprovals : []);
      setDraft('');
      setLastSyncedAt(new Date().toISOString());

      if (payload.replyPending && payload.reply?.messageId) {
        const pendingReplyId = payload.reply.messageId;
        void (async () => {
          for (let attempt = 0; attempt < 18; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await collectRuntimeEventsAction(props.employeeId).catch(() => undefined);
            const conversation = await getManagerConversation(props.employeeId).catch(() => null);
            if (!Array.isArray(conversation)) {
              continue;
            }
            setMessages(conversation);
            const replyMessage = conversation.find((message) => message.messageId === pendingReplyId);
            if (replyMessage && !replyMessage.body.includes('正在基于真实工作区处理这条消息')) {
              break;
            }
          }
        })();
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '发送消息失败');
    } finally {
      setIsSending(false);
    }
  }

  async function handleApprovalDecision(requestId: string, decision: ApprovalRequestDecision) {
    if (decisionRequestId) return;

    setDecisionRequestId(requestId);
    setError(null);

    try {
      const updatedRequest = await decideApprovalRequest(requestId, decision);
      setApprovalRequests((current) =>
        current.map((request) => (request.requestId === requestId ? updatedRequest : request)),
      );
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : '处理审批失败');
    } finally {
      setDecisionRequestId(null);
    }
  }

  return (
    <section className="ops-section chat-panel">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">老板沟通</p>
          <h3>沟通</h3>
          <p className="ops-section__summary-note">自动轮询对话并回填运行结果，避免你手动盯状态。</p>
        </div>
        <div className="ops-section__summary-badges">
          <span className="inline-state inline-state--ready">自动追结果</span>
          <span className="inline-state inline-state--light">{lastSyncedAt ? `同步于 ${formatMessageTime(lastSyncedAt)}` : '准备同步'}</span>
        </div>
      </div>
      {hasLatestContext ? (
        <section className="chat-panel__context">
          {props.latestReasoningSummary ? (
            <>
              <strong>最新推理摘要</strong>
              <div className="chat-panel__context-body">{props.latestReasoningSummary}</div>
            </>
          ) : null}
          {(props.latestArtifacts ?? []).length ? (
            <div className="chat-panel__context-artifacts">
              <strong>任务 / 结果产物</strong>
              <ul className="chat-panel__artifact-list">
                {(props.latestArtifacts ?? []).map((artifact) => (
                  <li key={`${artifact.label}-${artifact.value}`}>
                    {artifact.label}：{artifact.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      {error ? <div className="ops-inline-error">{error}</div> : null}
      <section className="chat-panel__approval-section">
        <div className="chat-panel__section-header">
          <h4>审批请求</h4>
          <span className="ops-badge ops-badge--neutral">{approvalRequests.length} 条</span>
        </div>
        <div className="chat-panel__approval-list">
          {isLoading ? <div>加载审批请求...</div> : null}
          {!isLoading && approvalRequests.length === 0 ? (
            <div className="ops-inline-note">暂无审批请求。</div>
          ) : null}
          {!isLoading
            ? approvalRequests.map((request) => {
                const isPending = request.status === 'pending';
                const isSubmitting = decisionRequestId === request.requestId;

                return (
                  <article
                    key={request.requestId}
                    className={`chat-panel__approval-card chat-panel__approval-card--${request.status}`}
                  >
                    <div className="chat-panel__approval-head">
                      <strong>{request.summary}</strong>
                      <span className={`chat-panel__approval-badge chat-panel__approval-badge--${request.status}`}>
                        状态：{formatApprovalStatus(request.status)}
                      </span>
                    </div>

                    <div className="chat-panel__approval-meta">
                      风险等级：{request.riskLevel ?? '-'}
                      {request.createdAt ? ` · 创建于 ${formatMessageTime(request.createdAt)}` : ''}
                      {request.resolvedAt ? ` · 处理于 ${formatMessageTime(request.resolvedAt)}` : ''}
                    </div>

                    {request.approvalSummary ? <div className="chat-panel__approval-summary">{request.approvalSummary}</div> : null}

                    {isPending ? (
                      <div className="ops-actions">
                        <button
                          disabled={isSubmitting}
                          aria-label={`批准请求 ${request.requestId}`}
                          onClick={() => void handleApprovalDecision(request.requestId, 'approved')}
                        >
                          {isSubmitting ? '处理中...' : '批准'}
                        </button>
                        <button
                          disabled={isSubmitting}
                          aria-label={`拒绝请求 ${request.requestId}`}
                          onClick={() => void handleApprovalDecision(request.requestId, 'rejected')}
                        >
                          拒绝
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })
            : null}
        </div>
      </section>
      <div className="chat-panel__messages">
        {isLoading ? <div>加载沟通记录...</div> : null}
        {!isLoading && messages.length === 0 ? (
          <div className="ops-inline-note">还没有历史沟通，先发一条消息试试。</div>
        ) : null}
        {!isLoading
          ? messages.map((message, index) => {
              const isEmployee = message.role === 'employee';

              return (
                <article
                  key={messageKey(message, index)}
                  className={`chat-panel__message ${isEmployee ? 'chat-panel__message--employee' : 'chat-panel__message--manager'}`}
                >
                  <div className="chat-panel__message-header">
                    <strong>{isEmployee ? '员工' : '经理'}</strong>
                    {message.createdAt ? (
                      <span className="chat-panel__message-time">{formatMessageTime(message.createdAt)}</span>
                    ) : null}
                  </div>
                  <ExpandableText text={formatDisplayText(message.body)} previewClassName="chat-message-body" />

                  {isEmployee && message.reasoningSummary ? (
                    <div className="chat-panel__message-block">
                      <strong>推理摘要</strong>
                      <ExpandableText text={formatDisplayText(message.reasoningSummary)} />
                    </div>
                  ) : null}

                  {isEmployee && (message.artifactRefs ?? []).length ? (
                    <div className="chat-panel__message-block">
                      <strong>任务 / 结果产物</strong>
                      <ul className="chat-panel__artifact-list">
                        {(message.artifactRefs ?? []).map((artifactRef) => (
                          <li key={artifactRef}>
                            <span className="reference-text">{formatDisplayReference(artifactRef)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isEmployee && message.approvalRequired ? (
                    <div className="chat-panel__approval-hint">
                      <strong>需要经理批准</strong>
                      {message.approvalSummary ? <div>{message.approvalSummary}</div> : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          : null}
      </div>
      <div className="ops-preset-row chat-panel__preset-grid">
        {QUICK_MANAGER_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setDraft(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="chat-panel__composer">
        <input
          placeholder="给员工发消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button disabled={isSending} onClick={() => void handleSendMessage()}>
          {isSending ? '发送中...' : '发送消息'}
        </button>
      </div>
    </section>
  );
}
