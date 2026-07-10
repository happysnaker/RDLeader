import { ExpandableText } from './expandable-text';
import { formatDisplayText } from '../lib/display';

type FeishuConversationItem = {
  turnId: string;
  threadKey: string;
  channelType: string;
  senderRole: string;
  body: string;
  normalizedIntent?: string | null;
  linkedDispatchId?: string | null;
  linkedDispatchTitle?: string | null;
  linkedDispatchStatus?: string | null;
  linkedWorkItemId?: string | null;
  linkedWorkItemTitle?: string | null;
  linkedWorkItemStatus?: string | null;
  createdAt?: string | null;
};

function formatFeishuRole(role: string) {
  if (role === 'manager') return '老板';
  if (role === 'employee') return '员工';
  if (role === 'internal_staff') return '内部协作';
  return role || '未知';
}

function formatFeishuChannel(channelType: string) {
  if (channelType === 'manager_dm') return '老板私聊';
  if (channelType === 'internal_staff_group') return '内部人员群';
  if (channelType === 'project_group') return '项目群';
  return channelType || '未知渠道';
}

function formatFeishuTime(createdAt?: string | null) {
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

function formatFeishuThreadKey(threadKey: string) {
  const normalized = threadKey.trim();
  if (!normalized) return '默认会话';
  if (normalized.startsWith('dm:')) return '老板私聊线程';
  if (normalized.startsWith('chat:')) return `项目群会话 · ${normalized.slice('chat:'.length)}`;
  if (normalized.startsWith('debug-')) return `调试会话 · ${normalized.replace(/^debug-/, '')}`;
  return normalized.length > 28 ? `${normalized.slice(0, 28)}…` : normalized;
}

function intentBadgeLabel(intent?: string | null) {
  if (intent === 'runtime_pending') return '执行中';
  if (intent === 'runtime_result') return '已回流';
  if (intent === 'coding') return '任务';
  if (intent === 'coordination') return '协同';
  if (intent === 'status') return '状态';
  if (intent === 'direct_reply') return '即时回复';
  return intent || '';
}

function intentBadgeClass(intent?: string | null) {
  if (intent === 'runtime_result') return 'ops-badge--success';
  if (intent === 'runtime_pending') return 'ops-badge--warning';
  return 'ops-badge--neutral';
}

function formatLinkedStatus(status?: string | null) {
  if (status === 'completed') return '已完成';
  if (status === 'active') return '进行中';
  if (status === 'blocked') return '阻塞';
  if (status === 'queued') return '排队中';
  if (status === 'dispatched') return '已派发';
  return status || '';
}

type FeishuConversationGroup = {
  key: string;
  threadKey: string;
  channelType: string;
  createdAt?: string | null;
  normalizedIntent?: string | null;
  linkedDispatchId?: string | null;
  linkedDispatchTitle?: string | null;
  linkedDispatchStatus?: string | null;
  linkedWorkItemId?: string | null;
  linkedWorkItemTitle?: string | null;
  linkedWorkItemStatus?: string | null;
  items: FeishuConversationItem[];
};

type FeishuConversationStats = {
  total: number;
  managerDm: number;
  projectGroup: number;
  pending: number;
  result: number;
};

function buildConversationGroups(items: FeishuConversationItem[]): FeishuConversationGroup[] {
  const groups = new Map<string, FeishuConversationGroup>();

  for (const item of items) {
    const key = item.linkedDispatchId || `${item.threadKey}:${item.turnId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      if (!existing.createdAt || (item.createdAt && item.createdAt > existing.createdAt)) {
        existing.createdAt = item.createdAt;
      }
      if (item.normalizedIntent === 'runtime_result') {
        existing.normalizedIntent = item.normalizedIntent;
      }
      continue;
    }

    groups.set(key, {
      key,
      threadKey: item.threadKey,
      channelType: item.channelType,
      createdAt: item.createdAt,
      normalizedIntent: item.normalizedIntent,
      linkedDispatchId: item.linkedDispatchId,
      linkedDispatchTitle: item.linkedDispatchTitle,
      linkedDispatchStatus: item.linkedDispatchStatus,
      linkedWorkItemId: item.linkedWorkItemId,
      linkedWorkItemTitle: item.linkedWorkItemTitle,
      linkedWorkItemStatus: item.linkedWorkItemStatus,
      items: [item],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? ''))),
    }))
    .sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')));
}

function buildConversationStats(groups: FeishuConversationGroup[]): FeishuConversationStats {
  return groups.reduce<FeishuConversationStats>(
    (stats, group) => {
      if (group.channelType === 'manager_dm') stats.managerDm += 1;
      if (group.channelType === 'project_group') stats.projectGroup += 1;
      if (group.normalizedIntent === 'runtime_pending') stats.pending += 1;
      if (group.normalizedIntent === 'runtime_result') stats.result += 1;
      stats.total += 1;
      return stats;
    },
    {
      total: 0,
      managerDm: 0,
      projectGroup: 0,
      pending: 0,
      result: 0,
    },
  );
}

export function FeishuConversationPanel(props: {
  conversations?: FeishuConversationItem[];
  onRefresh?: () => void;
}) {
  const items = Array.isArray(props.conversations) ? props.conversations : [];
  const groups = buildConversationGroups(items);
  const stats = buildConversationStats(groups);

  return (
    <section className="panel-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">飞书会话</p>
          <h3>最近飞书会话</h3>
        </div>
        <div className="feishu-conversation-panel__meta">
          <button type="button" className="text-link-button" onClick={props.onRefresh}>
            刷新
          </button>
          <span className="inline-state inline-state--light">{groups.length} 组</span>
        </div>
      </div>
      {groups.length > 0 ? (
        <div className="feishu-conversation-panel__stats">
          <article className="feishu-conversation-panel__stat">
            <span>总回流</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="feishu-conversation-panel__stat">
            <span>老板私聊</span>
            <strong>{stats.managerDm}</strong>
          </article>
          <article className="feishu-conversation-panel__stat">
            <span>项目群</span>
            <strong>{stats.projectGroup}</strong>
          </article>
          <article className="feishu-conversation-panel__stat">
            <span>执行中 / 已回流</span>
            <strong>{stats.pending} / {stats.result}</strong>
          </article>
        </div>
      ) : null}
      {groups.length === 0 ? (
        <p className="ops-inline-note">最近还没有飞书会话回流。</p>
      ) : (
        <div className="feishu-conversation-panel__timeline">
          {groups.map((group, index) => {
            const incomingItem = group.items.find((item) => item.senderRole !== 'employee') ?? group.items[0];
            const replyItem = [...group.items].reverse().find((item) => item.senderRole === 'employee') ?? group.items[group.items.length - 1];

            return (
              <details key={group.key} className="ops-list-item feishu-conversation-panel__entry">
                <summary className="feishu-conversation-panel__entry-summary">
                  <div className="feishu-conversation-panel__entry-head">
                    <strong>
                      {formatFeishuChannel(group.channelType)}
                      {group.linkedWorkItemTitle ? ` · ${group.linkedWorkItemTitle}` : ''}
                    </strong>
                    <div className="feishu-conversation-panel__meta">
                      {group.normalizedIntent ? (
                        <span className={`ops-badge ${intentBadgeClass(group.normalizedIntent)}`}>
                          {intentBadgeLabel(group.normalizedIntent)}
                        </span>
                      ) : null}
                      <span className="ops-badge ops-badge--neutral">{formatFeishuTime(group.createdAt)}</span>
                    </div>
                  </div>
                  <p className="feishu-conversation-panel__entry-thread">会话：{formatFeishuThreadKey(group.threadKey)}</p>
                  {incomingItem ? (
                    <p className="feishu-conversation-panel__entry-preview">
                      <span>老板：</span>
                      {formatDisplayText(incomingItem.body)}
                    </p>
                  ) : null}
                  {replyItem && replyItem.turnId !== incomingItem?.turnId ? (
                    <p className="feishu-conversation-panel__entry-preview feishu-conversation-panel__entry-preview--reply">
                      <span>员工：</span>
                      {formatDisplayText(replyItem.body)}
                    </p>
                  ) : null}
                  {group.linkedWorkItemId || group.linkedDispatchId ? (
                    <p className="feishu-conversation-panel__entry-links">
                      {group.linkedWorkItemId
                        ? `任务：${group.linkedWorkItemTitle ?? group.linkedWorkItemId}${group.linkedWorkItemStatus ? `（${formatLinkedStatus(group.linkedWorkItemStatus)}）` : ''}`
                        : ''}
                      {group.linkedWorkItemId && group.linkedDispatchId ? ' · ' : ''}
                      {group.linkedDispatchId
                        ? `执行：${group.linkedDispatchTitle ?? group.linkedDispatchId}${group.linkedDispatchStatus ? `（${formatLinkedStatus(group.linkedDispatchStatus)}）` : ''}`
                        : ''}
                    </p>
                  ) : null}
                </summary>
                <div className="feishu-conversation-panel__thread">
                  {group.items.map((item) => (
                    <div key={item.turnId} className="feishu-conversation-panel__message">
                      <strong>{formatFeishuRole(item.senderRole)}</strong>
                      <ExpandableText text={formatDisplayText(item.body)} maxLength={180} />
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
