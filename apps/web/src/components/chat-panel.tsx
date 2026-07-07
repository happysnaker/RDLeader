import { useState } from 'react';

export function ChatPanel(props: { employeeId: string }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);

  async function sendMessage() {
    if (!draft.trim()) return;

    const response = await fetch('http://localhost:3001/chat/manager-message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        employeeId: props.employeeId,
        body: draft,
      }),
    });

    const payload = await response.json();
    setMessages((current) => [...current, `老板：${payload.message.body}`]);
    setDraft('');
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>沟通</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {messages.map((message, index) => (
          <div key={`${message}-${index}`}>{message}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="给员工发消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={() => void sendMessage()}>发送消息</button>
      </div>
    </section>
  );
}
