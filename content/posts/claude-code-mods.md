---
title: 'Claude Code Mods：把 Agent 的工作流程变成可编程接口 by GPT-6-Astra'
slug: claude-code-mods
url: /post/claude-code-mods.html
date: '2026-10-05 12:55:00+08:00'
lastmod: '2026-10-05 13:12:12+08:00'
description: '深入 Claude Code Mods 的事件链、UI 渲染与交互、Gallery 组件、模型与后台 API，用 D2 和可测试的改动清单面板串起架构与实践。'
toc: true
isCJKLanguage: true
tags: ['Claude Code', 'Agent', 'Plugin', '架构设计']
---

给 Claude 一份 Skill，可以教它怎么做代码审查。接一个 MCP，可以让它查询公司的工单系统。

但如果我想在它执行工具之前改一下参数，在每轮回答结束后展示一个面板，或者把团队的规则直接接进执行流程，这就涉及 Claude Code 自己怎么工作了。

Mods 开放的正是这一层：**用 JavaScript / TypeScript，参与 Claude Code 处理 Prompt、工具调用、会话和界面的过程。**

读完文档后，我最感兴趣的是它的接入方式。很多行为都经过一条事件处理链，Mod 可以在链上观察、修改输入，也可以直接返回结果。写过 Web 中间件的话，这套模型会很熟悉。

> 本文按 **2026 年 10 月 5 日**可查的官方资料整理。Mods 从 v2.1.287 起默认开启，在线 Reference 当前描述的是 v2.1.289。涉及接口时，以本机 Claude Code 生成的类型声明为准；涉及内部实现的猜测，会明确标出。[版本与接口说明](https://code.claude.com/docs/en/plugins/mods/reference)、[启用条件](https://code.claude.com/docs/en/plugins/mods/troubleshoot#your-version-is-older-than-21287)

## Plugin 负责装，Mod 负责跑

先把几个名字放回各自的位置。

**Plugin 是扩展包。** 安装、版本、依赖、分发，都围绕它进行。一个包里可以放 Skill、Agent、传统 Hook、MCP/LSP 配置，也可以放一段长期参与事件处理的 JS/TS 代码。

这段代码叫 **hooks module**。按照官方定义，包含这类模块的 Plugin 就叫 **Mod**。[Plugin 概览](https://code.claude.com/docs/en/plugins/overview)

```d2 {title="Plugin 的组件关系：包含 hooks module 的 Plugin 就是 Mod"}
direction: down

plugin: "Plugin：安装、版本与分发的单位" {
  knowledge: "Skill / Agent\n领域知识与专门角色"
  hooks: "hooks module\n事件处理与界面逻辑" {
    style.fill: "#e8f2fc"
  }
  integration: "MCP / LSP\n外部工具与语言服务"
  classic: "settings hooks\n在指定时机运行脚本等操作"
}

definition: "包含 hooks module 的 Plugin，称为 Mod"
plugin.hooks -> definition
```

所以开发一个 Mod，不需要再学一套安装系统。它仍然是一个 Plugin，也可以和 Skill、MCP 一起发给别人。

还有一个容易混淆的词：**codemod**。它通常指批量改源码的工具，比如把旧 API 替换成新 API。Claude Code Mod 的主要处理对象则是 Agent 的运行过程。两者可以配合，但职责不同。

## 核心机制：一次工具调用，要经过哪些人

先看一段完整的 Hook：

```ts
export function register(on) {
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    await $.ui.log("Bash 调用开始", { to: "debug" })

    const result = await next(e)

    await $.ui.log("Bash 调用返回", { to: "debug" })
    return result
  })
}
```

三个参数各司其职：

- `$`：Claude Code 提供的能力，比如写日志、读文件、运行进程。
- `e`：这一次事件的数据。对 Bash 调用来说，里面有工具名和命令等字段。
- `next`：继续往后执行，并取回结果。

执行到 `await next(e)` 时，当前 Hook 把控制权交出去。后面的 Mod 运行完，Claude Code 完成原本的处理，结果才返回这里。接下来才会打印第二条日志。

有两个 Mod 时，正常执行路径大致如下：

```d2 {title="事件逐层进入，结果反向返回：简化的中间件调用顺序"}
shape: sequence_diagram
direction: down

a: "Mod A"
b: "Mod B"
core: "Claude Code"

a -> b: "1. next(e)：传入事件"
b -> core: "2. next(e)：继续处理"
core -> b: "3. 返回结果"
b -> a: "4. 返回处理后的结果"
```

这就是常说的「洋葱模型」：调用一层层进去，结果一层层回来。图里省略了策略分组等排序规则，但保留了最关键的调用关系。

它也解释了 Mod 的三种基本用法：

| 想做什么 | 怎么写 |
| --- | --- |
| 看一眼输入或结果 | 在 `await next(e)` 前后处理 |
| 改一下输入 | `next({ ...e, 某个字段: 新值 })` |
| 自己回答，不再往后执行 | 按该事件要求的格式直接返回结果 |

这里有两个细节。第一，事件对象是深度冻结的数据，修改时应该复制一份。第二，每种事件的返回值有自己的约定，不能随便返回一个对象就指望它生效。例如 `tool.call` 可以返回拒绝原因，而 `ui.render` 返回的是界面树。[Hook 与事件约定](https://code.claude.com/docs/en/plugins/mods/reference#the-hook-function)

**Mod 处在实际调用路径上。** 因此，它能改变接下来发生的事情，这比只订阅「工具已经执行完了」这样的通知更深入。

## Events：拦截的位置不同，能改变的事情就不同

事件多，真正需要弄清的是它们处在执行流程的哪一步。拿一个「记录文件改动，再帮助用户审查」的扩展来说，工具执行、模型回答和用户点击按钮，是三个不同的时刻。

### `tool.call` 管执行，`tool.check` 管权限判断

这两个事件很容易混用：

| 事件 | 你面对的是什么 | 适合做什么 |
| --- | --- | --- |
| `tool.describe` | Claude 看到的工具说明 | 调整工具描述 |
| `tool.call` | 工具名和实际参数 | 改参数、拒绝执行、替换结果、在执行前后做事 |
| `tool.check` | 工具调用的权限判断 | 根据当前状态调整 `allow / ask / deny` |

在 `tool.call` 中，Bash 参数直接位于 `e.command`；在 `tool.check` 中，它位于 `e.input.command`。后者的 `next(e)` 返回权限决定，并不执行工具。[工具事件及字段](https://code.claude.com/docs/en/plugins/mods/reference#tools)

因此，「修改完成后记录这个文件」应该放在 `tool.call` 的 `await next(e)` 后面，而且要检查结果里的 `deny` 和 `isError`。收到了一次 `Edit` 请求，不代表文件真的被改过。

筛选事件也不用全部挤进一个大 `if`。`on` 的第二个参数可以按字段匹配，值可以是字符串、候选数组或正则。例如 `{ tool: ["Edit", "Write"] }` 就只接收这两类调用。多个字段同时出现时，需要全部满足。

### 改用户输入，和给模型补上下文，是两种产品行为

假设用户输入「帮我审查这些改动」，扩展希望补充审查范围。

修改 `prompt.submit` 的 `text`，会改变对话里显示的用户消息；追加 `context`，则保留用户原话，把额外信息交给 Claude。选哪个，取决于你希望用户看到什么。[Prompt 事件](https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt)

例如下面这个片段只补充审查要求，并保留前面其他 Mod 已添加的上下文：

```ts
on("prompt.submit", async ($, e, next) => {
  if (!e.text.includes("审查")) return next(e)
  return next({
    ...e,
    context: [
      ...(e.context ?? []),
      "审查时分别列出已确认的问题和仍需验证的疑点。"
    ]
  })
})
```

这里保留 `e.context` 很关键。几个 Mod 一起工作时，后来的扩展不应该顺手抹掉前面的内容。类似地，`prompt.section` 面对的是系统提示词的一个命名片段，`prompt.context` 面对的是会话初始上下文，`skill.prompt` 面对的是展开后的 Skill 文本。它们影响的位置不同，不能都按「每次用户按下回车」理解。

### 一轮回答，可以包含多次模型请求

用户发一个 Prompt，Claude 可能先请求模型、调用工具，再带着工具结果请求模型。这个完整过程是一轮 turn，其中每次模型请求是一个 step。

`turn.start` 和 `turn.complete` 适合统计整轮行为；`turn.step` 适合观察单次模型请求及其流式结果。后者必须用 async generator，才能把中间响应继续传出去：

```ts
on("turn.step", async function* ($, e, next) {
  const result = yield* next(e)
  if (result.usage) {
    $.ui.log(`本次输出 token：${result.usage.output_tokens}`, { to: "debug" })
  }
  return result
})
```

`yield*` 在这里有实际意义：它一边转发响应流，一边等最终结果。如果只按普通 Promise 的思路写，就丢掉了这个事件的流式约定。统计时还要注意 `e.agentId`，否则可能把子 Agent 的请求也算进主对话。`turn.complete` 也会在用户中断时触发，要用 `isAborted` 区分。[Turn 生命周期](https://code.claude.com/docs/en/plugins/mods/events#follow-a-turn)

### 多个 Mod 同时存在时，顺序就是行为的一部分

前面的 Mod 能先看输入、后看结果，还能决定后面的 Mod 是否执行。因而一个日志扩展放在脱敏扩展前面还是后面，可能决定它读到的是原始数据还是脱敏数据。

当前的分组顺序可以简化成：

```d2 {title="Mod 的分组顺序：越靠前，越能控制后面的调用路径"}
direction: down

policy: "前层组织策略\n含适用时加载的内置 guard"
user: "用户安装的 Mods"
append: "appendPlugins\n组织配置的后层 Mods"
builtin: "其他内置 Mods"
core: "Claude Code 原有行为"

policy -> user -> append -> builtin -> core
```

用户 Mod 还会运行在自己声明依赖的 Mod 之前。传统 Hook 也有位置：组织管理的 `PreToolUse` 先运行，其阻止结果具有优先级；其他来源的 `PreToolUse` 位于 `tool.call` 链深入宿主后的处理流程中。一个提前返回的 Mod，可能让后者根本没有机会运行。[排序规则](https://code.claude.com/docs/en/plugins/mods/events#the-order-mods-run-in)

出错时的行为同样重要：没有 `.catch` 的 Hook 如果在调用 `next` 前失败，会被跳过；如果 `next` 已经完成，则保留已经取得的结果，不会自动再执行一次工具。需要失败时拒绝的前置检查，应通过注册结果的 `.catch(...)` 明确返回拒绝原因。已经执行完的副作用，不会因为外层后来报错就被撤销。

这也影响「等待用户确认」的实现。用 `$.ui.ask` 等待，等待时间不计入普通 Hook 自身预算；自己挂起一个 Promise 等按钮，可能耗尽预算，最后 Hook 被跳过。确认后再 `next(e)`，仍然会继续 Claude Code 的正常权限检查。[确认与错误处理](https://code.claude.com/docs/en/plugins/mods/events)

## 更有意思的地方：Mod 调 API，也会经过 Mod

如果只是前后加几个回调，设计还不算特别。

Mods 更有意思的一点是：**它自己调用宿主 API，也会产生事件。**

例如，一个 Mod 想读文件：

```ts
const text = await $.fs.read(".env")
```

这个调用会变成 `fs.read` 事件。排在它前面的策略 Mod，可以检查路径，决定继续、修改请求，或者拒绝访问。[文件、进程与网络访问](https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network)

```d2 {title="Mod 的 API 调用，也能被前层策略 Mod 拦截"}
direction: down

mod: "业务 Mod"
event: "\$.fs.read → fs.read 事件"
policy: "前层策略 Mod\n检查这次访问"
file: "宿主读取文件"
denied: "返回拒绝结果"

mod -> event
event -> policy
policy -> file: "允许"
policy -> denied: "拒绝"
```

同样的思路也适用于进程、网络和模型调用。这样，企业可以在普通 Mod 前面放一层策略，约束后面的扩展能做什么。

还有两个比较底层的入口：`plugin.register` 可以在模块加载时检查它声明使用的事件和 API；`engine.create` 可以调整提供给 Mod 的 API。它们让策略能够介入「加载什么代码」和「交给它什么能力」这两个时刻。[其他 Mod 相关事件](https://code.claude.com/docs/en/plugins/mods/reference#other-mods)

从设计上看，`$` 像一个由宿主管理的能力入口。扩展需要资源时先经过它，宿主就有机会统一检查、记录和处理取消，也更容易在测试时替换成假实现。

## API：事件决定什么时候做，`$` 决定能做什么

有了事件，扩展知道「现在发生了什么」；有了 API，它才能主动创建命令、查询外部系统、调用模型，或者把结果放进界面。

### Command 给人用，Tool 给 Claude 用

同一个功能，可以有两种入口。比如查询改动清单：

- 用户输入 `/change-desk` 打开面板，这是 command。
- Claude 调用 `changed_files` 取得清单，这是 tool。

两者都在 `session.start` 注册，但后续分别由 `command.run` 和 `tool.call` 处理。Claude Code 会等启动 Hook 完成，再接受首个 Prompt，因此应该在这里把入口准备好。[注册 API](https://code.claude.com/docs/en/plugins/mods/api#add-a-command-or-a-tool)

工具需要 JSON Schema 描述输入。名为 `change-desk` 的插件注册 `changed_files` 后，Claude 看到的名字是 `mcp__change-desk__changed_files`。这个名字借用了 MCP 工具的命名形式，但实现仍然在 Mod 内，不代表你启动了一个 MCP server。

命令返回 `{ text }` 时，文字既显示在对话中，也会被 Claude 读到；只打开面板时返回 `{}` 即可。这和普通 UI 日志的语义不一样。

### 模型调用：独立小任务和结合当前对话的任务

`$.model.complete` 适合给定输入就能完成的分类、摘要和判断；`$.model.fork` 适合结合当前对话回答一个额外问题。选择它们之前，先想清楚任务需要哪些上下文。[模型 API](https://code.claude.com/docs/en/plugins/mods/api#call-a-model)

例如「这张工单属于 bug 还是 feature」，可以把工单单独交给 `complete`；「结合刚才这轮修改，列出还没验证的假设」，才需要当前对话。

模型没有正常回答时，`complete` 可能返回 `isAnswered: false`，而不是抛异常；组织策略拒绝请求等情况又可能直接 reject。因此调用方要同时处理返回状态和异常。它使用当前会话的凭据和用量，不能把后台调用当成没有成本的本地函数。

### 后台任务：显示状态，与启动新一轮对话要分开

一个 CI 监控扩展，可以用 `$.clock.every` 定时查询检查状态，再调用 `$.ui.status` 更新提示。这个过程不需要让 Claude 每分钟说一次「还在跑」。

```d2 {title="后台监控的两种出口：更新界面，或在满足条件时启动新的 Agent 回合"}
direction: down

timer: "clock.every\n定时触发"
fetch: "process / http\n读取最新状态"
decision: "本地判断\n有没有需要处理的新变化"
display: "ui.status / toast\n只通知用户"
turn: "prompt.submit\n排队等待空闲并开始新回合"

timer -> fetch -> decision
decision -> display: "普通进度"
decision -> turn: "需要 Claude 处理"
```

这些出口的区别，直接影响体验和模型开销：

| 调用 | 结果 |
| --- | --- |
| `$.ui.status`、`$.ui.toast` | 更新状态行或临时通知，不启动 turn |
| `$.ui.log` | 记录给用户看的日志，Claude 不读取这条日志 |
| `$.prompt.fill` | 填入可编辑的输入框草稿，等用户发送 |
| `$.prompt.submit` | 提交 Prompt，等待会话空闲后开始新的 turn |

这里有个容易造成互相等待的写法：在正在处理的 turn 中 `await $.prompt.submit(...)`。提交操作要等当前回合结束才能开始，而当前 Hook 又在等它。应把启动下一轮的工作放到合适的后台任务中，避免这种等待关系。[后台任务及通知](https://code.claude.com/docs/en/plugins/mods/api#run-work-in-the-background)

timer 会在模块 reload 时停止，新模块可以重新注册。实际做 CI 监控时，我还会记录上次处理的状态，只在新的失败出现时触发一次，避免轮询把同一个问题不断送给 Claude。

### 宿主 I/O：名字像熟悉的 API，返回值未必一样

`$.process.run(["git", "status", "--short"])` 接收参数数组，不经过 shell。管道和重定向不会因为写进某个参数就自动生效。进程正常退出时需要检查 `exitCode`；启动失败或超时则要处理异常。

`$.http.fetch` 返回已经读取完的 `{ status, ok, headers, text }`，不能照搬浏览器里 `await response.json()` 的用法。相对文件路径按会话工作目录解释，也不能默认当成插件自身目录。[宿主 I/O 约定](https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network)

`$.session.send` 则能向其他会话或子 Agent 发消息，但成功只表示消息已排入投递队列，不表示对方完成了工作。如果要做协作流程，需要自己设计任务 ID、回复和失败处理。收到的发送者名称也不应直接当成可信身份。[会话消息](https://code.claude.com/docs/en/plugins/mods/api#send-and-receive-messages-between-sessions)

## 它到底运行在哪里

公开资料能确认几件事：

1. **安装的 Mods 共享一个 hooks worker thread。**
2. 加载日志里会出现 `worker, environment 2, tier user` 这样的信息。
3. hooks module 没有 Node.js API，也没有直接文件、网络访问能力；定时器要用 `$.clock`，不能直接调用 `setTimeout`。

这些来自官方的 [API 文档](https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network)和[故障排查文档](https://code.claude.com/docs/en/plugins/mods/troubleshoot#read-the-debug-log)。

把线索放在一起，可以画出下面这个模型。**共享 worker 是事实；worker 内部的独立执行环境、代理与通信方式，是根据公开行为做出的推测。**

```d2 {title="运行时推测图：共享 worker 已确认，虚线框内的具体隔离方式未公开"}
direction: down

host: "Claude Code 宿主\n事件分发与资源访问"

worker: "共享 hooks worker（已确认）" {
  a: "Mod A 的执行环境\n具体隔离方式未公开" {
    style.stroke-dash: 4
  }
  b: "Mod B 的执行环境\n具体隔离方式未公开" {
    style.stroke-dash: 4
  }
  api: "\$ 能力入口"

  a -> api
  b -> api
}

host -> worker: "分发事件"
worker.api -> host: "请求宿主能力"
```

我倾向于认为，宿主在 worker 里为不同 Mod 建立执行环境，再通过 `$` 把文件、进程和模型等能力接出去。

但证据只到这里。一个 `environment` 编号，并不能证明它就是某种 VM 的 realm，更不能证明每个 Mod 有独立的内存隔离。它用的是哪种 JS 引擎、哪种 TS 转译器、怎样传递消息，官方没有说明。

静态分析也类似。`claude plugin validate` 能列出代码使用的事件、API 和环境变量；官方还要求某些名字写成字符串字面量。这说明它会分析源码。使用 JS/TS 解析器来完成这件事很合理，但直接断言底层是 Babel、SWC 或 TypeScript Compiler，就超出了证据。[静态能力检查](https://code.claude.com/docs/en/plugins/mods/admin#review-what-a-mod-can-do)

对使用者更实际的影响是：**别在 Hook 里做长时间占用 CPU 的工作。**

大家共用 worker，一个永远不让出执行权的循环可能拖住整个线程。官方说明，如果 worker 连续三次崩溃且无法归因，当前会话会卸载所有非内置 Mod，包括组织安装的 Mod。[worker 故障处理](https://code.claude.com/docs/en/plugins/mods/troubleshoot#it-crashed-the-hooks-worker)

## Interface：UI 本身，也在这条事件链里

前面讲的是 Agent 怎么执行工作。另一半能力是：用户怎样看到这些工作，又怎样参与其中。

Claude Code 把允许扩展绘制的地方称为 **render site**。每次需要生成这些位置的内容，会触发 `ui.render`；Mod 返回一棵元素树，宿主负责把它画出来。[界面机制](https://code.claude.com/docs/en/plugins/mods/interface)

### 可以画在哪里

最常见的三个入口，是自己打开的 `Pane`、输入框上方共享的 `AbovePrompt`，以及 Claude Code 原有的界面行。

下面是宽终端中的语义位置图，不是精确比例的界面截图：

```d2 {title="终端中的扩展位置：独立面板、共享提示区，以及可参与渲染的原有内容"}
direction: down

terminal: "Claude Code 终端" {
  grid-columns: 1
  grid-gap: 12
  workspace: "工作区" {
    grid-rows: 1
    grid-gap: 12
    transcript: "对话区域\n消息 / 工具调用\n工具结果 / Spinner"
    pane: "Pane\nMod 主动打开的面板"
  }
  band: "AbovePrompt：多个 Mod 共享"
  prompt: "用户输入框"
  status: "状态行 / 输入提示"
}
```

`Pane` 的位置由宿主布局决定：宽屏全屏终端可以停靠在对话旁边，其他情况下可能放在输入框上方。写代码时不应假定它始终是一块固定宽度的侧栏。

而且，「用户主动打开」与「扩展自己弹出来」的待遇不同。前者在窄终端也能显示；后者会受到可用空间限制。调用 `$.ui.open` 后，应检查 `isPlaced`，不要把 Promise 成功返回等同于用户已经看到了面板。

### 渲染不是改 DOM，而是回答一次绘制请求

一个渲染 Hook 里最重要的字段是：

| 字段或调用 | 用来决定什么 |
| --- | --- |
| `e.component` | 正在绘制 `Pane`、`Spinner`，还是其他位置 |
| `e.requestId` | 具体是哪一个实例，例如哪个面板 |
| `e.surface` | 当前是终端还是 Desktop |
| `e.props` | 该位置提供的数据和可用空间 |
| `$.ui.resolve(e)` | 取得当前 surface 可以使用的元素构造函数 |

渲染自己的面板时，先判断 `e.requestId`。不是自己的，就 `return next(e)`；否则会误接管别人的面板。

同一位置上，还可以选择三种处理方式：改 `e.props` 后交给 `next`，沿用宿主的绘制；直接返回自己的树，替换原有内容；或者把 `await next(e)` 的结果包进自己的 `Box`，在旁边增加内容。[修改现有界面](https://code.claude.com/docs/en/plugins/mods/interface#change-what-claude-code-already-draws)

例如，在共享提示区增加一行说明，同时保留后面的扩展：

```ts
on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
  const { Box, Text } = $.ui.resolve(e)
  const rest = await next(e)
  return Box({
    flexDirection: "column",
    children: [rest, Text({ children: ["输入 /change-desk 查看改动清单"] })]
  })
})
```

如果这里直接返回一个 `Text`，后面的 Mod 就没机会画了。**共享区域不会自动把所有扩展的内容拼在一起，组合需要作者明确写出来。**

宿主原有的内容还可能以 `{ type: "engine", ref }` 引用返回。可以保留、包裹它，不能假定里面是一棵可任意拆改的普通元素树。

权限确认框不属于开放的 render site。`AskUserQuestion` 虽然能扩展，也要求保留宿主问题界面的引用，并受放置规则约束。这些限制说明：开放 UI 不是允许扩展随意接管每一种交互。

### 点击按钮，也要经过事件链

`Button` 有 `onPress`，`Input` 有 `onInput / onSubmit`，`Select` 有 `onSelect`。这些回调看起来像普通前端代码，但调用链仍然经过宿主：

```d2 {title="一次 UI 交互：宿主分发事件，经过 Hook 后才调用控件回调"}
direction: down

dispatch: "用户操作控件\n宿主生成 UI 事件"
hooks: "事件 Hook\n观察、改写或拦截"
callback: "控件回调\n更新状态"
render: "再次生成界面树"

dispatch -> hooks -> callback -> render
```

这有两个后果。第一，其他有相应访问机会的 Mod 可能在回调之前看到输入内容，甚至改写它。第二，输入框按下 Enter 只是执行 `onSubmit`，不会自动启动 Claude 的新回合；是否调用 `$.prompt.submit`，由你的代码决定。

控件的 `key` 用于识别具体交互目标，测试也可以据此点击。列表里的按钮应有稳定、唯一的 key，不能让两个动作共用一个名字。

键盘焦点则由宿主管理。面板没有焦点时，按键通常继续进入用户输入框。`focus: true` 是请求焦点，不意味着可以抢走用户正在输入的文字；`autoFocus` 选择的是面板内部的控件。Tab、方向键、Esc 等也有宿主自己的导航规则。[交互与焦点](https://code.claude.com/docs/en/plugins/mods/interface#respond-to-presses-and-typing)

### 数据改了，界面不一定马上知道

`ui.render` 的结果是一次快照。普通模块变量改变后，宿主不会自动推断哪些界面依赖它，需要调用 `$.ui.invalidate("ui.render")`。使用 `$.state` 时，依赖关系由宿主记录，读过相关状态的位置会自动重绘。

反过来，也不要在 render 里修改状态。渲染负责读取数据并描述界面；更新应放在控件回调或其他事件中。网络请求同样适合放到事件或后台任务里，再把结果写进状态。否则一次调整窗口宽度，也可能意外再请求一遍服务。

重绘还会被合并和限频。连续写入的中间值未必都显示出来，所以不能靠「画过这条信息」充当业务操作的可靠确认。[重绘机制](https://code.claude.com/docs/en/plugins/mods/interface#redraw-a-site)

## Gallery：这套 UI 能做到哪一步

只看 `Box`、`Text` 很容易以为它只能画两行文字。[官方 Gallery](https://code.claude.com/docs/en/plugins/mods/gallery) 更适合用来判断：一个实际功能，能不能用已有元素拼出来。

| 元素 | 用在改动审查工具里，可以承担什么 |
| --- | --- |
| `Box`、`Text` | 安排清单、摘要和状态；提供行列布局、间距、边框和文字样式 |
| `Markdown`、`Link` | 展示审查说明，以及关联 issue、文档链接 |
| `Code` | 展示带高亮的源码，或 unified diff |
| `Button`、`Input`、`Select` | 选择文件、填写审查要求、切换过滤条件 |
| `Raster`、`Svg`、`Image` | 用图形展示分布、热力图或图片，按 surface 选择 |
| `Client` | 把需要动画、键盘或指针输入的局部界面交给单独模块 |

### Diff 已经是现成的展示能力

`Code` 不只是代码高亮。设置 `format: "diff"`，就可以把 unified diff 交给宿主绘制，包括增删行的视觉区分：

```ts
Code({
  format: "diff",
  source: "@@ -1 +1 @@\n-const retries = 1\n+const retries = 3"
})
```

因此，一个迁移预览工具可以专心准备 diff 数据、选择范围和处理确认，不必从头实现一个终端 diff renderer。代码着色与主题也能沿用宿主的表现。[Gallery 的代码与差异示例](https://code.claude.com/docs/en/plugins/mods/gallery#show-code-and-changes)

不过，展示 diff 和计算 diff 是两件事。`Code` 不负责读取 Git，也不证明转换正确。前面的 Mod / 确定性工具分工，在 UI 层仍然适用。

### 输入控件提供了小型工作台所需的交互

按钮、单行输入框、选择器，再加上行列布局，已经能组合出一个文件审查面板。比如上面放筛选框，中间放清单，下面放「填入审查请求」按钮。

这里需要管理的是状态，而不只是摆几个控件：筛选条件改变后哪些行应该留下，重绘时输入值是否保留，提交以后是否清空。`Input` 的 `value` 是本次绘制给它的内容，如果每次都传空字符串，重绘可能把输入恢复为空；想保留草稿，就应该保存输入值。[Gallery 的输入控件](https://code.claude.com/docs/en/plugins/mods/gallery#take-input)

### 终端和 Desktop 有共同能力，也有不同能力

普通文本、布局和控件可以共用，但图形元素不能一概而论。当前文档中，`Raster` 和 `Image` 用于终端，`Svg` 用于 Desktop。代码应按 `e.surface` 分支，或者提供文字版替代，避免某个 surface 只剩空面板。[元素支持范围](https://code.claude.com/docs/en/plugins/mods/reference#elements)

`Raster` 适合字符网格、热力图这类内容。更新现有网格时，`$.ui.blit` 可以只重画那一块，省掉重新执行整个 `ui.render` 的过程。它解决的是局部绘制问题，不是给 Hook 增加一套浏览器 Canvas。

### `Client`：复杂交互可以有自己的界面模块

对于动画、拖动和密集输入，每次都绕回 hooks worker 并重建整个面板，并不合适。`Client` 提供了另一条路径：hooks module 返回一个指向界面模块的元素，由界面模块处理局部绘制和输入。

公开类型声明里的 `ClientModule` 和 `ClientSurface` 进一步说明了这个分工：界面模块有局部状态、帧时钟、键盘和指针监听；它没有 `$`，需要业务能力时，通过 `surface.post(data)` 发回所属插件的 `ui.message`。后者可以返回新的 props。[公开类型声明](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts)

```d2 {title="Client 的职责边界：局部交互留在界面模块，业务能力仍由 hooks module 执行"}
direction: down

hook: "hooks module\n业务逻辑 + \$ API"
client: "Client 界面模块\n局部状态 / 绘制 / 指针与键盘"
host: "文件、进程、模型等宿主能力"

hook -> client: "元素 props / 更新后的 props"
client -> hook: "surface.post → ui.message"
hook -> host: "调用能力"
```

这不是往面板里塞一个任意网页。它仍然遵守宿主提供的元素和运行环境约束。对于普通清单和几个按钮，常规 `ui.render` 已经足够；确实需要局部高频交互时，再考虑 `Client`。

## 能力越深入，越要看清权限边界

没有 Node API，不代表 Mod 被关进了操作系统沙箱。

**官方明确说明，Mods 没有被 sandbox 隔离，最终以当前用户的权限访问文件、进程和网络。** `$` 让调用变得可管理，但本身不等于操作系统级的权限隔离。

举一个具体例子：你设置 `Read(.env)` 为 deny，限制的是 Claude 的工具调用。Mod 自己仍可能通过 `$.fs.read` 读取这个文件，或者通过 `$.process` 启动一个能读取它的程序。[企业管理文档](https://code.claude.com/docs/en/plugins/mods/admin#know-what-happens-by-default)

这也不意味着现有规则全部失效。在启用内置 guard 的受管理环境中，deny 规则和组织管理的 Hook 有相应保护。需要分清的是：**约束 Claude 的工具调用，与约束扩展自己的资源访问，是两条不同的路径。**

因此，安装第三方 Mod 时，应该按可执行程序审查。尤其要看文件、环境变量、进程和网络访问，以及它是否会替用户批准工具调用。企业需要限制这些行为时，可以控制允许加载的 Mod，再通过前层策略拦截 API；有更强隔离要求时，还要落实到运行账户或操作系统环境。

另外，普通 Hook 出错可能被跳过，worker 出问题也可能导致 Mod 被卸载。一个承担强制安全职责的策略，必须验证这些故障场景下的行为，不能只测试正常情况下是否能拦住请求。

## 状态放哪，取决于你希望它活多久

一旦扩展开始画界面、统计调用次数，就会遇到状态问题。

Mods 提供的三个位置很容易记：

| 放在哪里 | 能保留多久 | 适合什么 |
| --- | --- | --- |
| 模块变量 | 当前模块实例；reload 后重建 | 临时缓存、短期计算结果 |
| `$.state` | 当前会话，可跨模块 reload；`/clear`、`/resume`、`/branch` 会重置 | 会话状态、界面交互 |
| `$.store` | 跨会话保存，同一机器上该插件的会话共享 | 用户偏好、小型持久缓存 |

`$.state` 还有响应式行为：某个界面渲染时读了状态，之后状态改变，会触发相关位置重绘。因此，不必每改一次状态，都手动通知所有界面。[状态与持久化](https://code.claude.com/docs/en/plugins/mods/interface)

```d2 {title="响应式状态：读取建立依赖，更新触发相关界面重绘"}
direction: down

render: "ui.render 读取状态"
track: "宿主记录\n这个界面依赖这个状态"
change: "按钮或其他事件更新状态"
redraw: "相关界面重新渲染"

render -> track
track -> change: "之后"
change -> redraw
```

这和 atom、signal 的使用体验接近。但仅凭 API 形状，推不出内部采用了哪个前端状态库。

使用时还需要把状态写进 `PluginState` 类型声明，再由 manifest 的 `types` 指向该文件。`atom({ plugin: "...", key: "..." }, 默认值)` 里的名字必须是字面量，校验器才能从源码识别。后面的完整示例会把这几个文件一起列出来。

会话重置有个特别容易漏掉的细节：`/clear`、`/resume`、`/branch` 会重置 `$.state`，但不会重新触发 Mod 的 `session.start`。如果状态需要从 `$.store` 恢复，还要处理 `classic.SessionStart` 的相应 `source`，其中 branch 对应 `fork`。否则初始化时恢复了一次，用户清空对话后却回到了默认值。[重置后的状态恢复](https://code.claude.com/docs/en/plugins/mods/interface#load-a-saved-value-again-after-clear)

`$.store` 则有一个实际的坑：**读取后再写入，不是原子操作。**

```ts
const count = Number((await $.store.get("count")) ?? 0)
await $.store.set("count", count + 1)
```

两个会话同时读到 `10`，各自加一，再分别写回 `11`。明明执行了两次加一，最终却只增加一次。

官方明确记录了这种竞争。因此，把它用于偏好设置和少量缓存很合适；要做跨会话计数、锁或者事务，就该考虑外部数据库或服务了。[多会话写入说明](https://code.claude.com/docs/en/plugins/mods/interface#save-from-more-than-one-session)

## AST 转换，交给擅长它的工具

如果你想把整个仓库从旧 SDK 迁移到新 SDK，Mod 能帮忙组织流程，但它没有内置 `$.ast.parse()` 这样的接口。

当前公开 API 主要处理事件、文本、工具结果和界面树，没有提供语言级 AST 重写引擎。[API 总表](https://code.claude.com/docs/en/plugins/mods/reference#mods-api-methods)

真正的源码转换，可以交给 `jscodeshift`、基于 `ts-morph` 的 CLI、编译器或语言服务。Mod 负责选择转换、收集参数、展示进度，再把执行结果带回 Claude Code。

我会把这类任务拆成下面这样：

```d2 {title="建议的代码迁移流程：Mod 组织过程，确定性工具转换与验证源码"}
direction: down

scope: "Mod + 用户\n确认迁移范围与参数"
preview: "转换器预演\n生成可审查的改动"
apply: "确定性转换器\n应用源码变换"
checks: "Formatter + 类型检查 + 测试"
review: "Git diff + 人工 / Claude 审查"

scope -> preview
preview -> apply: "确认后执行"
apply -> checks
checks -> review
```

这是一种建议的工程流程，不是 Mods 自动提供的功能。预演、回滚和转换规则，都需要由转换器或集成代码实现。

这样分工后，LLM 可以帮助判断迁移范围、理解失败、审查结果；重复的语法替换交给可测试的程序。转换器最好还满足幂等性：同一份代码跑第二次，不应该又产生一批变化。

即使不用 AST，也可以用同样的方法选择扩展机制：

| 你真正想做的事 | 通常先考虑 |
| --- | --- |
| 给 Claude 一套知识或操作流程 | Skill |
| 连接外部服务，并供多个客户端使用 | MCP |
| 编辑后固定运行一次 formatter | settings hook |
| 批量执行确定的源码变换 | codemod / 编译器工具 |
| 改 Prompt、工具流程，或增加有状态的界面 | Mod |
| 把这些能力一起安装、升级和分发 | Plugin |

需要跨事件的状态、动态决策和界面交互时，Mod 的价值会更明显。只有一条「编辑后执行格式化」的规则，传统 Hook 通常已经够用。

## 把它们串起来：做一个改动清单面板

前面分别讲了 Events、API、Interface 和 Gallery。下面用一个小功能把它们接起来：**记录本会话通过 Edit / Write 成功改过的文件，让用户查看，也让 Claude 能查询。**

它包含四条路径：

```d2 {title="同一份会话状态，连接工具事件、用户面板和 Claude 可调用的工具"}
direction: down

edit: "Edit / Write 成功完成"
state: "响应式文件清单"
pane: "用户运行 /change-desk\n面板读取清单"
tool: "Claude 调用 changed_files\n取得同一份清单"
button: "用户点击审查按钮"
draft: "prompt.fill\n填入草稿，等待用户发送"

edit -> state
state -> pane
state -> tool
pane -> button -> draft
```

这个例子故意把「展示给人」「提供给模型」「启动下一轮工作」分开。面板中的清单不会自动进入模型上下文；Claude 要通过工具查询，或者用户发送填好的审查请求。

### 文件结构与声明

```text
change-desk/
├── .claude-plugin/plugin.json
├── hooks/hooks.json
├── hooks/register.ts
├── types/index.d.ts
└── tests/register.test.ts
```

`.claude-plugin/plugin.json` 同时声明插件身份和状态类型文件：

```json
{
  "name": "change-desk",
  "version": "0.1.0",
  "author": {
    "name": "DJJ"
  },
  "description": "查看当前会话通过 Edit/Write 改过的文件",
  "types": "./types/index.d.ts"
}
```

`hooks/hooks.json` 指向入口，路径相对于这个 JSON 文件：

```json
{
  "modules": ["./register.ts"]
}
```

`types/index.d.ts` 声明本插件的会话状态：

```ts
declare module "claude-code" {
  interface PluginState {
    "change-desk": { files: string[] }
  }
}
```

### 事件、工具与界面放进同一个模块

下面是完整的 `hooks/register.ts`。留意三处连接：成功的工具调用写入状态，面板读取状态建立依赖，按钮点击时再读取最新清单。代码没有在 `ui.render` 中写状态，也不用手动 invalidate。

```ts
import { atom, read, update } from "claude-code"

const files = atom({ plugin: "change-desk", key: "files" }, [])

export function register(on) {
  on("session.start", async ($, e, next) => {
    await $.tool.register({
      name: "changed_files",
      description: "列出当前会话通过 Edit/Write 成功修改过的文件；不是 Git diff",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    })
    await $.command.register({
      name: "change-desk",
      description: "打开当前会话的改动清单",
      immediate: true
    })
    return next(e)
  })

  on("tool.call", { tool: ["Edit", "Write"] }, async ($, e, next) => {
    const result = await next(e)
    if (!result.deny && !result.isError) {
      await update($, files, (old) =>
        old.includes(e.file_path) ? old : [...old, e.file_path]
      )
    }
    return result
  })

  on("tool.call", { tool: "mcp__change-desk__changed_files" }, async ($) => {
    return { result: JSON.stringify(await read($, files)) }
  })

  on("command.run", { command: "change-desk" }, async ($) => {
    await $.ui.open({
      id: "change-desk", title: "本轮会话的改动", focus: true, closeOnEscape: true
    })
    return {}
  })

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== "change-desk") return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await read($, files)

    return Box({
      flexDirection: "column",
      gap: 1,
      children: [
        Text({ children: [`已记录 ${current.length} 个文件`] }),
        ...current.slice(0, 20).map((path) => Text({ children: [path] })),
        ...(current.length > 20 ? [Text({ children: ["其余文件可通过工具查询"] })] : []),
        ...(current.length ? [Button({
          key: "review", label: "把审查请求填入输入框",
          onPress: async () => {
            const latest = await read($, files)
            const filled = await $.prompt.fill({
              text: "\n请审查这些文件的改动：\n" + latest.join("\n"),
              mode: "append"
            })
            if (!filled.isFilled) $.ui.toast("当前无法填写，请回到输入框后重试")
          }
        })] : [])
      ]
    })
  })
}
```

当 `Edit / Write` 成功返回，清单去重后更新，已打开的面板自动重绘。`changed_files` 工具则直接返回同一份状态，不需要再扫一遍仓库。

这里的「改动清单」有明确范围：只统计这两个工具成功返回的文件，不代表 Git 当前 diff，也不会自动发现 Bash、外部编辑器或其他工具造成的改动。同一文件后来被恢复，也仍会留在清单中。若产品需要的是「当前未提交差异」，应该像官方 `diff` Mod 一样查询 Git。

清单放在 `$.state`，所以模块热加载后仍然保留，会话清空或切换后重置。这正好符合它作为当前会话辅助信息的用途，无需持久化到所有会话共享的 store。

### 测试不只看返回值，还要真的驱动按钮

`tests/register.test.ts` 覆盖去重、失败分支、入口注册，并在 `terminal` 和 `desktop` 上分别挂载界面、观察重绘、点击按钮。`ui.mount` 测的是元素树和交互协议，不是终端或 Desktop 的像素截图。[界面测试方法](https://code.claude.com/docs/en/plugins/mods/test)

```ts
import { expect, test } from "claude-code/testing"

for (const surface of ["terminal", "desktop"] as const) {
  test(`${surface}: 成功编辑刷新面板，点击按钮只填写草稿`, async ($, on) => {
    on("tool.call", () => ({ result: "ok" }))
    let filledText = ""
    on("prompt.fill", ($, e) => {
      filledText = e.text
      return { isFilled: true }
    })

    const ui = await $.ui.mount({
      plugin: "change-desk", surface, component: "Pane", requestId: "change-desk",
      props: { title: "Changes", isFocused: true, bodyColumns: 60 }
    })
    expect(await ui.find({ type: "Text", text: "已记录 0 个文件" })).toBeDefined()
    await $.tool.call({ tool: "Write", file_path: "src/app.ts", content: "example" })
    await $.tool.call({ tool: "Write", file_path: "src/app.ts", content: "example 2" })
    expect(await ui.find({ type: "Text", text: "已记录 1 个文件" })).toBeDefined()
    const list = await $.tool.call({ tool: "mcp__change-desk__changed_files" })
    expect(list.result).toBe('["src/app.ts"]')
    await ui.press({ key: "review" })
    expect(filledText).toBe("\n请审查这些文件的改动：\nsrc/app.ts")
    await ui.unmount()
  })
}

test("被拒绝或失败的调用不计入清单", async ($, on) => {
  on("tool.call", ($, e) => e.file_path === "denied.ts"
    ? { deny: "blocked" } : { result: "failed", isError: true })
  await $.tool.call({ tool: "Write", file_path: "denied.ts", content: "example" })
  await $.tool.call({ tool: "Write", file_path: "failed.ts", content: "example" })
  const list = await $.tool.call({ tool: "mcp__change-desk__changed_files" })
  expect(list.result).toBe("[]")
})

test("启动时注册入口，命令打开自己的面板", async ($, on) => {
  on("session.start", ($, e) => e)
  const registered: string[] = []
  let opened = ""
  on("tool.register", ($, e) => {
    registered.push(e.name)
    return { value: undefined }
  })
  on("command.register", ($, e) => {
    registered.push(e.name)
    return { value: undefined }
  })
  on("ui.open", ($, e) => {
    opened = e.id
    return { value: { isPlaced: true } }
  })
  await $.session.start({ cwd: "/example-repo" })
  expect(registered).toEqual(["changed_files", "change-desk"])
  await $.command.run({ command: "change-desk", args: "" })
  expect(opened).toBe("change-desk")
})
```

测试中的工具和输入框由 stub 回答，因此不会改真实文件，也不会启动模型请求。面板的按钮回调、状态更新和事件链则会实际运行。这里的 `on` stub 也接收 `($, e)`，不要把第一个参数误当成事件数据。

在 `change-desk` 的父目录运行：

```bash
claude plugin validate --strict ./change-desk
claude plugin test ./change-desk
claude --debug-file ./mod-debug.log --plugin-dir ./change-desk
```

前两个命令检查结构和行为；最后一个用于进入实际会话，执行 `/change-desk` 检查显示与键盘操作。上面的完整代码已在 Claude Code **v2.1.289** 通过严格校验和 **4 项测试**。使用 `--plugin-dir` 开发时可以热加载；加载失败会保留上一个可工作版本。[调试与热加载](https://code.claude.com/docs/en/plugins/mods/troubleshoot)

## 写到实际项目里，我会注意这些事

**让 Hook 保持轻量。** 普通 Hook 的自身执行预算是 10 秒，`prompt.edit` 只有 50 毫秒。这里的「自身执行」不包含等待 `next` 和多数 Mods API 的时间，但 `$.clock.sleep` 是例外。耗时 I/O 可以异步等待，大量 CPU 计算应交给外部程序；长任务还要处理 `next.signal` 的取消信号。[时间与容量限制](https://code.claude.com/docs/en/plugins/mods/reference#limits)

**不要让持久化状态无限增长。** 当前 `$.store` 总容量是 4 MiB；`$.fs.read/write` 单文件也有限制。它们适合扩展日常工作，不适合直接承担大型数据处理。普通 JSON store 也不应该被当成专门的密钥库。

**把高频路径上的模型调用算清楚。** 每次用户输入、每次工具调用都额外请求一次模型，会带来成本和延迟。能从事件数据确定的事，就直接算；确实需要模型判断时，再选择合适的触发时机。修改 Prompt 时，也尽量避免反复塞入无用的时间戳和随机内容。

**升级时同时检查 Claude Code 和 Plugin。** Mod 没有独立的版本系统，代码随 Plugin 发布。Plugin 支持依赖版本范围，但范围约束不等于锁死到某个版本；需要复现的团队应保留经过验证的版本组合。[依赖机制](https://code.claude.com/docs/en/plugins/dependencies)

CI 可以从 `claude plugin validate` 和 `claude plugin test` 开始。涉及真实文件、外部进程和源码转换时，再补相应的集成测试，以及转换前后样例、类型检查和幂等性检查。通过模拟测试，只能说明事件逻辑符合预期，不能替代真实环境验证。

## 值得关注的是，Agent 的执行过程开始开放了

想继续研究，可以先看 Anthropic 已公开的两个例子：

- [`diff`](https://github.com/anthropics/claude-code/tree/main/mods/diff)：观察如何把工具事件、文件状态和界面连接起来。
- [`sec-default`](https://github.com/anthropics/claude-code/tree/main/mods/sec-default)：观察策略怎样介入其他 Mod，以及受管理配置怎样受到保护。

它们分别展示了日常功能和策略控制这两种用途。对我来说，这比再列几十个 API 名字更能说明 Mods 的价值。

过去，定制 Agent 往往集中在 Prompt 和工具列表。现在，输入怎样进入模型、工具怎样被调用、结果怎样展示，这些过程也开始成为可编程的接口。

我更期待的是它和现有工具的组合：Skill 承载知识，MCP 连接外部系统，确定性的程序负责转换和验证，Mod 把这些能力接入 Agent 的工作过程，再用 Plugin 一起分发。

每一部分都有清楚的职责，整个扩展才更容易理解、测试，也更容易在出问题时找到原因。
