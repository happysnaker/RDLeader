import { execFile } from 'node:child_process';
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
  const gitEntries: EmployeeMemoryEntry[] = input.gitCommits.map((commit) => ({
    source: 'git',
    date: formatDate(commit.date),
    summary: `${commit.repo} · ${commit.subject}`,
    ref: commit.sha,
  }));

  const documentEntries: EmployeeMemoryEntry[] = input.documents.map((document) => ({
    source: 'lark_doc',
    date: formatDate(document.updatedAt),
    summary: document.title,
    ref: document.sourceUrl,
  }));

  return [...gitEntries, ...documentEntries].sort((left, right) => right.date.localeCompare(left.date));
}

const employeeGitSources = {
  lushirong: {
    author: 'lushirong.77@bytedance.com',
    repos: [
      '/Users/bytedance/GolandProjects/funshopping_user_growth_dispatch',
      '/Users/bytedance/GolandProjects/funshopping_core',
      '/Users/bytedance/GolandProjects/funshopping_user_growth_push',
    ],
  },
  zhouyongkang: {
    author: 'zhouyongkang.mail@bytedance.com',
    repos: [
      '/Users/bytedance/GolandProjects/funshopping_user_growth_dispatch',
      '/Users/bytedance/GolandProjects/funshopping_core',
    ],
  },
} as const;

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

export async function loadEmployeeMemory(employeeId: 'lushirong' | 'zhouyongkang'): Promise<EmployeeMemoryEntry[]> {
  const gitSource = employeeGitSources[employeeId];
  const gitCommits: GitCommitRecord[] = [];

  for (const repoPath of gitSource.repos) {
    const { stdout } = await execFileAsync('git', [
      '-C',
      repoPath,
      'log',
      '--date=short',
      '--pretty=format:%H%x09%ad%x09%s',
      '--author',
      gitSource.author,
      '-n',
      '5',
    ]);

    gitCommits.push(...parseGitLogOutput(repoPath.split('/').at(-1) ?? repoPath, stdout));
  }

  const deduped = Array.from(new Map(gitCommits.map((commit) => [commit.sha, commit])).values()).sort((left, right) =>
    right.date.localeCompare(left.date),
  );

  return buildEmployeeMemory({
    gitCommits: deduped.slice(0, 8),
    documents: employeeLarkDocs[employeeId] ?? [],
  });
}
