import { useEffect, useMemo, useState } from 'react';
import { getInternalMessages, sendInternalMessage } from '../lib/api';

export function InternalMessagePanel(props: {
  currentEmployeeId: string;
  employees: Array<{ employeeId: string; displayName: string }>;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const recipients = useMemo(() => {
    return props.employees.filter((employee) => employee.employeeId !== props.currentEmployeeId);
  }, [props.currentEmployeeId, props.employees]);
  const employeeNameMap = useMemo(
    () => new Map(props.employees.map((employee) => [employee.employeeId, employee.displayName] as const)),
    [props.employees],
  );

  const [recipientEmployeeId, setRecipientEmployeeId] = useState(recipients[0]?.employeeId ?? '');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<
    Array<{ senderEmployeeId: string; recipientEmployeeId: string; body: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(Boolean(props.defaultOpen));

  useEffect(() => {
    setRecipientEmployeeId(recipients[0]?.employeeId ?? '');
  }, [recipients]);

  useEffect(() => {
    let active = true;

    async function loadMessages(showLoading: boolean = true) {
      if (showLoading) {
        setIsLoading(true);
      }
      setError('');

      try {
        const payload = await getInternalMessages(props.currentEmployeeId);
        if (!active) return;
        setMessages(Array.isArray(payload) ? payload : []);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        if (!active) return;
        setMessages([]);
        setError(err instanceof Error ? err.message : '加载员工协作消息失败');
      } finally {
        if (active && showLoading) {
          setIsLoading(false);
        }
      }
    }

    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages(false);
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.currentEmployeeId]);

  async function submit() {
    if (!draft.trim() || !recipientEmployeeId || isSending) return;

    setIsSending(true);
    setError('');

    try {
      const payload = await sendInternalMessage({
        senderEmployeeId: props.currentEmployeeId,
        recipientEmployeeId,
        body: draft,
      });

      setMessages((current) => [...current, payload.message]);
      setDraft('');
      setLastSyncedAt(new Date().toISOString());
      if (props.collapsible) {
        setIsExpanded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送员工协作消息失败');
      if (props.collapsible) {
        setIsExpanded(true);
      }
    } finally {
      setIsSending(false);
    }
  }

  const latestMessage = messages[messages.length - 1];
  const latestRoute = latestMessage
    ? `${employeeNameMap.get(latestMessage.senderEmployeeId) ?? latestMessage.senderEmployeeId} → ${employeeNameMap.get(latestMessage.recipientEmployeeId) ?? latestMessage.recipientEmployeeId}`
    : recipients.length
      ? '把提醒、协作请求或同步发给其他员工'
      : '当前没有其他在职员工可协作';

  const content = (
    <>
      {error ? <p role="alert" className="ops-inline-error">{error}</p> : null}
      <div className="ops-list ops-list--compact ops-scroll-list internal-message-panel__list">
        {isLoading ? <div className="ops-inline-note">正在同步员工协作消息...</div> : null}
        {!isLoading && messages.length === 0 ? <div className="ops-inline-note">还没有员工间协作记录。</div> : null}
        {messages.map((message, index) => (
          <div key={`${message.senderEmployeeId}-${message.recipientEmployeeId}-${index}`} className="ops-list-item">
            <div className="ops-list-item__header">
              <strong>
                {(employeeNameMap.get(message.senderEmployeeId) ?? message.senderEmployeeId)} → {(employeeNameMap.get(message.recipientEmployeeId) ?? message.recipientEmployeeId)}
              </strong>
              <span className="ops-badge ops-badge--neutral">员工协作</span>
            </div>
            <p>{message.body}</p>
          </div>
        ))}
      </div>
      <div className="chat-panel__composer">
        <select value={recipientEmployeeId} onChange={(event) => setRecipientEmployeeId(event.target.value)} disabled={!recipients.length || isSending}>
          {recipients.map((employee) => (
            <option key={employee.employeeId} value={employee.employeeId}>
              {employee.displayName}
            </option>
          ))}
        </select>
        <input
          placeholder={recipients.length ? '给其他员工发协作消息' : '当前没有可选协作对象'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!recipients.length || isSending}
        />
        <button onClick={() => void submit()} disabled={!recipients.length || isSending}>
          {isSending ? '发送中...' : '发送内部协作消息'}
        </button>
      </div>
    </>
  );

  if (props.collapsible) {
    return (
      <details className="ops-section ops-section--foldable" open={isExpanded} onToggle={(event) => setIsExpanded(event.currentTarget.open)}>
        <summary className="ops-section__foldable-summary">
          <div>
            <p className="eyebrow">内部协作</p>
            <h3>员工协作</h3>
            <p className="ops-section__summary-note">{latestRoute}</p>
          </div>
          <div className="ops-section__summary-badges">
            <span className="inline-state inline-state--ready">自动同步</span>
            <span className="inline-state inline-state--light">{lastSyncedAt ? `${messages.length} 条` : '准备同步'}</span>
          </div>
        </summary>
        <div className="ops-section__content">{content}</div>
      </details>
    );
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">内部协作</p>
          <h3>员工协作</h3>
        </div>
      </div>
      {content}
    </section>
  );
}
