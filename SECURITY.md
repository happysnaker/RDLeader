# Security Policy

RDLeader is a local-first control-plane prototype for supervising AI R&D workers. It can interact with local runtimes, local workspaces, and external collaboration tooling, so security reports should be handled privately first.

## Please report privately

Do not open a public issue for suspected vulnerabilities involving:

- credential or secret exposure
- unauthorized local workspace access
- unsafe command execution
- broken approval boundaries
- cross-worker data leakage
- sensitive integration output exposed in public docs or logs

## How to report

Email: `happysnaker@foxmail.com`

Suggested subject:

```text
[RDLeader security] short issue summary
```

Please include, if possible:

- affected commit or public document
- reproduction steps
- smallest useful redacted config or log excerpt
- expected vs actual behavior
- impact assessment

## Supported versions

Security reports are currently prioritized for:

- the public `main` branch
- public documentation and demo assets
- public-safe DevPlan release slices after they are published

Raw local DevPlan artifacts are intentionally not published when they contain private paths, identifiers, or live integration evidence. If you notice such data in the public repository, please report it privately.

## Response posture

The maintainer will aim to:

1. acknowledge the report;
2. reproduce or validate the issue;
3. remove or redact exposed data quickly when relevant;
4. prepare a fix or public note when safe;
5. avoid publishing exploit details before the fix is available.
