# RDLeader Runtime Endurance Model

> Public-safe design note for the runtime loop. It explains the mechanism without publishing raw local task files, worker results, or private paths.

RDLeader treats each worker runtime as a local actor with a small filesystem protocol between the control plane and the worker process. This keeps runtime execution observable and recoverable without coupling the manager UI to a particular agent implementation.

## Runtime loop

```text
Manager UI / scheduler
        │
        ▼
Fastify control plane
        │ writes task envelope
        ▼
<worker workspace>/.rdleader/tasks/
        │ worker consumes task
        ▼
<worker workspace>/.rdleader/tasks-processing/
        │ worker emits structured result
        ▼
<worker workspace>/.rdleader/results/
        │ control plane collects and archives
        ▼
SQLite repositories + manager UI history
```

## Task envelope

A runtime task envelope is designed to be explicit and replayable:

- worker id
- task title
- task body
- task type (`coding`, `coordination`, `status`, `reflection`, or `collaboration`)
- optional work item id
- dispatch timestamp
- progressive brain context

The important point is that the manager can inspect what was dispatched without reading a hidden agent transcript.

## Result event

A runtime result event is similarly structured:

- worker id
- runtime kind
- status (`completed`, `blocked`, or `failed`)
- summary
- next-step summary
- optional artifact references
- source / processed file references in the local environment
- creation timestamp

Public docs should show fake examples, not raw local result files.

## Stale processing recovery

Runtime work can be interrupted: the app can restart, the worker can crash, or a task can be left in a processing folder. RDLeader's endurance model treats this as expected operator reality.

Recovery policy:

1. On startup or QA run, inspect in-flight processing tasks.
2. If a task is stale, requeue it or produce a recovery dispatch.
3. Collect any emitted result events.
4. Archive processed results so repeated collection is idempotent.
5. Surface the recovered status in the manager UI and QA panel.

## What endurance checks prove

The local endurance loop is meant to prove these properties:

- runtime can start from a clean local control-plane request
- stale tasks do not permanently wedge the worker
- result events are emitted and collected
- processed results are archived
- repeated cycles can complete without manual cleanup
- the manager UI can show the latest status rather than a static placeholder

The latest sanitized DevPlan baseline records **10 / 10 endurance cycles passing**.

## Non-goals

This model does not claim:

- distributed exactly-once execution
- cloud-native orchestration
- automatic conflict resolution across multiple workers editing the same repo
- that every external system action can run without human approval

The design is intentionally local-first and human-supervised.

## Sponsorware hook

The **Runtime endurance deep dive** package would turn this model into a full public guide with diagrams, fake task/result fixtures, operator metrics, and a demo video.

Suggested target: **¥199**.

Support page: <https://happysnaker.github.io/support/>
