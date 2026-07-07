import { useEffect, useMemo, useState } from 'react';
import {
  decideApprovalRequest,
  getApprovalRequests,
  getManagerConversation,
  type ApprovalRequest,
  type ApprovalRequestDecision,
  type ManagerConversationMessage,
  sendManagerMessage,
} from '../lib/api';

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

function approvalStatusColor(status: ApprovalRequest['status']) {
  if (status === 'approved') {
    return {
      border: '#b7ebc6',
      background: '#f3fff6',
      badgeBackground: '#d1fadf',
      badgeColor: '#027a48',
    };
  }

  if (status === 'rejected') {
    return {
      border: '#fecdca',
      background: '#fff5f4',
      badgeBackground: '#fee4e2',
      badgeColor: '#b42318',
    };
  }

  return {
    border: '#fedf89',
    background: '#fffaf0',
    badgeBackground: '#fef0c7',
    badgeColor: '#b54708',
  };
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

  useEffect(() => {
    let isActive = true;

    async function loadConversationAndApprovals() {
      setIsLoading(true);
      setError(null);

      try {
        const [conversation, approvals] = await Promise.all([
          getManagerConversation(props.employeeId),
          getApprovalRequests(props.employeeId),
        ]);

        if (isActive) {
          setMessages(Array.isArray(conversation) ? conversation : []);
          setApprovalRequests(Array.isArray(approvals) ? approvals : []);
        }
      } catch (loadError) {
        if (isActive) {
          setMessages([]);
          setApprovalRequests([]);
          setError(loadError instanceof Error ? loadError.message : '加载沟通记录失败');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadConversationAndApprovals();

    return () => {
      isActive = false;
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
      setDraft('');
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
    <section style={{ marginTop: 24 }}>
      <h3>沟通</h3>
      {hasLatestContext ? (
        <section
          style={{
            marginBottom: 12,
            padding: 12,
            border: '1px solid #dbe4ff',
            borderRadius: 12,
            background: '#f8faff',
          }}
        >
          {props.latestReasoningSummary ? (
            <>
              <strong>最新推理摘要</strong>
              <div style={{ marginTop: 4 }}>{props.latestReasoningSummary}</div>
            </>
          ) : null}
          {(props.latestArtifacts ?? []).length ? (
            <div style={{ marginTop: props.latestReasoningSummary ? 8 : 0 }}>
              <strong>任务 / 结果产物</strong>
              <ul style={{ marginTop: 4 }}>
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
      {error ? (
        <div style={{ marginBottom: 12, color: '#b42318' }}>{error}</div>
      ) : null}
      <section
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #dbe4ff',
          borderRadius: 12,
          background: '#fcfcfd',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>审批请求</h4>
          <span style={{ color: '#667085', fontSize: 12 }}>{approvalRequests.length} 条</span>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {isLoading ? <div>加载审批请求...</div> : null}
          {!isLoading && approvalRequests.length === 0 ? (
            <div style={{ color: '#667085' }}>暂无审批请求。</div>
          ) : null}
          {!isLoading
            ? approvalRequests.map((request) => {
                const colors = approvalStatusColor(request.status);
                const isPending = request.status === 'pending';
                const isSubmitting = decisionRequestId === request.requestId;

                return (
                  <article
                    key={request.requestId}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.background,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        alignItems: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <strong>{request.summary}</strong>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: colors.badgeBackground,
                          color: colors.badgeColor,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        状态：{formatApprovalStatus(request.status)}
                      </span>
                    </div>

                    <div style={{ color: '#475467', fontSize: 13 }}>
                      风险等级：{request.riskLevel ?? '-'}
                      {request.createdAt ? ` · 创建于 ${formatMessageTime(request.createdAt)}` : ''}
                      {request.resolvedAt ? ` · 处理于 ${formatMessageTime(request.resolvedAt)}` : ''}
                    </div>

                    {request.approvalSummary ? <div style={{ marginTop: 8 }}>{request.approvalSummary}</div> : null}

                    {isPending ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
      <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
        {isLoading ? <div>加载沟通记录...</div> : null}
        {!isLoading && messages.length === 0 ? (
          <div style={{ color: '#667085' }}>还没有历史沟通，先发一条消息试试。</div>
        ) : null}
        {!isLoading
          ? messages.map((message, index) => {
              const isEmployee = message.role === 'employee';

              return (
                <article
                  key={messageKey(message, index)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${isEmployee ? '#d6f5dd' : '#dbe4ff'}`,
                    background: isEmployee ? '#f3fff6' : '#f8faff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <strong>{isEmployee ? '员工' : '经理'}</strong>
                    {message.createdAt ? (
                      <span style={{ color: '#667085', fontSize: 12 }}>{formatMessageTime(message.createdAt)}</span>
                    ) : null}
                  </div>
                  <div>{message.body}</div>

                  {isEmployee && message.reasoningSummary ? (
                    <div style={{ marginTop: 8 }}>
                      <strong>推理摘要</strong>
                      <div style={{ marginTop: 4 }}>{message.reasoningSummary}</div>
                    </div>
                  ) : null}

                  {isEmployee && (message.artifactRefs ?? []).length ? (
                    <div style={{ marginTop: 8 }}>
                      <strong>任务 / 结果产物</strong>
                      <ul style={{ marginTop: 4, marginBottom: 0 }}>
                        {(message.artifactRefs ?? []).map((artifactRef) => (
                          <li key={artifactRef}>{artifactRef}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isEmployee && message.approvalRequired ? (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 10,
                        background: '#fff7e6',
                        border: '1px solid #fedf89',
                      }}
                    >
                      <strong>需要经理批准</strong>
                      {message.approvalSummary ? <div style={{ marginTop: 4 }}>{message.approvalSummary}</div> : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          : null}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="给员工发消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ flex: 1 }}
        />
        <button disabled={isSending} onClick={() => void handleSendMessage()}>
          {isSending ? '发送中...' : '发送消息'}
        </button>
      </div>
    </section>
  );
}
