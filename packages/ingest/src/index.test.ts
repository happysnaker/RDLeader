import { describe, expect, it } from 'vitest';
import {
  buildEmployeeMemory,
  extractDocumentMemory,
  extractGitMemory,
  parseGitLogOutput,
  type DocumentMemoryRecord,
  type GitCommitRecord,
} from './index';

describe('extractGitMemory', () => {
  it('maps git commit history into ordered memory bullets', () => {
    const commits: GitCommitRecord[] = [
      {
        repo: 'funshopping_user_growth_dispatch',
        sha: '9cd1663c4714',
        date: '2026-07-06T13:52:08Z',
        subject: '抖极权益替换',
      },
      {
        repo: 'funshopping_core',
        sha: 'de32250bfe48',
        date: '2026-06-18T17:01:45+08:00',
        subject: 'feat: adjust cart newer coupon toast source',
      },
    ];

    expect(extractGitMemory(commits)).toEqual([
      '2026-07-06 · funshopping_user_growth_dispatch · 抖极权益替换 · 9cd1663c4714',
      '2026-06-18 · funshopping_core · feat: adjust cart newer coupon toast source · de32250bfe48',
    ]);
  });

  it('maps lark technical plans into document memory bullets', () => {
    const docs: DocumentMemoryRecord[] = [
      {
        title: '【技术方案】新人券真领券改造',
        updatedAt: '2026-07-06T12:19:28Z',
        sourceUrl: 'https://bytedance.larkoffice.com/wiki/DWGuwgJSDi3WvIkO3GzcLfMOnFd',
      },
    ];

    expect(extractDocumentMemory(docs)).toEqual([
      '2026-07-06 · lark_doc · 【技术方案】新人券真领券改造 · https://bytedance.larkoffice.com/wiki/DWGuwgJSDi3WvIkO3GzcLfMOnFd',
    ]);
  });

  it('parses git log output into records for a repo', () => {
    const output = [
      '9cd1663c4714\t2026-07-06\t抖极权益替换',
      '947a9bf1da19\t2026-07-06\t导承平台能力优化 V4',
    ].join('\n');

    expect(parseGitLogOutput('funshopping_user_growth_dispatch', output)).toEqual([
      {
        repo: 'funshopping_user_growth_dispatch',
        sha: '9cd1663c4714',
        date: '2026-07-06',
        subject: '抖极权益替换',
      },
      {
        repo: 'funshopping_user_growth_dispatch',
        sha: '947a9bf1da19',
        date: '2026-07-06',
        subject: '导承平台能力优化 V4',
      },
    ]);
  });

  it('builds sorted employee memory from git and document sources', () => {
    const memory = buildEmployeeMemory({
      gitCommits: [
        {
          repo: 'funshopping_user_growth_dispatch',
          sha: '9cd1663c4714',
          date: '2026-07-06',
          subject: '抖极权益替换',
        },
      ],
      documents: [
        {
          title: '【技术方案】购物车底部双button导流 - 技术方案',
          updatedAt: '2026-06-25T03:53:26Z',
          sourceUrl: 'https://bytedance.larkoffice.com/wiki/ObcDwSB2qid5LxkHGsVc3Oc8nGh',
        },
      ],
    });

    expect(memory).toEqual([
      {
        source: 'git',
        date: '2026-07-06',
        summary: 'funshopping_user_growth_dispatch · 抖极权益替换',
        ref: '9cd1663c4714',
      },
      {
        source: 'lark_doc',
        date: '2026-06-25',
        summary: '【技术方案】购物车底部双button导流 - 技术方案',
        ref: 'https://bytedance.larkoffice.com/wiki/ObcDwSB2qid5LxkHGsVc3Oc8nGh',
      },
    ]);
  });
});
