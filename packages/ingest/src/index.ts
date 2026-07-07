import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitCommitRecord {
  repo: string;
  sha: string;
  date: string;
  subject: string;
}

export interface DocumentMemoryRecord {
  title: string;
  updatedAt: string;
  sourceUrl: string;
}

export interface EmployeeMemoryEntry {
  source: 'git' | 'lark_doc';
  date: string;
  summary: string;
  ref: string;
}

export interface SeedDirectionKnowledgeRecord {
  recordId: string;
  employeeId: 'lushirong' | 'zhouyongkang';
  directionId: string;
  learningRecordId: string;
  title: string;
  summary: string;
  promotedAt: string;
}

interface EmployeeGitSourceProfile {
  aliases: string[];
  repos: string[];
}

export function parseGitLogOutput(repo: string, output: string): GitCommitRecord[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, date, subject] = line.split('\t');
      return {
        repo,
        sha,
        date,
        subject,
      };
    });
}

function formatDate(input: string): string {
  return input.slice(0, 10);
}

function toTimestamp(input: string): number {
  const parsed = Date.parse(input);
  if (!Number.isNaN(parsed)) return parsed;

  const normalized = Date.parse(`${formatDate(input)}T00:00:00.000Z`);
  if (!Number.isNaN(normalized)) return normalized;

  return 0;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildGitAuthorPattern(aliases: string[]): string {
  return aliases.map((alias) => escapeRegExp(alias)).join('|');
}

function isMeaningfulCommitSubject(subject: string): boolean {
  const trimmed = subject.trim();
  if (!trimmed) return false;
  if (/^merge\b/i.test(trimmed)) return false;
  if (/^(dev|timestamp)$/i.test(trimmed)) return false;
  if (/^update .+ repo$/i.test(trimmed)) return false;
  return true;
}

export function selectGitCommitsForMemory(commits: GitCommitRecord[], limit = 8): GitCommitRecord[] {
  const deduped = Array.from(new Map(commits.map((commit) => [commit.sha, commit])).values()).sort(
    (left, right) => toTimestamp(right.date) - toTimestamp(left.date),
  );

  const meaningful = deduped.filter((commit) => isMeaningfulCommitSubject(commit.subject));
  if (meaningful.length > 0) {
    return meaningful.slice(0, limit);
  }

  return deduped.slice(0, limit);
}

export function extractGitMemory(commits: GitCommitRecord[]): string[] {
  return commits.map((commit) => {
    return `${formatDate(commit.date)} · ${commit.repo} · ${commit.subject} · ${commit.sha}`;
  });
}

export function extractDocumentMemory(documents: DocumentMemoryRecord[]): string[] {
  return documents.map((document) => {
    return `${formatDate(document.updatedAt)} · lark_doc · ${document.title} · ${document.sourceUrl}`;
  });
}

export function buildEmployeeMemory(input: {
  gitCommits: GitCommitRecord[];
  documents: DocumentMemoryRecord[];
}): EmployeeMemoryEntry[] {
  const gitEntries = input.gitCommits.map((commit) => ({
    entry: {
      source: 'git' as const,
      date: formatDate(commit.date),
      summary: `${commit.repo} · ${commit.subject}`,
      ref: commit.sha,
    },
    sortKey: toTimestamp(commit.date),
  }));

  const documentEntries = input.documents.map((document) => ({
    entry: {
      source: 'lark_doc' as const,
      date: formatDate(document.updatedAt),
      summary: document.title,
      ref: document.sourceUrl,
    },
    sortKey: toTimestamp(document.updatedAt),
  }));

  return [...gitEntries, ...documentEntries]
    .sort((left, right) => right.sortKey - left.sortKey)
    .map((item) => item.entry);
}

const employeeGitSources: Record<'lushirong' | 'zhouyongkang', EmployeeGitSourceProfile> = {
  lushirong: {
    aliases: [
      '卢世荣',
      'lushirong.77',
      'lushirong.77@bytedance.com',
      'Shirong Lu',
      '73147033+happysnaker@users.noreply.github.com',
    ],
    repos: [
      '/Users/bytedance/GolandProjects/funshopping_user_growth_dispatch',
      '/Users/bytedance/GolandProjects/funshopping_core',
      '/Users/bytedance/GolandProjects/funshopping_user_growth_push',
      '/Users/bytedance/GolandProjects/dispatch',
      '/Users/bytedance/GolandProjects/config',
      '/Users/bytedance/GolandProjects/user_growth',
      '/Users/bytedance/GolandProjects/mall_api',
    ],
  },
  zhouyongkang: {
    aliases: ['周永康', 'zhouyongkang.mail', 'zhouyongkang.mail@bytedance.com'],
    repos: [
      '/Users/bytedance/GolandProjects/funshopping_user_growth_dispatch',
      '/Users/bytedance/GolandProjects/funshopping_core',
      '/Users/bytedance/GolandProjects/dispatch',
      '/Users/bytedance/GolandProjects/config',
      '/Users/bytedance/GolandProjects/user_growth',
      '/Users/bytedance/GolandProjects/mall_api',
    ],
  },
};

const employeeLarkDocs: Record<string, DocumentMemoryRecord[]> = {
  lushirong: [
    {
      title: '【技术方案】新人券真领券改造',
      updatedAt: '2026-07-06T12:19:28Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/DWGuwgJSDi3WvIkO3GzcLfMOnFd',
    },
    {
      title: '【技术方案】导流新贯穿实验',
      updatedAt: '2026-06-22T07:46:18Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/KD5TwCGbqipGhskoyJAc8JLbnkh',
    },
    {
      title: '【技术方案】提单页导流点位 — 独立端',
      updatedAt: '2026-03-26T09:35:47Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/WUshwcXB2iKpumkqoSOcf35Pnug',
    },
  ],
  zhouyongkang: [
    {
      title: '【投放&导流】抖极老商城入口导流权益替换',
      updatedAt: '2026-07-06T13:18:18Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/Yz4PwVZ96ik4JmkPwSqc0qdSnld',
    },
    {
      title: '【投放&导流】购物车底部双button导流 - 技术方案',
      updatedAt: '2026-06-25T03:53:26Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/ObcDwSB2qid5LxkHGsVc3Oc8nGh',
    },
    {
      title: '【投放&导流】充值中心导流 - 技术方案',
      updatedAt: '2026-03-13T07:31:43Z',
      sourceUrl: 'https://bytedance.larkoffice.com/wiki/Hu6xwD9n8iqXeXk3TELclcF6n5c',
    },
  ],
};

export function buildSeedDirectionKnowledgeRecords(
  directionId: string = 'independent-growth-diversion',
): SeedDirectionKnowledgeRecord[] {
  return (Object.entries(employeeLarkDocs) as Array<[
    'lushirong' | 'zhouyongkang',
    DocumentMemoryRecord[],
  ]>).flatMap(([employeeId, documents]) =>
    documents.map((document, index) => ({
      recordId: `seed-direction-kb-${employeeId}-${index + 1}`,
      employeeId,
      directionId,
      learningRecordId: `seed-doc-${employeeId}-${index + 1}`,
      title: document.title,
      summary: `初始化方向知识，来源文档：${document.title}，更新时间：${formatDate(document.updatedAt)}，链接：${document.sourceUrl}`,
      promotedAt: document.updatedAt,
    })),
  );
}

export async function loadEmployeeMemory(employeeId: 'lushirong' | 'zhouyongkang'): Promise<EmployeeMemoryEntry[]> {
  const gitSource = employeeGitSources[employeeId];
  const gitCommits: GitCommitRecord[] = [];

  for (const repoPath of gitSource.repos) {
    if (!existsSync(repoPath)) {
      continue;
    }

    const gitArgs = [
      '-C',
      repoPath,
      'log',
      '--date=iso-strict',
      '--pretty=format:%H%x09%ad%x09%s',
      '-n',
      '10',
      ...gitSource.aliases.flatMap((alias) => ['--author', alias]),
    ];

    const { stdout } = await execFileAsync('git', gitArgs);

    gitCommits.push(...parseGitLogOutput(repoPath.split('/').at(-1) ?? repoPath, stdout));
  }

  return buildEmployeeMemory({
    gitCommits: selectGitCommitsForMemory(gitCommits, 8),
    documents: employeeLarkDocs[employeeId] ?? [],
  });
}
