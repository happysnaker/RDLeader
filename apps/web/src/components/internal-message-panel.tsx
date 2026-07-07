import { useEffect, useMemo, useState } from 'react';
import { getInternalMessages, sendInternalMessage } from '../lib/api';

export function InternalMessagePanel(props: {
  currentEmployeeId: string;
  employees: Array<{ employeeId: string; displayName: string }>;
}) {
  const recipients = useMemo(() => {
    return props.employees.filter((employee) => employee.employeeId !== props.currentEmployeeId);
  }, [props.currentEmployeeId, props.employees]);

  const [recipientEmployeeId, setRecipientEmployeeId] = useState(recipients[0]?.employeeId ?? '');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<
    Array<{ senderEmployeeId: string; recipientEmployeeId: string; body: string }>
  >([]);

  useEffect(() => {
    setRecipientEmployeeId(recipients[0]?.employeeId ?? '');
  }, [recipients]);

  useEffect(() => {
    void getInternalMessages(props.currentEmployeeId).then(setMessages);
  }, [props.currentEmployeeId]);

  async function submit() {
    if (!draft.trim() || !recipientEmployeeId) return;

    const payload = await sendInternalMessage({
      senderEmployeeId: props.currentEmployeeId,
      recipientEmployeeId,
      body: draft,
    });

    setMessages((current) => [...current, payload.message]);
    setDraft('');
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>员工协作</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {messages.map((message, index) => (
          <div key={`${message.senderEmployeeId}-${message.recipientEmployeeId}-${index}`}>
            {message.senderEmployeeId} → {message.recipientEmployeeId}：{message.body}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={recipientEmployeeId} onChange={(event) => setRecipientEmployeeId(event.target.value)}>
          {recipients.map((employee) => (
            <option key={employee.employeeId} value={employee.employeeId}>
              {employee.displayName}
            </option>
          ))}
        </select>
        <input
          placeholder="给其他员工发协作消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={() => void submit()}>发送内部协作消息</button>
      </div>
    </section>
  );
}
