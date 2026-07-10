const PATH_REPLACEMENTS: Array<[string, string]> = [
  ['/Users/bytedance/GolandProjects/E/lushirong/repos/', 'repos/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/.rdleader/results-processed/', 'results-processed/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/.rdleader/results/', 'results/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/.rdleader/tasks-processing/', 'tasks-processing/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/.rdleader/tasks/', 'tasks/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/.rdleader/', '.rdleader/'],
  ['/Users/bytedance/GolandProjects/E/lushirong/', '~/GolandProjects/E/lushirong/'],
  ['/Users/bytedance/GolandProjects/funshopping_core/', 'funshopping-core/'],
  ['/_worktrees/funshopping_user_growth_dispatch_feat_os/', 'funshopping-user-growth-dispatch/'],
  ['/tmp/lushirong/.rdleader/results-processed/', 'results-processed/'],
  ['/tmp/lushirong/.rdleader/results/', 'results/'],
  ['/tmp/lushirong/.rdleader/tasks/', 'tasks/'],
  ['/tmp/lushirong/', 'tmp/lushirong/'],
];

function replaceKnownPrefixes(value: string) {
  let next = value;

  for (const [from, to] of PATH_REPLACEMENTS) {
    next = next.replaceAll(from, to);
  }

  return next;
}

function compressPathToken(value: string) {
  const normalized = value.trim();
  if (!normalized.includes('/')) {
    return normalized;
  }

  let prefix = '';
  let body = normalized;

  if (normalized.startsWith('~/')) {
    prefix = '~/';
    body = normalized.slice(2);
  } else if (normalized.startsWith('/')) {
    prefix = '/';
    body = normalized.slice(1);
  }

  const segments = body.split('/').filter(Boolean);
  if (segments.length <= 3) {
    return normalized;
  }

  const visibleHead = segments.slice(0, 1);
  const visibleTail = segments.slice(-2);
  const merged = [...visibleHead, '…', ...visibleTail].join('/');
  return prefix ? `${prefix}${merged}` : merged;
}

export function formatDisplayText(value: string) {
  const normalized = replaceKnownPrefixes(value.trim());
  if (!normalized) return '-';

  return normalized
    .replace(/meego:\/\/work-item\/([^\s，。；;]+)/g, 'Meego 工单 · $1')
    .replace(/doc:\/\/tech-review\/([^\s，。；;]+)/g, '评审文档 · $1')
    .replace(/doc:\/\/draft\/([^\s，。；;]+)/g, '文档草稿 · $1')
    .replace(/delivery:\/\/([^\s，。；;]+)/g, '投递记录 · $1')
    .replace(/artifact:\/\/([^\s，。；;]+)/g, '产物引用 · $1');
}

export function formatDisplayReference(value: string) {
  const normalized = formatDisplayText(value);
  if (!normalized) return '-';

  return compressPathToken(normalized);
}

export function formatWorkspacePath(value: string) {
  const normalized = replaceKnownPrefixes(value.trim());
  if (normalized.startsWith('~/GolandProjects/E/lushirong')) {
    return '~/…/lushirong';
  }

  return compressPathToken(normalized);
}
