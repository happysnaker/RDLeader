# RDLeader Feishu Full-Chain Integration Design

## Goal

让飞书成为 RDLeader 的一线工作界面：老板以后主要通过飞书和员工沟通，员工之间也优先通过飞书内部协作；飞书消息进入后必须走完整 RDLeader 链路，而不是直接把用户原话丢给裸 ACP agent。

## Current state and evidence

### What exists today

1. **员工的人格/状态/记忆模型已经存在于 RDLeader**  
   - `personaProfile`、`emotionState`、`performanceState` 定义在 `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/domain/src/employee.ts`。  
   - 卢世荣的人格 seed 在 `/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/seed/src/lushirong.ts`。  

2. **RDLeader 自己派发 runtime 任务时，会组装 brainContext**  
   - 入口：`buildBrainPreview()` in `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts`。  
   - 运行时派发时会把 `brainContext` 传给 runtime：`dispatchRuntimeTask()` in the same file。  
   - Runtime prompt 已经会把“你是 RDLeader 的研发员工…”和 `brainContext` JSON 带给底层 worker：`/Users/bytedance/GolandProjects/DevPlan/RdLeader/packages/runtime/src/trae-acp-adapter.ts`。  

3. **飞书直聊当前没有走 RDLeader 的 brain pipeline**  
   - LarkLink 飞书入口在 `/Users/bytedance/GolandProjects/DevPlan/_refs/larklink-ref/packages/cli/src/feishu/agent-prompt-processor.ts`。  
   - 实际发送给 agent 的只是 `message.cleanText || message.content.text`，没有调用 RDLeader 的 `buildBrainPreview()`，也没有注入员工长期/短期记忆。  

4. **自动工作已经存在，但飞书里感知弱**  
   - 自主推进/自我恢复逻辑在 `/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/app.ts` 的 `runEmployeeAutonomousOperations()`。  
   - 自动学习逻辑在 `runAutonomousLearningCycle()` 相关链路。  
   - scheduler 默认开启：`/Users/bytedance/GolandProjects/DevPlan/RdLeader/apps/server/src/index.ts`。  

### The user-visible gap

由于飞书消息没有经过 RDLeader 的员工脑、工作记忆和方向知识拼装，员工在飞书里更像“挂在某个工作目录上的通用 CLI 助手”，而不像“有角色、有上下文、有最近工作状态的卢世荣”。

## User requirements

1. 老板以后主要在飞书里和员工沟通。  
2. 飞书侧要完整打通 RDLeader 全链路。  
3. 员工回答必须带上：
   - 员工灵魂（人格、情绪、绩效态）
   - 长期记忆（方向知识、学习沉淀、seed knowledge）
   - 短期记忆（当前任务、最近工作片段、最近飞书上下文、最近结果）
4. 员工内部沟通也建议走飞书。  
5. 系统需要支持一个“内部人员群”，员工可以在群里互相交流/求助/同步。  
6. 员工自动工作保留，并且自动工作结果要回流到飞书。  
7. 员工**共享本机环境**，只隔离员工工作目录；不把“员工 home 隔离”当成产品语义。  

## Non-goals

1. 不重写 LarkLink 全部飞书收发能力。  
2. 不把 RDLeader 直接改造成一个新的飞书长连接客户端来替代 LarkLink。  
3. 不在这次改造里解决所有 LarkLink upstream 的通用问题。  
4. 不把“员工活人感”做成纯 prompt 微调问题；重点是把 RDLeader 的上下文和调度接进去。  

## Key constraints and invariants

1. **飞书传输层继续复用 LarkLink**，避免重造长连接、thread routing、reply 卡片等基础设施。  
2. **底层执行继续优先使用 `traex` (`traecli2`)**，这是当前已经验证过可工作的 ACP worker。  
3. **员工只隔离工作目录，不隔离“机器环境语义”**。  
   - 产品语义上：员工共享本机工具、账号、鉴权环境。  
   - 实现细节上：如果 upstream LarkLink 仍把 `~/.larklink`、`session-state.json`、`daemon-state.json` 等状态硬绑 `HOME`，允许 RDLeader 先把它当作“传输状态 root”隔离，而不是“员工环境”隔离。  
4. RDLeader 必须成为飞书场景下的**上下文真源**和**工作编排真源**。  
5. 老板飞书直聊、员工内部群、自动工作通知三条链路的语义要统一。  

## Recommended architecture

推荐采用 **“LarkLink 只做飞书传输层，RDLeader 做员工脑与工作编排层，`traex` 做执行层”** 的三层结构。

```text
Feishu message
  -> employee bot (LarkLink daemon)
  -> RDLeader Feishu bridge agent
  -> RDLeader server brain/context pipeline
  -> dispatch to traex or synthesize direct status reply
  -> result / follow-up / autonomy updates
  -> back to Feishu DM or internal staff group
```

### Layer 1: Feishu transport (LarkLink)

LarkLink 继续负责：

- 飞书长连接收消息
- thread / reply target 维护
- 图片收发
- tool permission 卡片
- 会话级 ACP transport

但它不再直接代表“卢世荣本人”。它只负责把飞书消息安全、稳定地送进 RDLeader。

### Layer 2: RDLeader Feishu bridge

新增一个 **RDLeader bridge agent / bridge service** 作为 LarkLink 的默认 agent。

职责：

1. 从飞书消息中识别：
   - 目标员工是谁
   - 谁在说话（老板 / 员工 / 群成员）
   - 当前会话是老板私聊、内部人员群、项目群线程，还是系统通知
2. 调用 RDLeader server：
   - 拉取员工人格、近期状态、长期记忆、工作短期记忆
   - 判断这条消息属于 `status / coordination / collaboration / coding / reflection`
   - 构造飞书场景专用 brain context
3. 决定执行策略：
   - **Direct grounded reply**：状态类/说明类问题，可直接基于已有状态生成回答
   - **Runtime-backed reply**：需要真实工作区推进或代码/文档/排查，就派发给 `traex`
   - **Coordination route**：员工内部沟通、peer sync、内部群 @ 同事

### Layer 3: Execution (`traex`)

真正执行仍交给 `traex acp serve`，但它收到的 prompt 不再是裸消息，而是：

- 员工身份设定（自然语言，而非仅 JSON）
- 当前任务与阻塞
- 近期工作片段
- 长期方向知识
- 飞书最近对话摘要
- 消息来源（老板私聊 / 员工群 / 自动工作通知）
- 若是内部协作，还要包含“这次是向谁同步、为什么同步”

## Core interaction flows

### Flow A: 老板私聊员工

1. 老板给“卢世荣 bot”发私聊。  
2. LarkLink 收到消息，创建/复用该飞书 thread 的 ACP session。  
3. 默认 agent 不再是裸 `traex`，而是 `rdleader-feishu-bridge`。  
4. bridge 调 RDLeader server 的新接口（例如 `POST /feishu/employee-chat`）：
   - 识别 `employeeId=lushirong`
   - 拉取 identity / working / episodic / knowledge / recent feishu turns
   - 生成自然语言 system prompt + compact JSON context
5. 若消息只是“你现在在做什么”“今天进展如何”，直接生成 grounded reply。  
6. 若消息是“看下某个仓库/修个问题/整理结果”，则复用 RDLeader 的 `dispatchRuntimeTask()`，派发给 runtime。  
7. 员工在飞书里先给一条活人感更强的 ack；之后 runtime 结果回流同一 thread。  

### Flow B: 员工内部人员群协作

1. 建立一个“内部人员群”，员工 bot 都在群里。  
2. 群内消息支持：
   - `@卢世荣`
   - `@周永康`
   - 员工之间对特定 thread 的协作回复
3. bridge 识别：
   - 当前 thread 对应谁
   - 发送者是谁
   - 是否需要 point-to-point 协作还是广播同步
4. 被 @ 的员工拿到：
   - 自己的人格与记忆
   - 发言人的身份与上下文
   - 当前协作 thread 摘要
5. 对于“同步一下”“帮我看下”“我这边 blocked 了”类消息：
   - 优先产出协作式回复
   - 必要时自动创建 peer sync / coordination runtime task

### Flow C: 自动工作回流飞书

自动工作保留现有 scheduler，但新增飞书出口：

1. 当员工自主推进 / 自我恢复 / 学习沉淀完成后：
   - 向老板私聊发送摘要
   - 若涉及跨员工协作，则发内部人员群
2. 发飞书前，RDLeader 需要把结果转为更像员工说话的自然语言：
   - 明确做了什么
   - 哪些是事实、哪些未完成
   - 下一步是什么

## Feishu-specific brain context design

飞书场景不能只复用当前 `status -> identity + working` 的轻量路线。  
飞书默认上下文应改为：

- `identity`
- `working`
- `episodic`
- `knowledge`
- `feishu-conversation`

### Identity layer (explicit persona, not only JSON)

把以下内容显式写成自然语言 prompt：

- 卢世荣说话直接
- owner 感强
- 压力下会焦虑但负责任
- 对风险较敏感，会提前升级
- 不会虚报已完成外部动作

### Working layer

- 当前 assignments
- 最近完成
- 下一步
- 当前 blocker
- 最新 runtime reasoning summary

### Episodic layer

- 最近工作片段
- 最近 manager proxy review
- 最近 reflection
- 最近 runtime results

### Knowledge layer

- direction knowledge
- learning records
- seeded docs / repo refs / routing hints

### Feishu conversation layer (new)

新增 RDLeader 自己的飞书会话记忆，而不是只依赖 LarkLink session memory。

需要保存：

- thread key
- channel type（老板私聊 / 内部群 / 项目群）
- sender open id
- target employee id
- normalized user message
- normalized employee reply
- extracted intent tags
- linked work item / dispatch / artifact refs

作用：

1. 让飞书里“最近几轮说了什么”变成 RDLeader 可用的结构化记忆。  
2. 让老板飞书里的上下文与 RDLeader Web 控制台一致。  
3. 让内部群 thread 能继续扩展成协作语境，而不是每次都像第一次见面。  

## New server-side components

### 1. FeishuConversationRepository

新增 repository / DB 表，用于保存飞书对话回合。

建议字段：

- `message_id`
- `thread_key`
- `channel_type`
- `employee_id`
- `sender_open_id`
- `sender_role` (`manager` | `employee` | `internal_staff` | `system`)
- `body`
- `normalized_intent`
- `linked_dispatch_id`
- `linked_work_item_id`
- `created_at`

### 2. FeishuBrainContextBuilder

这是 `buildBrainPreview()` 的飞书变体。

差异：

- 不再按现有 router 原样走 `status` 的轻量路由
- 飞书默认补 `episodic + knowledge`
- 新增 `feishuConversationMemory`
- 把 persona/emotion/performance 生成自然语言 persona brief

### 3. FeishuBridgeService

职责：

- 解析飞书事件
- 根据 channel + sender + target employee 生成 chat plan
- 决定 direct reply 还是 runtime dispatch
- 统一回流 Feishu reply

### 4. InternalStaffGroupService

负责：

- 内部人员群绑定
- 员工群内 @ 路由
- 员工间 peer sync / help request / blocker escalation

不建议单独新造完全平行的数据模型；优先复用现有 `project_group_bindings`，只新增 `groupKind`：

- `project`
- `internal_staff`
- `bot_qa`

## Bridge agent design

### Why a bridge agent is needed

LarkLink 的飞书 transport 已经成熟，但它默认把消息直接发给 ACP agent。  
要打通 RDLeader，就需要一个 bridge agent 作为默认 ACP endpoint，把“飞书 transport”与“RDLeader 脑/调度”连接起来。

### Bridge responsibilities

bridge agent 不直接假装自己是卢世荣。它做三件事：

1. 向 RDLeader server 请求“这条飞书消息应该怎么处理”  
2. 必要时把增强后的 prompt 转发给底层 `traex`  
3. 把结果返回给 LarkLink，让飞书 thread 保持原来的 reply 体验

### Required behavior

对老板和员工都要支持：

- greetings / intro
- status inquiry
- task assignment
- progress follow-up
- blocker escalation
- peer collaboration
- autonomy update push

## Shared environment policy

用户要求是“员工共享本机环境，只隔离工作目录”。  
本设计按下面的语义执行：

1. **共享的部分**
   - 机器上的 CLI、鉴权、模型环境、工具链
   - `traex` / `traecli` auth
   - 其他宿主机级配置

2. **隔离的部分**
   - 员工工作目录：`/Users/bytedance/GolandProjects/E/<employeeId>`
   - RDLeader 自己的记忆、飞书会话、运行记录、工作项
   - 必要时的 daemon state root（仅作为 transport 状态，不代表员工独立环境）

3. **Transitional implementation note**
   - 当前 LarkLink `v1.0.6-beta.32` 仍把很多状态文件硬编码在 `os.homedir()` 下。  
   - 因此 phase 1 允许 RDLeader 继续把 per-daemon state 放在员工专属 state root 中，以避免多个 bot daemon 冲突。  
   - 但对外语义上，这不是“员工隔离 home”，只是“LarkLink transport state 隔离”。  

## Automatic work integration

现有自动工作链路保留：

- runtime maintenance sweep
- autonomous operations sweep
- autonomous learning cycle
- scheduler every 60s

新增飞书联动：

1. `自主推进` 完成 -> 私聊老板  
2. `自我恢复` 完成 -> 私聊老板，必要时发内部群  
3. `peer sync requested` -> 发内部群并 @ 对应员工  
4. `学习沉淀` -> 可选地发老板简报

## Testing strategy

### Server tests

新增/扩展测试覆盖：

1. 飞书 brain builder 会包含：
   - persona
   - working memory
   - episodic memory
   - knowledge
   - recent feishu turns

2. 老板私聊消息会：
   - 走 RDLeader bridge
   - 生成更像员工的 grounded reply
   - 必要时派发 runtime task

3. 内部群 @ 协作会：
   - 正确识别目标员工
   - 正确生成 coordination/collaboration context

4. 自动工作结果会：
   - 回流飞书通知任务
   - 可落到老板私聊 / 内部群

### Runtime/bridge tests

1. bridge agent 对 `traex` 的 ACP forwarding  
2. direct reply vs runtime dispatch decision  
3. stale codex session 不会再污染新飞书链路  

### UI/API tests

1. 管理页展示：
   - 飞书全链路状态
   - 内部人员群绑定状态
   - 最近飞书回合摘要

## Rollout plan

### Phase 1

- 先打通老板私聊员工全链路
- 默认员工 agent 切到 `rdleader-feishu-bridge -> traex`
- 飞书对话拿到完整 brain context

### Phase 2

- 接内部人员群
- 支持员工之间 thread 协作

### Phase 3

- 自动工作回流飞书
- 群播报 / 私聊播报 / peer sync 通知统一

## Risks

1. **LarkLink upstream 限制**
   - 旧版本内置 agent id 与当前需求不完全一致
   - 状态文件与 HOME 强绑定

2. **上下文过厚**
   - 飞书每条消息都塞太多记忆，可能让回复慢、泛
   - 需要 compact rules

3. **协作路由复杂度上升**
   - 内部群里多个员工 bot 共存时，@ 语义、thread 语义、ownerUserId 语义容易混

4. **自动工作噪音**
   - 若没有节流策略，老板飞书和内部群会被自治播报刷屏

## Decisions

1. 继续使用 LarkLink 作为飞书 transport。  
2. 继续使用 `traex` 作为主要执行 agent。  
3. 新增 RDLeader bridge layer，把飞书流量统一导入 RDLeader 的 brain / memory / orchestration。  
4. 飞书默认上下文不再走轻量 `status` 路由，而是补全 `episodic + knowledge + feishu conversation memory`。  
5. 内部员工沟通优先通过飞书内部人员群完成。  

## Success criteria

满足以下条件，才算“飞书完整打通 RDLeader 全链路”：

1. 老板在飞书私聊员工时，员工回答明显带有其人格与近期上下文。  
2. 飞书消息进入后，可证明经过 RDLeader 的 brain context builder，而不是裸文本直通 ACP。  
3. 员工之间能在内部人员群中进行 @ 协作。  
4. 自动工作产物会回流飞书。  
5. 飞书成为老板的主沟通面，而不需要强依赖 Web 控制台。  
