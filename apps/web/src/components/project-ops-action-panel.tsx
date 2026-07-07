import { useState } from 'react';
import { findProjectChatAction, lookupMeegoWorkitemAction } from '../lib/api';

export function ProjectOpsActionPanel(props: { employeeId: string }) {
  const [workitemQuery, setWorkitemQuery] = useState('');
  const [workitemPreview, setWorkitemPreview] = useState('');
  const [workitemResult, setWorkitemResult] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState('');

  async function previewWorkitemLookup() {
    const payload = await lookupMeegoWorkitemAction(props.employeeId, {
      lookupType: 'title',
      query: workitemQuery,
      dryRun: true,
    });
    setWorkitemPreview((payload.command ?? []).join(' '));
  }

  async function runWorkitemLookup() {
    const payload = await lookupMeegoWorkitemAction(props.employeeId, {
      lookupType: 'title',
      query: workitemQuery,
    });
    const first = payload.result?.items?.[0];
    if (first) {
      setWorkitemResult(`工作项：${first.id} · ${first.title}`);
    }
  }

  async function runProjectChatLookup() {
    const payload = await findProjectChatAction(props.employeeId, {
      query: chatQuery,
    });
    const first = payload.result?.chats?.[0];
    if (first) {
      setChatResult(`项目群：${first.name}（${first.chatId}）`);
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>项目推进动作</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input
          placeholder="Meego 工作项关键词"
          value={workitemQuery}
          onChange={(event) => setWorkitemQuery(event.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void previewWorkitemLookup()}>预览 Meego 查询命令</button>
          <button onClick={() => void runWorkitemLookup()}>执行 Meego 查询</button>
        </div>
        {workitemPreview ? <div>{workitemPreview}</div> : null}
        {workitemResult ? <div>{workitemResult}</div> : null}

        <input
          placeholder="项目群关键字"
          value={chatQuery}
          onChange={(event) => setChatQuery(event.target.value)}
        />
        <button onClick={() => void runProjectChatLookup()}>查找项目群</button>
        {chatResult ? <div>{chatResult}</div> : null}
      </div>
    </section>
  );
}
