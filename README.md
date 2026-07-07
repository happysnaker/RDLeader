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

```bash
pnpm install
pnpm test
pnpm --filter @rdleader/server dev
pnpm --filter @rdleader/web dev
```

## Important constraints

- employee workspaces resolve to `~/GolandProjects/E/<employeeId>`
- Trae ACP is the primary runtime for this slice
- no Go build/test workflow is part of this repository
