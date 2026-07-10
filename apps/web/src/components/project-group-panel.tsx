import { useEffect, useState } from 'react';
import {
  createBotProjectGroup,
  createProjectGroup,
  enableBotProjectGroupRoute,
  getProjectGroups,
  setDefaultProjectGroup,
  updateProjectGroupStatus,
  type ProjectGroupBinding,
} from '../lib/api';

function formatGroupStatus(status: ProjectGroupBinding['status']) {
  if (status === 'active') return '活跃';
  if (status === 'watching') return '关注';
  return '已归档';
}

export function ProjectGroupPanel(props: {
  employeeId: string;
  onGroupsChange?: (groups: ProjectGroupBinding[]) => void;
  onPreferredGroupChange?: (chatId: string) => void;
}) {
  const [groups, setGroups] = useState<ProjectGroupBinding[]>([]);
  const [chatId, setChatId] = useState('');
  const [chatName, setChatName] = useState('');
  const [managerProxyRequired, setManagerProxyRequired] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      const payload = await getProjectGroups(props.employeeId);
      if (!active) return;
      const normalized = Array.isArray(payload) ? payload : [];
      setGroups(normalized);
      props.onGroupsChange?.(normalized);
    }

    void loadGroups();
    const timer = window.setInterval(() => {
      void loadGroups();
    }, 8000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [props.employeeId]);

  async function submit() {
    if (!chatId.trim() || !chatName.trim()) return;
    setResult('');
    const created = await createProjectGroup(props.employeeId, {
      chatId,
      chatName,
      status: 'active',
      isDefault: false,
      managerProxyRequired,
    });
    const next = [...groups, created];
    setGroups(next);
    props.onGroupsChange?.(next);
    setChatId('');
    setChatName('');
    setManagerProxyRequired(true);
    props.onPreferredGroupChange?.(created.chatId);
    setResult(`已绑定项目群：${created.chatName}（${created.managerProxyRequired ? '经理代理' : '机器人直发'}）`);
  }

  async function createBotQaGroup() {
    setResult('');
    const created = await createBotProjectGroup(props.employeeId, {
      chatName: chatName.trim() || undefined,
      isDefault: false,
    });
    const next = [...groups, created.binding];
    setGroups(next);
    props.onGroupsChange?.(next);
    setChatId(created.binding.chatId);
    setChatName(created.binding.chatName);
    setManagerProxyRequired(false);
    props.onPreferredGroupChange?.(created.binding.chatId);
    setResult(`已创建机器人测试群：${created.binding.chatName}（${created.binding.chatId}）`);
  }

  async function changeStatus(bindingId: string, status: 'active' | 'watching' | 'archived') {
    const updated = await updateProjectGroupStatus(props.employeeId, bindingId, status);
    const next = groups.map((group) => (group.bindingId === bindingId ? updated : group));
    setGroups(next);
    props.onGroupsChange?.(next);
  }

  async function makeDefault(bindingId: string) {
    const updated = await setDefaultProjectGroup(props.employeeId, bindingId);
    const next = groups.map((group) =>
      group.bindingId === bindingId
        ? updated
        : {
            ...group,
            isDefault: false,
          },
    );
    setGroups(next);
    props.onGroupsChange?.(next);
    props.onPreferredGroupChange?.(updated.chatId);
  }

  async function enableBotRoute(bindingId: string) {
    setResult('');
    const payload = await enableBotProjectGroupRoute(props.employeeId, bindingId);
    const next = groups.map((group) => (group.bindingId === bindingId ? payload.binding : group));
    setGroups(next);
    props.onGroupsChange?.(next);
    setChatId(payload.binding.chatId);
    setChatName(payload.binding.chatName);
    setManagerProxyRequired(false);
    props.onPreferredGroupChange?.(payload.binding.chatId);
    setResult(`已邀请当前机器人入群并切换为机器人直发：${payload.binding.chatName}`);
  }

  return (
    <section className="ops-section">
      <div className="ops-section__header">
        <div>
          <p className="eyebrow">项目群</p>
          <h3>项目群治理</h3>
        </div>
        <span className="inline-state inline-state--light">{groups.length} 个群</span>
      </div>
      <details className="ops-segment">
        <summary>绑定 / 创建项目群</summary>
        <div className="ops-form-grid">
          <input placeholder="新项目群会话 ID" value={chatId} onChange={(event) => setChatId(event.target.value)} />
          <input placeholder="项目群名称" value={chatName} onChange={(event) => setChatName(event.target.value)} />
          <label className="ops-checkbox-row">
            <input type="checkbox" checked={managerProxyRequired} onChange={(event) => setManagerProxyRequired(event.target.checked)} />
            <span>需要经理代理发送（如果机器人已在群内，可取消后走机器人直发）</span>
          </label>
          <div className="ops-actions">
            <button onClick={() => void submit()}>绑定项目群</button>
            <button onClick={() => void createBotQaGroup()}>创建机器人测试群</button>
          </div>
        </div>
      </details>
      {result ? <p className="ops-inline-note">{result}</p> : null}
      <ul className="ops-list ops-list--compact ops-scroll-list">
        {groups.map((group) => (
          <li key={group.bindingId} className="ops-list-item">
            <div className="ops-list-item__header">
              <strong>{group.chatName}（{group.chatId}）</strong>
              <span className={`ops-badge ${group.managerProxyRequired ? 'ops-badge--warning' : 'ops-badge--success'}`}>{group.managerProxyRequired ? '经理代理' : '机器人直发'}</span>
            </div>
            <p>群聊 ID：{group.chatId}</p>
            <p>状态：{formatGroupStatus(group.status)} · 默认群：{group.isDefault ? '是' : '否'}</p>
            <p>发送路由：{group.managerProxyRequired ? '经理代理' : '机器人直发'}</p>
            <p>
              当前机器人：
              {group.botPresenceState === 'placeholder'
                ? ' 演示占位群'
                : group.botPresenceState === 'in_chat'
                ? ' 已在群内'
                : group.botPresenceState === 'not_in_chat'
                  ? ' 未在群内'
                  : ' 状态未知'}
            </p>
            {group.botIdentitySource === 'shared_bot' ? <p>提示：当前检测到的是共享机器人，不是该员工自己的专属机器人。</p> : null}
            {group.isDemoPlaceholder ? <p>提示：这是演示占位群，真实发送前请绑定真实群或创建机器人测试群。</p> : null}
            <div className="ops-actions">
              <button onClick={() => void changeStatus(group.bindingId, 'active')}>标记活跃</button>
              <button onClick={() => void changeStatus(group.bindingId, 'watching')}>标记关注</button>
              <button onClick={() => void changeStatus(group.bindingId, 'archived')}>归档</button>
              {group.managerProxyRequired && !group.isDemoPlaceholder ? (
                <button onClick={() => void enableBotRoute(group.bindingId)}>
                  {group.currentBotInChat ? '改用机器人直发' : '邀请当前机器人入群并改用机器人直发'}
                </button>
              ) : null}
              {!group.isDefault ? <button onClick={() => void makeDefault(group.bindingId)}>设为默认群</button> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
