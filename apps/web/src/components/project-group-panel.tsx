import { useEffect, useState } from 'react';
import {
  createProjectGroup,
  getProjectGroups,
  setDefaultProjectGroup,
  updateProjectGroupStatus,
  type ProjectGroupBinding,
} from '../lib/api';

export function ProjectGroupPanel(props: {
  employeeId: string;
  onGroupsChange?: (groups: ProjectGroupBinding[]) => void;
}) {
  const [groups, setGroups] = useState<ProjectGroupBinding[]>([]);
  const [chatId, setChatId] = useState('');
  const [chatName, setChatName] = useState('');

  useEffect(() => {
    let active = true;

    void getProjectGroups(props.employeeId).then((payload) => {
      if (!active) return;
      const normalized = Array.isArray(payload) ? payload : [];
      setGroups(normalized);
      props.onGroupsChange?.(normalized);
    });

    return () => {
      active = false;
    };
  }, [props.employeeId]);

  async function submit() {
    if (!chatId.trim() || !chatName.trim()) return;
    const created = await createProjectGroup(props.employeeId, {
      chatId,
      chatName,
      status: 'active',
      isDefault: false,
      managerProxyRequired: true,
    });
    const next = [...groups, created];
    setGroups(next);
    props.onGroupsChange?.(next);
    setChatId('');
    setChatName('');
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
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h3>项目群治理</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input placeholder="项目群 chat_id" value={chatId} onChange={(event) => setChatId(event.target.value)} />
        <input placeholder="项目群名称" value={chatName} onChange={(event) => setChatName(event.target.value)} />
        <button onClick={() => void submit()}>绑定项目群</button>
      </div>
      <ul>
        {groups.map((group) => (
          <li key={group.bindingId} style={{ marginBottom: 12 }}>
            <strong>
              {group.chatName}（{group.chatId}）
            </strong>
            <div>状态：{group.status}</div>
            <div>默认群：{group.isDefault ? 'yes' : 'no'}</div>
            <div>经理代理：{group.managerProxyRequired ? 'yes' : 'no'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => void changeStatus(group.bindingId, 'active')}>标记活跃</button>
              <button onClick={() => void changeStatus(group.bindingId, 'watching')}>标记关注</button>
              <button onClick={() => void changeStatus(group.bindingId, 'archived')}>归档</button>
              {!group.isDefault ? <button onClick={() => void makeDefault(group.bindingId)}>设为默认群</button> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
