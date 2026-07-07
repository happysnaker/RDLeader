import { useState } from 'react';
import { sendGroupMessageAction } from '../lib/api';

export function GroupMessagePanel(props: { employeeId: string; onOperationRecorded?: () => void }) {
  const [chatId, setChatId] = useState('');
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');

  async function previewCommand() {
    const payload = await sendGroupMessageAction(props.employeeId, {
      chatId,
      body: draft,
      dryRun: true,
    });
    setPreview((payload.command ?? []).join(' '));
  }

  async function executeCommand() {
    const payload = await sendGroupMessageAction(props.employeeId, {
      chatId,
      body: draft,
      dryRun: false,
      approved: true,
    });
    setResult(`群消息已发送：${payload.result.deliveredBody}`);
    props.onOperationRecorded?.();
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>群推进动作</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="群聊 chat_id" value={chatId} onChange={(event) => setChatId(event.target.value)} />
        <input
          placeholder="给项目群发推进消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void previewCommand()}>预览群消息命令</button>
          <button onClick={() => void executeCommand()}>批准后发群消息</button>
        </div>
        {preview ? <div>{preview}</div> : null}
        {result ? <div>{result}</div> : null}
      </div>
    </section>
  );
}
