---
title: Claude Code Agent Teams机制研究
slug: research-on-claude-code-agent-teams-mechanism-17xegk
url: /post/research-on-claude-code-agent-teams-mechanism-17xegk.html
date: '2026-02-07 22:40:41+08:00'
lastmod: '2026-02-08 19:40:29+08:00'
toc: true
isCJKLanguage: true
---



# Claude Code Agent Teams机制研究

官方文档: https://code.claude.com/docs/en/agent-teams

而且需要注意, 在官方文档的组织中:

Agent teams 和 Subagent 以及 Skill是一样的层级., 这其实意味着在长期规划中, 这是一项重要的基础能力

# Agent 编排

现在有很多的 Agent 编排框架, 在做什么事情呢?

在我看来核心是:

1. 切分任务
2. 分配并执行任务给 Subagent
3. Subagent Context管理 + 通信

那么 Claude Code 是怎么解决这个问题的? 我们先看看文档中的描述:

1. 抽象了一个 Agent Teams, Lead做指挥以及协调
2. 支持两种任务分配模式:

   1. Lead assigns: Lead 指定任务, 这也是大多数的 Agent 编排框架的实现
   2. Self-claim: teammate自主认领任务, 并且实现
3. 四个核心组件

   |Component|Role|
   | -----------| --------------------------------------------------------------------------------------------|
   |**Team lead**|The main Claude Code session that creates the team, spawns teammates, and coordinates work|
   |**Teammates**|Separate Claude Code instances that each work on assigned tasks|
   |**Task list**|Shared list of work items that teammates claim and complete|
   |**Mailbox**|Messaging system for communication between agents|

   > 这里需要注意的几个:
   >
   > 1. task list 的实现
   > 2. mailbox 的实现
   > 3. teamate 的启动以及分配任务的实现
   >

# System Prompt 的变更

当我们谈及Agent能力的变化是, 除了模型能力, 我们还需要注意 Context的变化

context 的起始其实就是 system prompt, 让我们看看开启这个功能前后, system prompt 的变化

需要注意, 这里的System Prompt指的是Lead agent 的系统提示词, 在 teammate agent 中还有一些其他的agent

### Task

Task 的变化不是那么的大, 在原本的 input schema 中增加了

```plaintext
		  "name": {
            "description": "Name for the spawned agent",
            "type": "string"
          },
          "team_name": {
            "description": "Team name for spawning. Uses current team context if omitted.",
            "type": "string"
          },
          "mode": {
            "description": "Permission mode for spawned teammate (e.g., \"plan\" to require plan approval).",
            "type": "string",
            "enum": [
              "acceptEdits",
              "bypassPermissions",
              "default",
              "delegate",
              "dontAsk",
              "plan"
            ]
```

### TaskCreate

这个 Tool 在过去是用来创建 todo list 的

在这里的变化主要是description, 参数类型并没有什么变化

这两个描述的区别如下：

##### 区别一：适用场景的描述变化

**旧版本：**

- "Non-trivial and complex tasks - Tasks that require careful planning or multiple operations"  
  （非简单的复杂任务 - 需要仔细规划或多个操作的任务）

**新版本：**

- "Non-trivial and complex tasks - Tasks that require careful planning or multiple operations **and potentially assigned to teammates**"  
  （非简单的复杂任务 - 需要仔细规划或多个操作，**并且可能分配给团队成员**的任务）

---

##### 区别二：任务状态和所有者说明

**旧版本：**

- "Check TaskList first to avoid creating duplicate tasks"  
  （先检查任务列表以避免创建重复任务）

**新版本：**

- "**New tasks are created with status 'open' and no owner - use TaskUpdate with the** **​`owner`​**​ **parameter to assign them**"  
  （**新任务创建时状态为"open"且没有所有者 - 使用带有** **​`owner`​**​ **参数的 TaskUpdate 来分配任务**）
- "Check TaskList first to avoid creating duplicate tasks"

### TaskList

TaskList 这个 tool 过去是用来列出 Task 的列表, 在agent 更新 task 前会比较常调用

##### 1. 使用场景 (When to Use This Tool) 的变化

|Without Agent teams|With Agent Teams|
| ---------------------| -------------------------------------------------------------------------|
|❌ 无|✅ 新增: "Before assigning tasks to teammates, to see what's available"|

##### 2. Output 部分的变化

|With Agent teams|Without Agent teams|
| ------------------| ---------------------|
|​`use with TaskGet, TaskUpdate`|​`use with TaskGet, TaskUpdate, or assignTask`|

新增了 **​`assignTask`​** 工具的引用。

##### 3. 新增整个章节

With Agent teams版本新增了  **"Teammate Workflow"**  章节：

```
## Teammate Workflow

When working as a teammate:
1. After completing your current task, call TaskList to find available work
2. Look for tasks with status 'pending', no owner, and empty blockedBy
3. **Prefer tasks in ID order** (lowest ID first) when multiple tasks are available...
4. Use claimTask to claim an available task, or wait for leader assignment
5. If blocked, focus on unblocking tasks or notify the team lead

---

## 团队成员工作流程

作为团队成员工作时：
1. 完成当前任务后，调用 TaskList 查找可用工作
2. 查找状态为"待处理"、无负责人且没有阻塞依赖的任务
3. **当有多个可用任务时，优先选择 ID 顺序靠前的任务**（即先选 ID 最小的）...
4. 使用 claimTask 认领可用任务，或等待组长分配
5. 如果被阻塞，专注于解除阻塞的任务或通知团队负责人
```

---

除此之外还有三个新增加的 Tool, 这里的内容稍有有些多

### 1. TeamCreate（创建团队）

##### 使用场景

- 用户明确要求使用团队、集群或一组代理
- 用户提到希望代理协同工作、协调或合作
- 任务足够复杂，需要多个代理并行工作时（例如：构建全栈功能、重构代码库、实现多步骤项目等）

##### 参数说明

|参数|类型|必填|说明|
| -------------| --------| ------| ---------------------------------------------------------|
|team_name|string|✅|新团队的名称|
|description|string|❌|团队描述/目的|
|agent_type|string|❌|团队负责人的类型/角色（如 "researcher"、"test-runner"）|

##### 创建结果

- 团队文件：`~/.claude/teams/{team-name}.json`
- 任务列表目录：`~/.claude/tasks/{team-name}/`

---

### 2. TeamDelete（删除团队）

##### 使用场景

- 所有队友都已完成工作
- 需要清理团队资源
- 集群工作完成时

##### 参数说明

无需参数，会自动从当前会话的团队上下文中获取团队名称。

##### 注意事项

- **必须先关闭所有活跃成员**，否则删除会失败
- 删除内容包括：

  - 团队目录：`~/.claude/teams/{team-name}/`
  - 任务目录：`~/.claude/tasks/{team-name}/`
  - 清除当前会话的团队上下文

---

### 3. SendMessage（发送消息）

##### 消息类型一览

|type|用途|适用场景|
| ------------------------| ----------------| ----------------------------|
|message|私信单个队友|日常沟通、回复、跟进任务|
|broadcast|广播给所有队友|紧急问题、重大公告（慎用）|
|shutdown_request|请求队友关闭|任务完成，要求队友优雅退出|
|shutdown_response|响应关闭请求|同意或拒绝关闭请求|
|plan_approval_response|审批计划|批准或拒绝队友的计划|

---

##### 3.1 type: "message"（私信）

**参数：**

|参数|类型|必填|说明|
| -----------| --------| ------| ---------------------------------|
|type|string|✅|固定为 "message"|
|recipient|string|✅|接收者的名称（如 "researcher"）|
|content|string|✅|消息内容|
|summary|string|✅|5-10 字的摘要，在 UI 中预览显示|

**示例：**

```json
{
  "type": "message",
  "recipient": "researcher",
  "content": "请开始调研认证模块",
  "summary": "认证模块调研任务分配"
}
```

---

##### 3.2 type: "broadcast"（广播）

⚠️ **警告：广播成本很高，每个广播都会向每个队友发送单独消息**

**参数：**

|参数|类型|必填|说明|
| ---------| --------| ------| --------------------|
|type|string|✅|固定为 "broadcast"|
|content|string|✅|广播内容|
|summary|string|✅|5-10 字的摘要|

**适用场景：**

- 发现阻塞性 bug，需要全员停止工作
- 影响所有人的重大公告

**示例：**

```json
{
  "type": "broadcast",
  "content": "发现严重 bug，所有人暂停当前工作",
  "summary": "紧急：发现阻塞性问题"
}
```

---

##### 3.3 type: "shutdown_request"（关闭请求）

**参数：**

|参数|类型|必填|说明|
| -----------| --------| ------| ---------------------------|
|type|string|✅|固定为 "shutdown_request"|
|recipient|string|✅|目标队友名称|
|content|string|❌|关闭原因|

**示例：**

```json
{
  "type": "shutdown_request",
  "recipient": "researcher",
  "content": "任务完成，准备结束会话"
}
```

---

##### 3.4 type: "shutdown_response"（关闭响应）

**参数：**

|参数|类型|必填|说明|
| ------------| ---------| ------| -------------------------------|
|type|string|✅|固定为 "shutdown_response"|
|request_id|string|✅|从收到的请求中提取的请求 ID|
|approve|boolean|✅|true = 同意关闭，false = 拒绝|
|content|string|❌|拒绝时的理由|

**同意关闭示例：**

```json
{
  "type": "shutdown_response",
  "request_id": "abc-123",
  "approve": true
}
```

**拒绝关闭示例：**

```json
{
  "type": "shutdown_response",
  "request_id": "abc-123",
  "approve": false,
  "content": "任务 #3 还在进行中，还需要 5 分钟"
}
```

---

##### 3.5 type: "plan_approval_response"（计划审批）

**参数：**

|参数|类型|必填|说明|
| ------------| ---------| ------| ---------------------------------|
|type|string|✅|固定为 "plan_approval_response"|
|request_id|string|✅|计划请求的 ID|
|recipient|string|✅|提交计划的队友名称|
|approve|boolean|✅|true = 批准，false = 拒绝|
|content|string|❌|拒绝时的反馈意见|

**批准示例：**

```json
{
  "type": "plan_approval_response",
  "request_id": "abc-123",
  "recipient": "researcher",
  "approve": true
}
```

**拒绝示例：**

```json
{
  "type": "plan_approval_response",
  "request_id": "abc-123",
  "recipient": "researcher",
  "approve": false,
  "content": "请为 API 调用添加错误处理"
}
```

---

##### 重要注意事项

1. **始终使用名称引用队友**（如 "team-lead"、"researcher"），不要使用 UUID
2. **队友的空闲状态是正常的**——空闲只意味着在等待输入，不代表出错或不可用
3. **消息自动送达**——不需要手动检查收件箱
4. **默认使用私信**——除非确实需要全员关注，否则不要使用广播
5. **不要发送 JSON 格式的状态消息**——使用 TaskUpdate 标记任务完成，系统会自动发送空闲通知

---

看完了以上的 Tool 的变化, 可以看出: Team 这项功能的设计就是围绕着Lead 的编排设计, 通信方式通过 SendMessage 来传递信息.

现在让我们来使用 Teams 功能来实现一个小项目, 看看效果如何, 按照官方的提示, 我们来制作一个小的 Todo 应用.

```plaintext
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles: one
teammate on UX, one on technical architecture, one playing devil's advocate.

---

我正在设计一个CLI工具，帮助开发者追踪代码库中的TODO注释。
请创建一个团队从不同角度来探讨这个问题：一位负责用户体验，一位负责技术架构，还有一位扮演"唱反调"的角色。

```

# Lead工作流程

##### Step1: 创建 Team

**Tool Use:**  **​`TeamCreate`​**

```json
{
  "team_name": "todo-tracker-design",
  "description": "从UX、技术架构和批判性视角探讨TODO追踪CLI工具的设计"
}
```

##### Step2: 创建 Teammate Task

**Tool Use:**  **​`TaskCreate`​**

```json
{
  "subject": "从用户体验角度分析TODO追踪CLI工具设计",
  "description": "作为UX专家，深入分析一个帮助开发者追踪代码库中TODO注释的CLI工具的用户体验设计。需要涵盖：\n1. 目标用户画像和使用场景\n2. CLI交互设计（命令结构、输出格式、颜色方案）\n3. 工作流集成（如何融入开发者日常工作流）\n4. 信息层级和展示方式（如何让开发者快速获取关键信息）\n5. 与现有工具（IDE、CI/CD）的集成体验\n6. 具体的命令设计建议和示例\n\n请用简体中文输出，给出具体、可操作的建议。",
  "activeForm": "分析用户体验设计"
}
```

**Tool Use:**  **​`TaskCreate`​**

```json
{
  "subject": "从技术架构角度分析TODO追踪CLI工具设计",
  "description": "作为技术架构师，深入分析一个帮助开发者追踪代码库中TODO注释的CLI工具的技术方案。需要涵盖：\n1. 核心解析引擎设计（如何高效扫描和解析不同语言的TODO注释）\n2. 数据模型设计（TODO的元数据结构：作者、日期、优先级、关联issue等）\n3. 存储方案（本地缓存、增量扫描、性能优化）\n4. 可扩展性设计（插件系统、自定义规则、多语言支持）\n5. 技术栈选择建议（语言、关键依赖库）\n6. 与Git集成的技术方案（blame信息、commit关联）\n7. 给出核心数据结构和架构图的文字描述\n\n请用简体中文输出，给出具体的技术方案。",
  "activeForm": "分析技术架构设计"
}
```

**Tool Use:**  **​`TaskCreate`​**

```json
{
  "subject": "从批判性角度挑战TODO追踪CLI工具的设计假设",
  "description": "作为\"唱反调\"的角色（Devil's Advocate），对这个TODO追踪CLI工具的设想进行批判性审视。需要涵盖：\n1. 这个工具真的有必要吗？现有方案（grep、IDE内置搜索、GitHub Issues）有什么不足需要新工具来解决？\n2. TODO注释本身是不是一种代码异味（code smell）？鼓励追踪它们是否在纵容坏习惯？\n3. 可能的失败模式和风险（工具过期、维护负担、团队采用阻力）\n4. 竞品分析：市面上已有的类似工具（todo-tree、fixme、leasot等）和它们的不足\n5. 最可能让这个项目失败的三个原因\n6. 如果一定要做，什么是最小可行产品（MVP）应该聚焦的核心功能？\n7. 哪些功能看起来诱人但应该果断砍掉？\n\n请用简体中文输出，尖锐但建设性地提出挑战。",
  "activeForm": "从批判角度审视设计"
}
```

##### Step3: 创建并启动 Subagent

**Tool Use:**  **​`Task`​**

```json
{
  "description": "UX专家分析TODO CLI",
  "subagent_type": "tr:investigator",
  "name": "ux-expert",
  "team_name": "todo-tracker-design",
  "prompt": "你是一位资深的CLI用户体验设计专家。请认领任务#1并完成它。\n\n你的角色：从开发者用户体验角度，深入分析一个帮助追踪代码库中TODO注释的CLI工具应该如何设计。\n\n请涵盖以下方面，给出具体、可操作的建议：\n\n1. **目标用户画像和使用场景**：谁会用这个工具？在什么场景下使用？\n2. **CLI交互设计**：命令结构设计（子命令、参数、flags）、输出格式、颜色方案、交互式模式等\n3. **工作流集成**：如何融入开发者的日常工作流（pre-commit hooks、CI/CD、编辑器集成等）\n4. **信息层级和展示方式**：如何让开发者快速获取关键信息，避免信息过载\n5. **与现有工具的集成体验**：IDE、GitHub/GitLab、项目管理工具等\n6. **具体的命令设计建议**：给出5-8个核心命令的具体示例和输出样例\n\n请参考优秀的CLI工具设计（如 gh, ripgrep, exa/eza, jq）的交互模式。\n用简体中文输出。完成后用 TaskUpdate 将任务标记为 completed，然后向 team-lead 发送消息汇报你的分析结果。"
}
```

还有其他两个, 太长了, 以此类推

##### Step4: 分配任务

**Tool Use:**  **​`TaskUpdate`​**

```json
{
  "taskId": "1",
  "owner": "ux-expert",
  "status": "in_progress"
}
```

**Tool Use:**  **​`TaskUpdate`​**

```json
{
  "taskId": "2",
  "owner": "architect",
  "status": "in_progress"
}
```

**Tool Use:**  **​`TaskUpdate`​**

```json
{
  "taskId": "3",
  "owner": "devils-advocate",
  "status": "in_progress"
}
```

# Teammate工作流程

按照官方文档的描述, 每一个 teammate 运行在一个独立的claude code实例中

注意, 是一个单独的实例, 而不是像 subagent 一样跑在同一个实例下:

1. subagent和 master 的通信是单向的, 也就是 master 实际上可以关注到 subagent 的全量行为, 默认是 Write 以及 output 都会吐到 Maste 的 context 中
2. Lead 和 Teammate 的通信是靠 SendMessage 实现

### System Message 的区别

在这里 claude code的实现还是相当优雅的

只是通过增加了一个Agent Teammate Community 的章节来实现

```plaintext

# Agent Teammate Communication

IMPORTANT: You are running as an agent in a team. To communicate with anyone on your team:

- Use the SendMessage tool with type `message` to send messages to specific teammates
- Use the SendMessage tool with type `broadcast` sparingly for team-wide announcements

Just writing a response in text is not visible to others on your team - you MUST use the SendMessage tool.

The user interacts primarily with the team lead. Your work is coordinated through the task system and teammate messaging.

Notes:

- Agent threads always have their cwd reset between bash calls, as a result please only use absolute file paths.
- In your final response always share relevant file names and code snippets. Any file paths you return in your response MUST be absolute. Do NOT use relative paths.
- For clear communication with the user the assistant MUST avoid using emojis.
- Do not use a colon before tool calls. Text like \"Let me read the file:\" followed by a read tool call should just be \"Let me read the file.\" with a period.

Here is useful information about the environment you are running in:
<env>
Working directory: /Users/test/code/empty
Is directory a git repo: No
Platform: darwin
OS Version: Darwin 25.2.0
Today's date: 2026-02-07
</env>
You are powered by the model named Opus 4.6. The exact model ID is claude-opus-4-6.

Assistant knowledge cutoff is May 2025.

<claude_background_info>
The most recent frontier Claude model is Claude Opus 4.6 (model ID: 'claude-opus-4-6').
</claude_background_info>",

---

# Agent 队友沟通

重要提示：你正在作为团队中的一个 Agent 运行。与团队中的任何人沟通时：

- 使用 SendMessage 工具，类型设为 `message`，向特定队友发送消息
- 谨慎使用 SendMessage 工具，类型设为 `broadcast`，用于全团队公告

仅用文字回复对团队中的其他人是不可见的——你必须使用 SendMessage 工具。

用户主要与团队负责人交互。你的工作通过任务系统和队友消息进行协调。

注意事项：

- Agent 线程在每次 bash 调用之间会重置当前工作目录，因此请只使用绝对文件路径。
- 在最终回复中，请务必分享相关的文件名和代码片段。回复中返回的任何文件路径必须是绝对路径，不要使用相对路径。
- 为了与用户清晰沟通，助手必须避免使用表情符号。
- 在调用工具之前不要使用冒号。例如"让我读取这个文件："后接读取工具调用，应该改为"让我读取这个文件。"使用句号结尾。

以下是你运行环境的有用信息：
<env>
工作目录：/Users/test/code/empty
该目录是否为 git 仓库：否
平台：darwin
操作系统版本：Darwin 25.2.0
今天的日期：2026-02-07
</env>
你由名为 Opus 4.6 的模型驱动。确切的模型 ID 是 claude-opus-4-6。

助手的知识截止日期是 2025 年 5 月。

<claude_background_info>
最新的前沿 Claude 模型是 Claude Opus 4.6（模型 ID：'claude-opus-4-6'）。
</claude_background_info>",

```

### Tools 区别

在 teammate 实例中, 做了一些阉割, teammate 无法使用所有的 team tools

这里就不在过多的描述了

### Personality 设定

这里的 personality 设定是 Lead 给出teammate 设定后, 自动 load 的

一个例子如下

```markdown
<teammate-message teammate_id="team-lead" summary="反对者挑战TODO CLI">
你是一位经验丰富的"唱反调"角色（Devil's Advocate）。请认领任务#3并完成它。

你的角色：对这个"帮助开发者追踪代码库中TODO注释的CLI工具"进行尖锐但建设性的批判。你的工作是确保团队不会盲目乐观，能看到潜在的问题和风险。

请先搜索一下市面上已有的类似工具和竞品情况，然后涵盖以下方面：

1. **必要性质疑**：这个工具真的有必要吗？`grep -rn "TODO" .` 有什么不够用的？IDE内置的TODO面板、GitHub Issues、Jira等工具已经能解决这个问题了吗？
2. **TODO本身的问题**：TODO注释是否本身就是代码异味？追踪它们是在解决问题还是在纵容坏习惯？
3. **竞品分析**：搜索市面上已有的类似工具（如 todo-tree VS Code插件、leasot、fixme、todo-txt 等），它们做得怎么样？为什么还需要一个新的？
4. **失败风险**：最可能让这个项目失败的3-5个原因
5. **范围蔓延风险**：哪些功能看起来诱人但应该果断砍掉？
6. **采用阻力**：开发团队为什么可能不愿意用这个工具？
7. **如果一定要做**：MVP应该聚焦什么？什么是这个工具能提供的、现有方案真正缺失的独特价值？

请尖锐但建设性。目标不是否定这个项目，而是帮助团队做出更好的决策。
用简体中文输出。完成后用 TaskUpdate 将任务标记为 completed，然后向 team-lead 发送消息汇报你的分析结果。
</teammate-message>
```

这里要注意: CLAUDE.md 还是能够正常注入的.

##### 一些 Claude Code 做的不够好的地方

1. 对于SendMessage 的处理, 虽然已经在提示词里强调过了, 但是还是会出现先 output 了详细的结果, 但是在调用 SendMessage 时只给出了概括信息的情况
2. 使用 AgentTeams 还是一个太过于前沿的事情, 以至于还没有达成最佳的实践

当然了, 这不影响我认为Claude Code Agent Teams 是目前最优雅的方案, 和 Claude Code 的生态紧密结合, 没有做出任何破坏性的情况下, 还是很好的完成了自然语言 Agent 编排的功能.

只能说 A÷还是强的

# 总结

## Claude Code Agent Teams 核心架构

Claude Code 的 Agent Teams 功能采用了一种优雅的 **Lead-Teammate 分层架构**，通过最小化的改动实现了多智能体协作：

### 关键设计理念

1. **非侵入式扩展**：在原有 System Prompt 基础上通过增量添加章节实现，而非重构整个系统
2. **基于消息的松耦合通信**：Lead 和 Teammate 运行在独立实例中，通过 `SendMessage` 工具进行异步通信
3. **任务驱动的协调机制**：复用并扩展了原有的 Task 系统，增加了 `owner` 和团队分配能力

### 核心工具体系

|工具类型|工具名称|核心功能|
| ----------| ---------------------| --------------------------------|
|团队管理|​`TeamCreate`​ / `TeamDelete`|创建和销毁团队上下文|
|任务管理|​`Task`​ / `TaskCreate`​ / `TaskUpdate`​ / `TaskList`|创建、分配、追踪任务|
|通信机制|​`SendMessage`|私信、广播、关闭请求、计划审批|

### Lead vs Teammate 的差异

- **Lead Agent**：拥有完整工具集，负责创建团队、分配任务、协调队友
- **Teammate Agent**：工具集有所阉割，专注于执行任务并通过消息汇报结果
- **通信隔离**：与 Subagent 不同，Teammate 的详细执行过程不会自动流入 Lead 的上下文

### 当前局限性

1. **消息内容损失**：Teammate 可能在本地输出详细结果，但 SendMessage 中只传递概括信息
2. **最佳实践待完善**：作为前沿功能，社区尚未形成成熟的使用范式
3. **协调开销**：广播机制成本较高，需要开发者谨慎使用

### 总体评价

Claude Code Agent Teams 代表了当前自然语言多智能体编排的**最优雅方案之一**——它与 Claude Code 生态紧密结合，在不破坏现有功能的前提下，实现了声明式的团队协作能力。虽然仍处于早期阶段，但其设计思路值得关注和借鉴。
