# RDLeader MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first buildable RDLeader slice: a local TypeScript monorepo with seeded employees, progressive-disclosure brain, Trae ACP runtime adapter, policy-gated control plane, and a standard web UI showing employee status/chat-ready surfaces.

**Architecture:** This slice uses a pnpm TypeScript monorepo with React/Vite for the manager UI, Fastify + SQLite/Drizzle for the control plane, and shared packages for domain, brain, runtime, policy, and seed data. The first slice implements the acceptance criteria from `docs/superpowers/specs/2026-07-07-rdleader-design.md` section 22, while deliberately deferring full Feishu/bytedcli workflow automation to a follow-up plan after the foundation is proven.

**Tech Stack:** TypeScript 5, pnpm, Vitest, React 19, Vite, Fastify 5, Zod, Drizzle ORM, better-sqlite3, tsx, React Testing Library, jsdom.

---

## Scope boundary for this plan

This plan intentionally covers the **first buildable slice** from the design spec, not the full end-state. It includes:

- repo bootstrap;
- domain model;
- seed employees;
- progressive-disclosure brain subsystem;
- Trae ACP runtime adapter;
- policy engine;
- SQLite-backed control plane;
- manager web surface for employee overview/detail/chat shells.

It does **not** implement the later Feishu bridge or bytedcli workflow mutation layer yet. Those remain required by the overall project and should become the next implementation plan once this slice is working.

## File structure map

### Root workspace

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/package.json` — root scripts and shared dev dependencies
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/pnpm-workspace.yaml` — workspace package discovery
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/tsconfig.base.json` — shared TS compiler settings
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/vitest.workspace.ts` — workspace test runner config
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/.gitignore` — ignore outputs and local DBs
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/README.md` — operator-focused getting-started doc

### Shared packages

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/employee.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/direction.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/persona.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/emotion.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/performance.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/message.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/approval.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.test.ts`

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/directions.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/lushirong.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/zhouyongkang.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/index.test.ts`

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/layers.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/router.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/context-assembler.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/context-assembler.test.ts`

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/runtime-adapter.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/workspace-manager.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/trae-acp-adapter.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/trae-acp-adapter.test.ts`

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/risk-policy.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/risk-policy.test.ts`

### Server app

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/schema.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/employee-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/message-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/approval-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/employee-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/runtime-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/chat-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/health-route.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/employee-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/chat-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/runtime-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/index.ts`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`

### Web app

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/vite.config.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/index.html`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/main.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/lib/api.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/employee-card.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/status-pill.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/chat-panel.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/risk-list.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/pages/dashboard-page.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/pages/employee-detail-page.tsx`
- Test: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.test.tsx`

### Scripts and local data

- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/scripts/dev.sh`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/data/.gitkeep`

---

### Task 1: Bootstrap the monorepo and shared toolchain

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/pnpm-workspace.yaml`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/tsconfig.base.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/vitest.workspace.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/.gitignore`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.test.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.ts`

- [ ] **Step 1: Create the root workspace manifests**

```json
{
  "name": "rdleader",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@11.3.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run --workspace vitest.workspace.ts",
    "test:watch": "vitest --workspace vitest.workspace.ts",
    "dev:server": "pnpm --filter @rdleader/server dev",
    "dev:web": "pnpm --filter @rdleader/web dev"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "vitest": "^3.2.4"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vitest/globals"]
  }
}
```

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'apps/*',
]);
```

```gitignore
node_modules
pnpm-lock.yaml
coverage
.vite
*.log
apps/server/dev.db
apps/server/dev.db-shm
apps/server/dev.db-wal
dist
```

- [ ] **Step 2: Install root dependencies**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm install`
Expected: install completes successfully and creates `node_modules` without running any Go tooling.

- [ ] **Step 3: Write the failing shared-package smoke test**

```json
{
  "name": "@rdleader/domain",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

```ts
import { describe, expect, it } from 'vitest';
import { employeeLevels } from './index';

describe('domain workspace bootstrap', () => {
  it('exports the supported employee levels', () => {
    expect(employeeLevels).toEqual(['1-2', '2-1', '2-2']);
  });
});
```

- [ ] **Step 4: Run the smoke test and verify it fails**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/domain test`
Expected: FAIL with a module/export error because `packages/domain/src/index.ts` does not yet define `employeeLevels`.

- [ ] **Step 5: Add the minimal passing export**

```ts
export const employeeLevels = ['1-2', '2-1', '2-2'] as const;
export type EmployeeLevel = (typeof employeeLevels)[number];
```

- [ ] **Step 6: Re-run the smoke test and verify it passes**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/domain test`
Expected: PASS with one passing test.

- [ ] **Step 7: Commit the workspace bootstrap**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts .gitignore packages/domain
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "chore: bootstrap rdleader monorepo"
```

### Task 2: Implement the core domain model and seed employees

**Files:**
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/employee.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/direction.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/persona.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/emotion.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/performance.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/message.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/approval.ts`
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/index.test.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/directions.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/lushirong.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/zhouyongkang.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/index.test.ts`

- [ ] **Step 1: Expand the domain test to cover employee records, emotion states, and workspace paths**

```ts
import { describe, expect, it } from 'vitest';
import {
  employeeLevels,
  emotionStates,
  type EmployeeRecord,
} from './index';

describe('domain model', () => {
  it('exports supported employee levels', () => {
    expect(employeeLevels).toEqual(['1-2', '2-1', '2-2']);
  });

  it('exports supported emotion states', () => {
    expect(emotionStates).toContain('considering_exit');
  });

  it('allows an employee record with isolated workspace path', () => {
    const employee: EmployeeRecord = {
      employeeId: 'lushirong',
      displayName: '卢世荣',
      level: '2-1',
      directionId: 'independent-growth-diversion',
      employmentStatus: 'active',
      workspacePath: '~/GolandProjects/E/lushirong',
      runtimeKind: 'trae_acp',
      managerId: 'boss',
      defaultKnowledgeBaseIds: ['dir-independent-growth-diversion'],
      currentAssignments: [],
      recentDoneSummary: '最近完成导流相关方案推进',
      nextStepSummary: '继续推进提单页导流',
      riskFlags: [],
      personaProfile: {
        communicationTone: 'direct',
        ownershipBias: 'high',
        conflictTolerance: 'medium',
        pressureResponse: 'anxious-but-responsible',
        confidenceBaseline: 'steady',
        collaborationStyle: 'proactive',
        escalationPreference: 'early'
      },
      emotionState: {
        current: 'focused',
        intensity: 0.35,
        triggers: [],
        summary: '专注推进中'
      },
      performanceState: {
        deliveryTrend: 'up',
        communicationQuality: 'good',
        blockerHandling: 'good',
        reviewQuality: 'good',
        reliabilityScore: 0.82,
        promotionReadiness: 'watch',
        retentionRisk: 'low'
      },
      feishuProfile: {
        dmPolicy: 'manager-only',
        botName: '卢世荣',
        botOpenId: 'pending'
      }
    };

    expect(employee.workspacePath).toBe('~/GolandProjects/E/lushirong');
  });
});
```

- [ ] **Step 2: Run the domain test and verify it fails**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/domain test`
Expected: FAIL because the expanded types and `emotionStates` do not exist yet.

- [ ] **Step 3: Implement the domain files**

```ts
export const emotionStates = [
  'calm',
  'focused',
  'anxious',
  'frustrated',
  'proud',
  'discouraged',
  'considering_exit',
] as const;
export type EmotionStateName = (typeof emotionStates)[number];

export interface EmotionStateSnapshot {
  current: EmotionStateName;
  intensity: number;
  triggers: string[];
  summary: string;
}
```

```ts
import type { EmployeeLevel } from './index';
import type { EmotionStateSnapshot } from './emotion';
import type { PerformanceSnapshot } from './performance';
import type { PersonaProfile } from './persona';

export type EmploymentStatus = 'candidate' | 'active' | 'probation' | 'resigned' | 'fired';
export type RuntimeKind = 'trae_acp' | 'codex_adapter' | 'disabled';

export interface FeishuProfile {
  dmPolicy: 'manager-only';
  botName: string;
  botOpenId: string;
}

export interface EmployeeRecord {
  employeeId: string;
  displayName: string;
  level: EmployeeLevel;
  directionId: string;
  employmentStatus: EmploymentStatus;
  workspacePath: string;
  runtimeKind: RuntimeKind;
  managerId: string;
  defaultKnowledgeBaseIds: string[];
  currentAssignments: string[];
  recentDoneSummary: string;
  nextStepSummary: string;
  riskFlags: string[];
  personaProfile: PersonaProfile;
  emotionState: EmotionStateSnapshot;
  performanceState: PerformanceSnapshot;
  feishuProfile: FeishuProfile;
}
```

```ts
export interface PersonaProfile {
  communicationTone: 'direct' | 'warm' | 'structured';
  ownershipBias: 'low' | 'medium' | 'high';
  conflictTolerance: 'low' | 'medium' | 'high';
  pressureResponse: 'steady' | 'anxious-but-responsible' | 'defensive';
  confidenceBaseline: 'steady' | 'ambitious' | 'self-critical';
  collaborationStyle: 'reactive' | 'proactive';
  escalationPreference: 'late' | 'normal' | 'early';
}
```

```ts
export interface PerformanceSnapshot {
  deliveryTrend: 'down' | 'flat' | 'up';
  communicationQuality: 'weak' | 'ok' | 'good';
  blockerHandling: 'weak' | 'ok' | 'good';
  reviewQuality: 'weak' | 'ok' | 'good';
  reliabilityScore: number;
  promotionReadiness: 'hold' | 'watch' | 'ready';
  retentionRisk: 'low' | 'medium' | 'high';
}
```

```ts
import { employeeLevels } from './index';
import type { EmployeeRecord } from './employee';

if (employeeLevels.length !== 3) {
  throw new Error('employeeLevels must stay aligned with ByteDance level slice');
}

export const independentGrowthDiversionDirection = {
  directionId: 'independent-growth-diversion',
  displayName: '独立端增长导流',
  defaultKnowledgeBaseIds: [
    'dir-independent-growth-diversion',
    'repo-funshopping-core',
    'repo-funshopping-user-growth-dispatch',
  ],
};

export const lushirongSeed: EmployeeRecord = {
  employeeId: 'lushirong',
  displayName: '卢世荣',
  level: '2-1',
  directionId: independentGrowthDiversionDirection.directionId,
  employmentStatus: 'active',
  workspacePath: '~/GolandProjects/E/lushirong',
  runtimeKind: 'trae_acp',
  managerId: 'boss',
  defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
  currentAssignments: ['推进提单页导流', '维护自然渠道承接策略'],
  recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
  nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
  riskFlags: [],
  personaProfile: {
    communicationTone: 'direct',
    ownershipBias: 'high',
    conflictTolerance: 'medium',
    pressureResponse: 'anxious-but-responsible',
    confidenceBaseline: 'self-critical',
    collaborationStyle: 'proactive',
    escalationPreference: 'early',
  },
  emotionState: {
    current: 'focused',
    intensity: 0.32,
    triggers: ['导流推进任务较多'],
    summary: '在压力下保持推进',
  },
  performanceState: {
    deliveryTrend: 'up',
    communicationQuality: 'good',
    blockerHandling: 'good',
    reviewQuality: 'good',
    reliabilityScore: 0.83,
    promotionReadiness: 'watch',
    retentionRisk: 'low',
  },
  feishuProfile: {
    dmPolicy: 'manager-only',
    botName: '卢世荣',
    botOpenId: 'pending',
  },
};
```

```ts
import type { EmployeeRecord } from '@rdleader/domain';
import { independentGrowthDiversionDirection } from './directions';

export const zhouyongkangSeed: EmployeeRecord = {
  employeeId: 'zhouyongkang',
  displayName: '周永康',
  level: '2-1',
  directionId: independentGrowthDiversionDirection.directionId,
  employmentStatus: 'active',
  workspacePath: '~/GolandProjects/E/zhouyongkang',
  runtimeKind: 'trae_acp',
  managerId: 'boss',
  defaultKnowledgeBaseIds: independentGrowthDiversionDirection.defaultKnowledgeBaseIds,
  currentAssignments: ['购物车导流优化', '权益替换实验'],
  recentDoneSummary: '最近推进购物车双按钮导流与权益替换实验',
  nextStepSummary: '继续推进搜索承接与充值中心导流能力',
  riskFlags: [],
  personaProfile: {
    communicationTone: 'structured',
    ownershipBias: 'high',
    conflictTolerance: 'medium',
    pressureResponse: 'steady',
    confidenceBaseline: 'steady',
    collaborationStyle: 'proactive',
    escalationPreference: 'normal',
  },
  emotionState: {
    current: 'focused',
    intensity: 0.28,
    triggers: ['购物车导流需求并行推进'],
    summary: '对核心实验保持稳定推进',
  },
  performanceState: {
    deliveryTrend: 'up',
    communicationQuality: 'good',
    blockerHandling: 'good',
    reviewQuality: 'good',
    reliabilityScore: 0.8,
    promotionReadiness: 'watch',
    retentionRisk: 'low',
  },
  feishuProfile: {
    dmPolicy: 'manager-only',
    botName: '周永康',
    botOpenId: 'pending',
  },
};
```

- [ ] **Step 4: Add the seed package test**

```ts
import { describe, expect, it } from 'vitest';
import { lushirongSeed, zhouyongkangSeed, independentGrowthDiversionDirection } from './index';

describe('seed employees', () => {
  it('keeps both initial employees in the independent growth diversion direction', () => {
    expect(lushirongSeed.directionId).toBe(independentGrowthDiversionDirection.directionId);
    expect(zhouyongkangSeed.directionId).toBe(independentGrowthDiversionDirection.directionId);
  });

  it('differentiates their next-step focus', () => {
    expect(lushirongSeed.nextStepSummary).not.toBe(zhouyongkangSeed.nextStepSummary);
  });
});
```

- [ ] **Step 5: Run the package tests and verify they pass**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/domain test && pnpm --filter @rdleader/seed test`
Expected: PASS for both packages.

- [ ] **Step 6: Commit the domain and seed model**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add packages/domain packages/seed
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add rdleader domain and seed employees"
```

### Task 3: Implement the progressive-disclosure brain package

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/layers.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/router.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/context-assembler.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/brain/src/context-assembler.test.ts`

- [ ] **Step 1: Write the failing brain routing test**

```ts
import { describe, expect, it } from 'vitest';
import { assembleTaskContext } from './context-assembler';
import { lushirongSeed } from '@rdleader/seed';

describe('assembleTaskContext', () => {
  it('routes coding tasks through identity, seed, working, and knowledge layers', () => {
    const context = assembleTaskContext({
      employee: lushirongSeed,
      taskType: 'coding',
      workingMemory: ['推进提单页导流'],
      episodicMemory: ['上次自然渠道承接讨论'],
      knowledgeItems: ['repo-funshopping-core'],
    });

    expect(context.layers.map((item) => item.layer)).toEqual([
      'identity',
      'seed',
      'working',
      'knowledge',
    ]);
  });

  it('routes reflection tasks through identity, episodic, and reflection layers', () => {
    const context = assembleTaskContext({
      employee: lushirongSeed,
      taskType: 'reflection',
      workingMemory: [],
      episodicMemory: ['评审被 challenge'],
      knowledgeItems: [],
    });

    expect(context.layers.map((item) => item.layer)).toEqual([
      'identity',
      'episodic',
      'reflection',
    ]);
  });
});
```

- [ ] **Step 2: Run the brain test and verify it fails**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/brain test`
Expected: FAIL because the brain package does not exist yet.

- [ ] **Step 3: Implement the brain layer and router code**

```ts
export type BrainLayerName = 'identity' | 'seed' | 'working' | 'episodic' | 'knowledge' | 'reflection';

export interface BrainLayer {
  layer: BrainLayerName;
  payload: unknown;
}

export interface AssembleTaskContextInput {
  employee: { employeeId: string; displayName: string; directionId: string; personaProfile: unknown; emotionState: unknown; performanceState: unknown };
  taskType: 'coding' | 'coordination' | 'status' | 'reflection' | 'collaboration';
  workingMemory: string[];
  episodicMemory: string[];
  knowledgeItems: string[];
}

export interface AssembledTaskContext {
  employeeId: string;
  taskType: AssembleTaskContextInput['taskType'];
  layers: BrainLayer[];
}
```

```ts
import type { AssembleTaskContextInput, BrainLayerName } from './layers';

const routeTable: Record<AssembleTaskContextInput['taskType'], BrainLayerName[]> = {
  coding: ['identity', 'seed', 'working', 'knowledge'],
  coordination: ['identity', 'working', 'episodic', 'knowledge'],
  status: ['identity', 'working'],
  reflection: ['identity', 'episodic', 'reflection'],
  collaboration: ['identity', 'working', 'knowledge'],
};

export function routeLayers(taskType: AssembleTaskContextInput['taskType']): BrainLayerName[] {
  return routeTable[taskType];
}
```

```ts
import type { AssembleTaskContextInput, AssembledTaskContext, BrainLayer } from './layers';
import { routeLayers } from './router';

export function assembleTaskContext(input: AssembleTaskContextInput): AssembledTaskContext {
  const layers: BrainLayer[] = routeLayers(input.taskType).map((layer) => {
    switch (layer) {
      case 'identity':
        return {
          layer,
          payload: {
            employeeId: input.employee.employeeId,
            displayName: input.employee.displayName,
            directionId: input.employee.directionId,
            personaProfile: input.employee.personaProfile,
            emotionState: input.employee.emotionState,
            performanceState: input.employee.performanceState,
          },
        };
      case 'seed':
        return { layer, payload: { seedEmployeeId: input.employee.employeeId } };
      case 'working':
        return { layer, payload: input.workingMemory };
      case 'episodic':
        return { layer, payload: input.episodicMemory };
      case 'knowledge':
        return { layer, payload: input.knowledgeItems };
      case 'reflection':
        return {
          layer,
          payload: {
            summarize: true,
            episodicInputs: input.episodicMemory,
          },
        };
    }
  });

  return {
    employeeId: input.employee.employeeId,
    taskType: input.taskType,
    layers,
  };
}
```

- [ ] **Step 4: Run the brain test and verify it passes**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/brain test`
Expected: PASS with both routing tests green.

- [ ] **Step 5: Commit the brain subsystem**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add packages/brain
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add progressive disclosure brain package"
```

### Task 4: Implement workspace isolation and the Trae ACP runtime adapter

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/runtime-adapter.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/workspace-manager.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/trae-acp-adapter.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/trae-acp-adapter.test.ts`

- [ ] **Step 1: Write the failing runtime tests**

```ts
import { describe, expect, it } from 'vitest';
import { resolveWorkspacePath, buildTraeAcpCommand } from './index';

describe('runtime package', () => {
  it('derives an isolated workspace path for each employee', () => {
    expect(resolveWorkspacePath('zhouyongkang')).toMatch(/GolandProjects\/E\/zhouyongkang$/);
  });

  it('builds the local Trae ACP command', () => {
    expect(buildTraeAcpCommand('/Users/bytedance/.local/bin/trae-cli')).toEqual([
      '/Users/bytedance/.local/bin/trae-cli',
      'acp',
      'serve',
    ]);
  });
});
```

- [ ] **Step 2: Run the runtime test and verify it fails**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/runtime test`
Expected: FAIL because the runtime package does not yet exist.

- [ ] **Step 3: Implement the workspace manager and adapter contract**

```ts
import path from 'node:path';
import os from 'node:os';

export function resolveWorkspacePath(employeeId: string): string {
  return path.join(os.homedir(), 'GolandProjects', 'E', employeeId);
}
```

```ts
export interface RuntimeHeartbeat {
  employeeId: string;
  runtimeKind: 'trae_acp';
  status: 'idle' | 'starting' | 'running' | 'failed' | 'stopped';
  pid: number | null;
}

export interface RuntimeAdapter {
  start(employeeId: string): Promise<RuntimeHeartbeat>;
  stop(employeeId: string): Promise<void>;
  heartbeat(employeeId: string): Promise<RuntimeHeartbeat>;
}
```

```ts
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolveWorkspacePath } from './workspace-manager';
import type { RuntimeAdapter, RuntimeHeartbeat } from './runtime-adapter';

const processes = new Map<string, ChildProcess>();

export function buildTraeAcpCommand(binaryPath: string): string[] {
  return [binaryPath, 'acp', 'serve'];
}

export class TraeAcpAdapter implements RuntimeAdapter {
  constructor(private readonly binaryPath: string) {}

  async start(employeeId: string): Promise<RuntimeHeartbeat> {
    const workspacePath = resolveWorkspacePath(employeeId);
    await mkdir(workspacePath, { recursive: true });

    if (processes.has(employeeId)) {
      const current = processes.get(employeeId)!;
      return {
        employeeId,
        runtimeKind: 'trae_acp',
        status: 'running',
        pid: current.pid ?? null,
      };
    }

    const [command, ...args] = buildTraeAcpCommand(this.binaryPath);
    const child = spawn(command, args, {
      cwd: workspacePath,
      stdio: 'ignore',
      detached: false,
    });
    processes.set(employeeId, child);

    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: 'running',
      pid: child.pid ?? null,
    };
  }

  async stop(employeeId: string): Promise<void> {
    const current = processes.get(employeeId);
    if (!current) return;
    current.kill();
    processes.delete(employeeId);
  }

  async heartbeat(employeeId: string): Promise<RuntimeHeartbeat> {
    const current = processes.get(employeeId);
    return {
      employeeId,
      runtimeKind: 'trae_acp',
      status: current && !current.killed ? 'running' : 'stopped',
      pid: current?.pid ?? null,
    };
  }
}
```

- [ ] **Step 4: Run the runtime tests and verify they pass**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/runtime test`
Expected: PASS with workspace-path and command-construction tests green.

- [ ] **Step 5: Commit the runtime subsystem**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add packages/runtime
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add trae acp runtime adapter"
```

### Task 5: Implement the policy engine for dangerous actions

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/risk-policy.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/policy/src/risk-policy.test.ts`

- [ ] **Step 1: Write the failing policy tests**

```ts
import { describe, expect, it } from 'vitest';
import { classifyRisk, requiresApproval } from './index';

describe('risk policy', () => {
  it('treats read/search operations as low risk', () => {
    expect(classifyRisk({ kind: 'search', target: 'docs' })).toBe('low');
  });

  it('treats destructive shared operations as high risk', () => {
    expect(classifyRisk({ kind: 'delete', target: 'shared-repo' })).toBe('high');
    expect(requiresApproval({ kind: 'delete', target: 'shared-repo' })).toBe(true);
  });

  it('allows employee-owned local writes without manager approval', () => {
    expect(classifyRisk({ kind: 'write', target: 'employee-workspace' })).toBe('medium');
    expect(requiresApproval({ kind: 'write', target: 'employee-workspace' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the policy tests and verify they fail**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/policy test`
Expected: FAIL because the package is not present.

- [ ] **Step 3: Implement the risk policy**

```ts
export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskInput {
  kind: 'search' | 'read' | 'write' | 'delete' | 'mutate-external';
  target: 'docs' | 'employee-workspace' | 'shared-repo' | 'external-system';
}

export function classifyRisk(input: RiskInput): RiskLevel {
  if (input.kind === 'search' || input.kind === 'read') return 'low';
  if (input.target === 'employee-workspace' && input.kind === 'write') return 'medium';
  return 'high';
}

export function requiresApproval(input: RiskInput): boolean {
  return classifyRisk(input) === 'high';
}
```

- [ ] **Step 4: Run the policy tests and verify they pass**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/policy test`
Expected: PASS with three passing assertions.

- [ ] **Step 5: Commit the policy engine**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add packages/policy
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add action risk policy engine"
```

### Task 6: Implement the Fastify control plane with SQLite seed loading

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/schema.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/db/client.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/employee-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/message-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/repositories/approval-repository.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/employee-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/runtime-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/services/chat-service.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/health-route.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/employee-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/chat-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/routes/runtime-routes.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/index.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.test.ts`

- [ ] **Step 1: Write the failing Fastify integration test**

```ts
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('RDLeader server', () => {
  it('returns seeded employees from the overview route', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
    const response = await app.inject({ method: 'GET', url: '/employees' });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as Array<{ employeeId: string }>;
    expect(payload.map((employee) => employee.employeeId)).toEqual(['lushirong', 'zhouyongkang']);
  });

  it('returns employee detail and runtime info', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
    const response = await app.inject({ method: 'GET', url: '/employees/lushirong' });
    expect(response.statusCode).toBe(200);
    const payload = response.json() as { employeeId: string; runtime: { runtimeKind: string } };
    expect(payload.employeeId).toBe('lushirong');
    expect(payload.runtime.runtimeKind).toBe('trae_acp');
  });
});
```

- [ ] **Step 2: Run the server tests and verify they fail**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/server test`
Expected: FAIL because the server app and routes do not exist yet.

- [ ] **Step 3: Implement the database schema and app wiring**

```ts
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const employeesTable = sqliteTable('employees', {
  employeeId: text('employee_id').primaryKey(),
  displayName: text('display_name').notNull(),
  level: text('level').notNull(),
  directionId: text('direction_id').notNull(),
  recentDoneSummary: text('recent_done_summary').notNull(),
  nextStepSummary: text('next_step_summary').notNull(),
  workspacePath: text('workspace_path').notNull(),
  runtimeKind: text('runtime_kind').notNull(),
  emotionCurrent: text('emotion_current').notNull(),
  emotionIntensity: real('emotion_intensity').notNull(),
  emotionSummary: text('emotion_summary').notNull(),
  reliabilityScore: real('reliability_score').notNull(),
});

export const messagesTable = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderEmployeeId: text('sender_employee_id').notNull(),
  recipientEmployeeId: text('recipient_employee_id').notNull(),
  body: text('body').notNull(),
});
```

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export function createDb(databaseUrl: string) {
  const sqlite = new Database(databaseUrl);
  return drizzle(sqlite, { schema });
}
```

```ts
import Fastify from 'fastify';
import { lushirongSeed, zhouyongkangSeed } from '@rdleader/seed';
import { TraeAcpAdapter } from '@rdleader/runtime';
import { createDb } from './db/client';

export async function buildApp(options: { databaseUrl: string }) {
  const app = Fastify();
  const db = createDb(options.databaseUrl);
  const runtime = new TraeAcpAdapter('/Users/bytedance/.local/bin/trae-cli');

  const employees = [lushirongSeed, zhouyongkangSeed].map((employee) => ({
    employeeId: employee.employeeId,
    displayName: employee.displayName,
    level: employee.level,
    directionId: employee.directionId,
    recentDoneSummary: employee.recentDoneSummary,
    nextStepSummary: employee.nextStepSummary,
    workspacePath: employee.workspacePath,
    runtimeKind: employee.runtimeKind,
    emotionCurrent: employee.emotionState.current,
    emotionIntensity: employee.emotionState.intensity,
    emotionSummary: employee.emotionState.summary,
    reliabilityScore: employee.performanceState.reliabilityScore,
  }));

  app.get('/health', async () => ({ ok: true }));
  app.get('/employees', async () => employees);
  app.get('/employees/:employeeId', async (request) => {
    const employeeId = (request.params as { employeeId: string }).employeeId;
    const employee = [lushirongSeed, zhouyongkangSeed].find((candidate) => candidate.employeeId === employeeId);
    if (!employee) return { statusCode: 404, message: 'employee not found' };
    return {
      ...employee,
      runtime: await runtime.heartbeat(employee.employeeId),
      conversations: [],
    };
  });

  return app;
}
```

- [ ] **Step 4: Add chat route coverage for employee-to-employee messaging**

```ts
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('chat routes', () => {
  it('accepts an internal employee message', async () => {
    const app = await buildApp({ databaseUrl: ':memory:' });
    const response = await app.inject({
      method: 'POST',
      url: '/chat/internal-message',
      payload: {
        senderEmployeeId: 'lushirong',
        recipientEmployeeId: 'zhouyongkang',
        body: '购物车导流和提单页导流的素材节奏需要同步',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
  });
});
```

- [ ] **Step 5: Implement the internal message route**

```ts
app.post('/chat/internal-message', async (request) => {
  const body = request.body as {
    senderEmployeeId: string;
    recipientEmployeeId: string;
    body: string;
  };

  return {
    ok: true,
    message: {
      senderEmployeeId: body.senderEmployeeId,
      recipientEmployeeId: body.recipientEmployeeId,
      body: body.body,
    },
  };
});
```

- [ ] **Step 6: Run the server tests and verify they pass**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/server test`
Expected: PASS for overview, detail, and internal-message route tests.

- [ ] **Step 7: Commit the control plane**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add apps/server
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add rdleader control plane server"
```

### Task 7: Build the manager web UI for overview and employee detail

**Files:**
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/package.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/tsconfig.json`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/vite.config.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/index.html`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/main.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/lib/api.ts`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/employee-card.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/status-pill.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/chat-panel.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/components/risk-list.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/pages/dashboard-page.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/pages/employee-detail-page.tsx`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.stubGlobal('fetch', vi.fn(async (input: string) => {
  if (input.endsWith('/employees')) {
    return {
      ok: true,
      json: async () => [
        {
          employeeId: 'lushirong',
          displayName: '卢世荣',
          level: '2-1',
          recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
          nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
          emotionCurrent: 'focused',
        },
      ],
    } as Response;
  }

  return {
    ok: true,
    json: async () => ({
      employeeId: 'lushirong',
      displayName: '卢世荣',
      level: '2-1',
      recentDoneSummary: '最近处理导流贯穿实验与自然渠道承接问题',
      nextStepSummary: '继续推进提单页导流与新人券承接相关工作',
      runtime: { runtimeKind: 'trae_acp', status: 'running' },
      emotionState: { current: 'focused', summary: '在压力下保持推进' },
      riskFlags: [],
      conversations: [],
    }),
  } as Response;
}) as unknown as typeof fetch);

describe('App', () => {
  it('renders the seeded employee overview', async () => {
    render(<App />);
    expect(await screen.findByText('卢世荣')).toBeInTheDocument();
    expect(await screen.findByText('继续推进提单页导流与新人券承接相关工作')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the web test and verify it fails**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/web test`
Expected: FAIL because the web app is not yet present.

- [ ] **Step 3: Implement the web app and overview/detail pages**

```ts
export async function getEmployees() {
  const response = await fetch('http://localhost:3001/employees');
  if (!response.ok) throw new Error('Failed to load employees');
  return response.json();
}

export async function getEmployeeDetail(employeeId: string) {
  const response = await fetch(`http://localhost:3001/employees/${employeeId}`);
  if (!response.ok) throw new Error('Failed to load employee detail');
  return response.json();
}
```

```tsx
export function StatusPill(props: { label: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 999, background: '#eef2ff' }}>{props.label}</span>;
}
```

```tsx
import { StatusPill } from './status-pill';

export function EmployeeCard(props: {
  employee: {
    employeeId: string;
    displayName: string;
    level: string;
    recentDoneSummary: string;
    nextStepSummary: string;
    emotionCurrent: string;
  };
  onSelect: (employeeId: string) => void;
}) {
  return (
    <button onClick={() => props.onSelect(props.employee.employeeId)} style={{ textAlign: 'left', padding: 16, border: '1px solid #dbe4ff', borderRadius: 12 }}>
      <h3>{props.employee.displayName}</h3>
      <p>职级：{props.employee.level}</p>
      <p>已做：{props.employee.recentDoneSummary}</p>
      <p>下一步：{props.employee.nextStepSummary}</p>
      <StatusPill label={props.employee.emotionCurrent} />
    </button>
  );
}
```

```tsx
import { useEffect, useState } from 'react';
import { getEmployees, getEmployeeDetail } from './lib/api';
import { EmployeeCard } from './components/employee-card';

export function App() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('lushirong');
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    void getEmployees().then(setEmployees);
  }, []);

  useEffect(() => {
    void getEmployeeDetail(selectedEmployeeId).then(setDetail);
  }, [selectedEmployeeId]);

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
      <section>
        <h1>RDLeader</h1>
        <p>研发员工总览</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {employees.map((employee) => (
            <EmployeeCard key={employee.employeeId} employee={employee} onSelect={setSelectedEmployeeId} />
          ))}
        </div>
      </section>
      <section>
        {detail ? (
          <>
            <h2>{detail.displayName}</h2>
            <p>职级：{detail.level}</p>
            <p>已做：{detail.recentDoneSummary}</p>
            <p>下一步：{detail.nextStepSummary}</p>
            <p>情绪：{detail.emotionState.current} / {detail.emotionState.summary}</p>
            <p>Runtime：{detail.runtime.runtimeKind} / {detail.runtime.status}</p>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the web test and verify it passes**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/web test`
Expected: PASS with the seeded employee overview rendering in jsdom.

- [ ] **Step 5: Commit the web UI**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add apps/web
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: add rdleader manager web ui"
```

### Task 8: Wire the slice together for local development and acceptance

**Files:**
- Modify: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/README.md`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/scripts/dev.sh`
- Create: `/Users/bytedance/GolandProjects/DevPlan/RdLeader/data/.gitkeep`

- [ ] **Step 1: Write the failing end-to-end acceptance checklist as a README snippet**

```md
## Acceptance checklist

- [ ] `pnpm test` passes
- [ ] `pnpm --filter @rdleader/server dev` starts the control plane on port 3001
- [ ] `pnpm --filter @rdleader/web dev` starts the manager UI on port 5173
- [ ] `/employees` returns `lushirong` and `zhouyongkang`
- [ ] employee detail shows level, done, next, emotion, runtime, and workspace path
```

- [ ] **Step 2: Add the local operator scripts**

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm install
mkdir -p data
(
  pnpm --filter @rdleader/server dev &
  SERVER_PID=$!
  pnpm --filter @rdleader/web dev &
  WEB_PID=$!
  trap 'kill ${SERVER_PID} ${WEB_PID}' EXIT
  wait
)
```

- [ ] **Step 3: Replace the README with the real operator guide**

```md
# RDLeader

RDLeader is a local-first manager console for running multiple AI R&D employees under one human engineering leader.

## MVP slice included in this repository

- seeded employees: 卢世荣 / 周永康
- progressive-disclosure brain package
- Trae ACP runtime adapter
- policy engine for dangerous actions
- Fastify control plane
- React/Vite manager UI

## Local development

~~~bash
pnpm install
pnpm test
pnpm --filter @rdleader/server dev
pnpm --filter @rdleader/web dev
~~~

## Important constraints

- employee workspaces resolve to `~/GolandProjects/E/<employeeId>`
- Trae ACP is the primary runtime for this slice
- no Go build/test workflow is part of this repository

- [ ] **Step 4: Run the full test suite**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm test`
Expected: PASS across workspace packages and both apps.

- [ ] **Step 5: Smoke-check the server entrypoint**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/server dev`
Expected: server starts without syntax errors and logs a listening message on port 3001.

- [ ] **Step 6: Smoke-check the web entrypoint**

Run: `cd /Users/bytedance/GolandProjects/DevPlan/RdLeader && pnpm --filter @rdleader/web dev`
Expected: Vite starts and prints a local URL, typically `http://localhost:5173/`.

- [ ] **Step 7: Commit the runnable slice wiring**

```bash
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader add README.md scripts data
git -C /Users/bytedance/GolandProjects/DevPlan/RdLeader commit -m "feat: wire rdleader mvp foundation for local run"
```

## Self-review checklist

- **Spec coverage:** This plan covers the first buildable slice from the design spec: monorepo bootstrap, seed employees, progressive-disclosure brain, Trae ACP runtime, isolated workspaces, policy gating, internal employee messaging, and a manager UI. Remaining full-project items intentionally deferred to the next plan are Feishu bridge, bytedcli write workflows, and deeper human realism loops.
- **Placeholder scan:** The plan contains no open placeholders, deferred implementation markers, or cross-task shortcut instructions.
- **Type consistency:** `EmployeeLevel`, `EmployeeRecord`, `RuntimeKind`, `EmotionStateSnapshot`, and the direction id `independent-growth-diversion` are used consistently across packages, server, and UI.

## Automatic next step

Because the user explicitly authorized autonomous continuation, do **not** stop to ask which execution mode to use. Proceed with **Inline Execution** using `superpowers:executing-plans`, then use `superpowers:test-driven-development` before implementing each task.
