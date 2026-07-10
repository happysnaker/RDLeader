import { useEffect, useMemo, useState } from 'react';
import {
  copyTextToClipboardAction,
  openLarkChatInDesktopAction,
  sendGroupMessageAction,
  type ProjectGroupBinding,
} from '../lib/api';

export function GroupMessagePanel(props: {
  employeeId: string;
  groups?: ProjectGroupBinding[];
  preferredChatId?: string;
  onOperationRecorded?: () => void;
}) {
  const [chatId, setChatId] = useState('');
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const projectGroups = useMemo(() => (Array.isArray(props.groups) ? props.groups : []), [props.groups]);
  const selectedGroup = projectGroups.find((group) => group.chatId === chatId);

  useEffect(() => {
    if (chatId.trim() || projectGroups.length === 0) return;
    const preferred =
      projectGroups.find((group) => !group.isDemoPlaceholder && group.isDefault) ??
      projectGroups.find((group) => !group.isDemoPlaceholder && group.status === 'active') ??
      projectGroups.find((group) => !group.isDemoPlaceholder) ??
      projectGroups.find((group) => group.isDefault) ??
      projectGroups.find((group) => group.status === 'active') ??
      projectGroups[0];
    if (preferred?.chatId) {
      setChatId(preferred.chatId);
    }
  }, [chatId, projectGroups]);

  useEffect(() => {
    if (!props.preferredChatId?.trim()) return;
    if (props.preferredChatId !== chatId) {
      setChatId(props.preferredChatId);
    }
  }, [chatId, props.preferredChatId]);

  async function previewCommand() {
    try {
      setError('');
      const payload = await sendGroupMessageAction(props.employeeId, {
        chatId,
        body: draft,
        dryRun: true,
      });
      setPreview((payload.command ?? []).join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : '预览群消息命令失败');
    }
  }

  async function executeCommand() {
    try {
      setError('');
      const payload = await sendGroupMessageAction(props.employeeId, {
        chatId,
        body: draft,
        dryRun: false,
        approved: true,
      });
      setResult(
        payload?.result?.autoRepairedBotRoute
          ? `群消息已发送：${payload.result.deliveredBody}（已自动切换为机器人直发）`
          : `群消息已发送：${payload.result.deliveredBody}`,
      );
      props.onOperationRecorded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送群消息失败');
    }
  }

  async function openChat() {
    try {
      await openLarkChatInDesktopAction(chatId);
      setResult('已在飞书桌面端打开目标群聊');
    } catch (err) {
      setError(err instanceof Error ? err.message : '打开飞书群聊失败');
    }
  }

  async function copyDraft() {
    try {
      await copyTextToClipboardAction(`【RDLeader】${draft}`);
      setResult('待发送消息已复制到剪贴板');
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制消息失败');
    }
  }

  return (
    <section className="ops-section group-message-panel">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">群推进</p>
          <h3>群推进动作</h3>
        </div>
      </div>
      <div className="ops-form-grid">
        {projectGroups.length > 0 ? (
          <label className="ops-field-label">
            <span>已绑定项目群</span>
            <select value={chatId} onChange={(event) => setChatId(event.target.value)}>
              <option value="">请选择项目群</option>
              {projectGroups.map((group) => (
                <option key={group.bindingId} value={group.chatId}>
                  {group.chatName}（{group.chatId}）
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <input placeholder="发送目标群会话 ID" value={chatId} onChange={(event) => setChatId(event.target.value)} />
        {selectedGroup ? <div>当前发送路由：{selectedGroup.managerProxyRequired ? '经理代理' : '机器人直发'}</div> : null}
        {selectedGroup?.botIdentitySource === 'employee_bot' ? <div>当前机器人身份：员工专属机器人</div> : null}
        {selectedGroup?.botIdentitySource === 'shared_bot' ? (
          <div>当前机器人身份：共享兜底机器人（还不是该员工自己的专属机器人）</div>
        ) : null}
        {selectedGroup?.isDemoPlaceholder ? (
          <div>当前是演示占位群，无法真实发送。请先绑定真实项目群或创建机器人测试群。</div>
        ) : null}
        {selectedGroup?.managerProxyRequired ? (
          <div>如果经理代理发送被权限拦住，系统会自动尝试邀请当前机器人入群，并切到机器人直发。</div>
        ) : null}
        <input
          placeholder="给项目群发推进消息"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="ops-actions">
          <button onClick={() => void previewCommand()} disabled={selectedGroup?.isDemoPlaceholder}>
            预览群消息命令
          </button>
          <button onClick={() => void executeCommand()} disabled={selectedGroup?.isDemoPlaceholder}>
            批准后发群消息
          </button>
        </div>
        {error && (error.includes('im:message.send_as_user') || error.includes('Bot/User can NOT be out of the chat')) ? (
          <div className="ops-actions">
            <button onClick={() => void openChat()}>在飞书桌面打开群聊</button>
            <button onClick={() => void copyDraft()}>复制待发送消息</button>
          </div>
        ) : null}
        {preview ? <div>{preview}</div> : null}
        {result ? <div>{result}</div> : null}
        {error ? (
          <div role="alert">
            <div>{error}</div>
            {error.includes('im:message.send_as_user') ? (
              <pre>{'lark-cli auth login --scope "im:message.send_as_user"'}</pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
