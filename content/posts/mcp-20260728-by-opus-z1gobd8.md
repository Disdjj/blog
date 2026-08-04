---
title: 'MCP: 2026-07-28 by Opus'
slug: mcp-20260728-by-opus-z1gobd8
url: /post/mcp-20260728-by-opus-z1gobd8.html
date: '2026-08-04 14:08:56+08:00'
lastmod: '2026-08-04 15:04:58+08:00'
toc: true
isCJKLanguage: true
---



# MCP: 2026-07-28 by Opus

MCP 发布了最新的版本的: 2026-07-28

已经列出的主要变更: [https://modelcontextprotocol.io/specification/2026-07-28/changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

非常值得欣喜的是, MCP 正在向 stateless 转变, 这意味着后续做大规模部署会更加的方便

让我们来详细的看看新版本的 MCP 带来了那些功能变化, 以及这些变化会产生什么影响

# 先说结论

这个版本最值得看的一点: MCP 终于把自己的身份讲清楚了. 它是一个**能力接入协议**, 到此为止.

很长一段时间里, 大家把 MCP 理解成"让大模型调用工具的协议". 到 `2026-07-28` 这个理解已经不够用了.

现在的 MCP 定义的是: AI 应用怎么发现外部能力, 怎么读上下文, 怎么调工具, 怎么向用户要输入, 怎么监听变化, 怎么处理长任务, 以及在远程环境里怎么做认证授权.

反过来, 它明确**不管**: 模型推理、Agent Loop、记忆、上下文压缩、任务规划.

这个边界划得很好. 我之前吐槽过 MCP 不配叫 protocol, 本质就是 Function Call + Proxy. 现在我要改口一半: 它确实在往 protocol 的样子长, 因为它开始认真处理无状态、缓存、路由、扩展协商这些真正协议层的问题了.

另一半我不改口: 它依然没解决 agent 最难的部分, 也没打算解决.

> 先声明: 下面的功能梳理基于 [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) 和 spec 的阅读, 有 AI 参与整理. 我没有把每一条都实测过, 尤其是 MRTR 和 Tasks 的实际行为, 看到的东西和跑起来的东西大概率有差距.

# 系统边界: Host / Client / Server

三层参与者:

```text
MCP Host
├── MCP Client A ── MCP Server A
├── MCP Client B ── MCP Server B
└── MCP Client C ── MCP Server C
```

- **Host**: 用户直接用的 AI 应用, IDE、桌面助手、Agent 平台.
- **Client**: Host 内部负责连一个 Server 的协议组件.
- **Server**: 暴露 tools / resources / prompts 和其他能力.

一个 Host 管多个 Client, 一个 Client 通常对一个 Server. 远程 Server 可以同时服务大量 Client, 本地 STDIO Server 一般由单个 Host 进程拉起.

MCP 内部还能再拆两层.

**数据层**定义 JSON-RPC 消息和能力语义: 版本与能力发现、tools、resources、prompts、elicitation、通知与进度与错误、扩展协商.

**传输层**负责把消息送到: STDIO、Streamable HTTP、SSE 响应流、HTTP Authorization.

同一套数据层协议可以跑在不同传输层上. 这个分离是对的, 也是它能同时活在本地 CLI 和 Kubernetes 上的原因.

所以 MCP 回答的问题只有一个:

> AI 应用和外部能力之间, 用什么标准接口通信.

模型怎么推理、怎么挑工具、怎么控上下文、要不要多 agent, 全是 Host 的事.

# Discovery: initialize 死了

这是我最喜欢的一个改动.

`2026-07-28`​ 把原来的 `initialize` 握手和协议级 Session 干掉了.

现在每个请求自己带全信息: 协议版本、Client 信息、Client Capabilities、Extension Capabilities.

Server 必须实现:

```text
server/discover
```

它返回 Server 支持的协议版本、Server Identity、Server Capabilities、支持的 Extensions、Server Instructions、缓存信息.

Client 可以先调 `server/discover`​, 也可以直接发业务请求, 收到 `UnsupportedProtocolVersionError` 再挑个兼容版本重试.

Discovery 的重点在哪? 不在工具列表. 它真正完成的是:

```text
协议兼容性发现
+
能力协商
+
扩展协商
+
Server 身份描述
```

为什么这个改动重要? 因为握手 = 状态. 有握手就必须有 sticky session, 就必须有共享的 session storage, 就没法在 serverless 上裸跑.

砍掉它, MCP 才真的能横向扩.

# Tools: 还是最常用的那个

Tool 适合表达: 搜索、创建或修改数据、调三方 API、执行命令、写文件、发消息、启工作流.

Tool 是 **Model-Controlled** 的: 模型自己决定什么时候调.

接口就两个:

```text
tools/list
tools/call
```

一个能上生产的 Tool 至少长这样:

```json
{
  "name": "create_issue",
  "description": "Create an issue in the specified repository",
  "inputSchema": {},
  "outputSchema": {}
}
```

Tool Result 可以同时返回给模型读的 `content`​ 和给程序处理的 `structuredContent`.

定了 `outputSchema`​, Server 就必须保证 `structuredContent` 符合它, Client 也该校验. 为了兼容老 Client, 返结构化内容时最好同时给个文本表示.

## Tool 适合什么

```text
需要执行动作
需要实时计算
需要外部系统交互
需要模型自主决定调用时机
```

## Tool 不适合什么

- 大量静态文档读取.
- 用户主动选的固定工作流.
- 单纯为了塞背景知识.
- 把几十种无关操作藏在一个巨型 `action` 参数里.

最后那条是我见得最多的. 一个 `manage_everything(action, data)` 就把 MCP 三个 primitive 的边界全糊掉了.

# Resources: 数据是对象, 不是操作

Resource 暴露可读数据: 文件内容、数据库 Schema、Git 历史、API 文档、项目配置、日历、知识库.

Resource 是 **Application-Controlled** 的: Host 决定要不要读、要不要搜、要不要注入上下文. 每个 Resource 用 URI 唯一标识.

接口:

```text
resources/list
resources/templates/list
resources/read
subscriptions/listen
```

两种形态. 固定的:

```text
file:///project/README.md
git://repository/history
calendar://events/2026
```

带参数的 Template:

```text
docs://project/{projectId}/{path}
database://schema/{database}/{table}
logs://service/{service}/{date}
```

那 Resource 和 Tool 到底怎么分?

假设要读一份文档.

```text
Resource:
docs://project/architecture
```

说的是: 这是一个可以被应用读取并加进上下文的**数据对象**.

```text
Tool:
search_documents(query)
```

说的是: 执行一次检索计算, 返回这次查询的结果.

一句话: Resource 更像对象, Tool 更像动作.

# Prompts: 工作流入口

Prompt 是 Server 提供的结构化提示模板, 可以包含 System/User Message、Resource Link、Embedded Resource、参数化指令、面向特定工具的流程.

Prompt 是 **User-Controlled** 的: 用户通过菜单、Slash Command 或按钮主动选.

```text
prompts/list
prompts/get
```

适合表达"分析当前项目架构"、"生成本周工作总结"、"Review 当前 PR"、"根据会议记录生成待办".

Prompt 能组合多条消息、资源链接和 Server 管理的内容. 它比一个字符串重得多.

和 Tool 的分工:

```text
Prompt: 告诉模型这类任务该怎么完成
Tool: 提供完成任务所需的一个具体动作
```

举例:

```text
Prompt: review_pull_request
Tools:
- get_pull_request
- list_changed_files
- get_ci_status
- submit_review
```

Prompt 组织工作流, Tool 提供原子能力.

# Elicitation: 执行中间跟用户要东西

Server 在处理请求时, 可以通过 Client 向用户要额外信息.

两种模式.

**Form Mode**: Client 按 JSON Schema 弹表单. 适合确认操作、补缺参数、选选项、填非敏感信息.

**URL Mode**: Client 打开 Server 给的外部页面, 用户在页面里完成交互. 适合 OAuth、密码、API Key、支付凭据、三方授权.

spec 明确**禁止** Server 用 Form Mode 要密码、access token、API Key、支付凭据. 这些必须走 URL Mode.

这条禁令写得好. 因为 Form Mode 的输入会经过 Client, 而 Client 里坐着一个模型.

新版里 Elicitation 走 MRTR:

```text
Client → tools/call

Server → input_required
         elicitation/create

Client 收集用户输入

Client → 重试原 tools/call
         inputResponses

Server → complete
```

Server 不再通过双向连接主动向 Client 发独立请求了.

# MRTR: 无状态怎么做多轮

Multi Round-Trip Requests, 解决的是:

> Server 现在做不完这个请求, 需要 Client 或用户补输入.

流程:

1. Client 发原始请求.
2. Server 返 `resultType: "input_required"`.
3. Client 完成里面的 `inputRequests`.
4. Client 带 `inputResponses` 重试原始请求.
5. Server 返最终结果.

MRTR 不要求保持原连接、不要求保持 Server 调用栈、不要求命中同一个 Server 实例、不要求 Sticky Session、不要求共享 Session Storage.

这才是它的价值: 让 Elicitation 这种交互能跑在无状态、可横向扩的 HTTP 基础设施上.

但它只适合"这次调用缺输入", 不适合几小时几天的后台任务.

# Tasks: 长任务搬去扩展了

Tasks 从实验性 Core Feature 移进了官方扩展:

```text
io.modelcontextprotocol/tasks
```

适合长时间研究、构建部署、CI Pipeline、批量数据处理、异步审批、持久化 Agent Workflow.

Server 返 Task Handle, Client 用:

```text
tasks/get
tasks/update
tasks/cancel
```

查状态、提补充输入、请求取消.

Tasks 必须双方显式声明支持, 它不是所有实现都得有的核心能力.

MRTR 和 Tasks 怎么选:

|场景|应使用|
| --------------------------| --------------------|
|当前调用缺少确认或参数|MRTR + Elicitation|
|当前调用几秒内能完成|普通 Request|
|任务可能持续数分钟到数天|Tasks|
|需要观察资源或目录变化|Subscription|

# Subscriptions: 订阅要显式声明

新版统一用:

```text
subscriptions/listen
```

接长期变化通知.

Client 必须明确声明要听什么: Tool List Changed、Prompt List Changed、Resource List Changed、指定 Resource Updated.

Server **不得**发 Client 没订阅的通知类型.

Subscription 的返回值是一个长期保持的响应流, 但它仍然属于某个具体请求, 不是一个隐藏的协议 Session. 这个区分很重要, 否则无状态就白做了.

连接断了 Client 得重发 `subscriptions/listen`​. 协议不再支持用 `Last-Event-ID` 恢复 SSE 消息.

# Progress 与 Cancellation

请求生命周期内的较长操作, Server 可以发:

```text
notifications/progress
```

展示已处理数量、当前阶段、总体进度、预计剩余步骤.

取消这块分传输: Streamable HTTP 里关掉这个请求对应的 SSE Response Stream 就是取消; STDIO 里发 `notifications/cancelled`.

别把 Progress 和 Tasks 混了:

- Progress 属于一个**还活着的**请求.
- Task 可以脱离原请求长期存在.

# Caching: 协议自己管缓存了

这些响应现在要带 `ttlMs`​ 和 `cacheScope`:

`server/discover`​、`tools/list`​、`prompts/list`​、`resources/list`​、`resources/templates/list`​、`resources/read`.

`ttlMs`​ 是客户端可以把结果当新鲜数据的时间, `cacheScope` 说这结果能被公共缓存还是只能私有缓存.

缓存和变化通知可以一起用:

```text
TTL 尚未过期
    +
收到 list_changed
    =
立即把缓存标记为失效
```

MRTR 里带 `inputResponses`​ 或 `requestState` 的结果不能缓存, 因为结果依赖额外交互输入.

一个协议开始认真定义 `cacheScope`, 说明它真的在往 HTTP native 走了.

# Transport: STDIO 和 Streamable HTTP

**STDIO** 适合本地工具、CLI、IDE 插件、单用户进程、低延迟本地调用. 认证信息一般走环境变量或本地凭据系统.

**Streamable HTTP** 适合远程服务、SaaS、企业平台、Serverless、Kubernetes、多租户.

每个 JSON-RPC 请求都是独立的 HTTP POST. Server 可以返一个 JSON Response, 也可以返只属于这个请求的 SSE Stream.

HTTP 请求还会带:

```http
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: create_issue
```

这几行 header 是我认为整个版本最实用的设计.

有了它, Gateway、WAF、Rate Limiter 不用解 JSON Body 就能做路由、鉴权、限流、审计、计量.

以前想在网关上按 tool 名限流? 得把 body 拆开. 现在看 header 就行.

老的 HTTP+SSE Transport 已经弃用, 新实现别再碰.

# Extensions: Core 保持小

新版正式确立了扩展协商机制.

现在的典型扩展: Tasks、MCP Apps、Enterprise-Managed Authorization、OAuth Client Credentials.

MCP Apps 是让 Server 返回能直接在 Host 里渲染的交互式 HTML 界面: 表单、Dashboard、图表、数据浏览器、可视化编辑器. 这些 UI 跑在 Host 控制的 Sandbox iframe 里, 能通过 MCP Tool 和 Server 双向交互.

扩展机制的意义是:

> Core 保持小而稳定, 复杂能力通过可选模块演进.

Client 和 Server 必须做 Extension Capability Negotiation, 不能假设对方支持某个扩展.

这里我有点保留意见: MCP Apps 这个方向让我想起当年 Claude Desktop 生态. Server 能往 Host 里塞 UI, 好用是好用, 但它把"能力接入"又推回"应用平台"了. 边界刚划清楚, 别自己越回去.

# 功能怎么选

|需求|MCP 功能|
| ------------------------| -------------------------|
|让模型执行动作|Tool|
|向应用提供可读取上下文|Resource|
|向用户提供可复用工作流|Prompt|
|执行中需要用户补充信息|Elicitation|
|需要多轮补充输入|MRTR|
|需要持续数分钟以上|Tasks|
|需要监听能力或资源变化|Subscription|
|需要跨调用保存业务状态|显式 Handle|
|需要展示复杂交互界面|MCP Apps|
|需要远程访问和用户权限|Streamable HTTP + OAuth|
|需要本地进程集成|STDIO|

一个完整流程大概是:

```text
用户选择 Prompt
    ↓
Host 读取 Resources
    ↓
模型调用 Tools
    ↓
Server 通过 Elicitation 请求确认
    ↓
复杂操作返回 Task Handle
    ↓
Client 查询 Task 状态
    ↓
MCP App 展示最终结果
```

这些能力不是互相替代, 是组合用的.

# 实践: 十二条

下面这些有些是 spec 明说的, 有些是我自己的判断. 我尽量标出来.

## 一、先判断控制权, 再选 Primitive

spec 对三个 primitive 的控制权定义很清楚:

|Primitive|控制者|
| -----------| -------------|
|Tool|Model|
|Resource|Application|
|Prompt|User|

设计能力时先问一句:

> 谁应该决定这个能力什么时候被用?

模型自己决定 → Tool. 应用决定要不要进上下文 → Resource. 用户主动启动 → Prompt.

现在很多 MCP Server 只实现 Tools, 把读文档、跑工作流、接用户命令全做成 Tool.

能跑, 但代价是: MCP 原有的控制边界丢了, 模型的工具选择负担还变重了.

## 二、Tool 要小、要明确、Schema 要全

推荐:

```text
create_issue
update_issue
close_issue
get_issue
```

不推荐:

```text
manage_issue(action, data)
```

前者好在哪? 更容易被模型选对、更容易写准 Description、能独立授权、能独立限流、能审计副作用、能定义输入输出 Schema.

Tool 应该给: 清晰稳定的 Name; 描述前置条件、行为和副作用的 Description; 严格的 `inputSchema`​; 尽可能完整的 `outputSchema`; 能让模型自己改参数的错误信息.

错误分两类, 别混: 协议错误表达请求结构本身有问题; 业务失败和参数问题走 `isError: true` 的 Tool Execution Error, 返可操作的反馈让模型修正重试.

还有一条要记牢: **Tool Annotations 只是提示, 不是安全边界.**  Client 必须把来自不可信 Server 的 Annotations 当不可信数据.

## 三、渐进式 Tool Discovery

Host 连一堆 Server 的时候, 别把所有 Tool Schema 一次性塞进模型上下文.

官方 Client Best Practices 推荐:

```text
Catalog → Inspect → Execute
```

**Catalog** 只暴露 Tool Name、一句话 Description、所属 Server、简要标签.

**Inspect** 模型挑出候选后, 再加载完整 Description、Input Schema、Output Schema、详细文档.

**Execute** 完整理解接口后再调.

官方给的切换阈值: Tool Definition 开始占上下文窗口 `1%—5%` 时, Client 可以考虑上渐进式发现.

通用 Agent 还能再往上一层, 渐进式连 Server:

1. 维护 Server Registry.
2. 只留少量 Always-On Server.
3. 按当前任务连相关 Server.
4. 在任务边界释放不再需要的 Server.

## 四、别让中间结果都进模型上下文

多个 Tool 串起来时, 传统 Agent Loop 会把每次 Tool Result 都塞回模型上下文.

比如:

```text
读取十万条日志
    ↓
模型过滤日志
    ↓
调用工单系统
```

那十万条日志其实只是在工具之间传递, 模型不需要逐条读.

复杂工具链可以上 Programmatic Tool Calling, 也就是 Code Mode:

1. 按 Tool Schema 生成类型化函数.
2. 模型生成一段调这些函数的代码.
3. 代码在无网络权限的 Sandbox 里执行.
4. Host 拦截函数调用, 转发到 MCP Server.
5. 只把最终摘要返给模型.

Tool Definition 和 Tool Result 的上下文占用能一起降下来.

但 Sandbox 必须: 禁止直接访问网络; 不暴露 Token 和 Credential; 限 CPU、内存、执行时间; 对每次 Tool Call 继续做授权判断; 验证并截断最终输出.

这条我在 [CPAT](https://github.com/TokenRollAI/CPAT) 里折腾过, 中间结果的上下文占用确实是长程任务里最肥的一块.

## 五、别把连接当 Session

新版是无状态协议.

Server 不能因为两次请求来自同一个 TCP 连接、同一个 STDIO 进程、同一个 SSE Stream、同一个 Worker 实例, 就认为它们属于同一个用户、会话或任务.

每个请求必须自带处理它所需的版本和 Capability 信息. 要跨请求存状态, 返显式 Handle.

比如:

```text
create_browser_context()
→ browser_context_id

open_page(browser_context_id, url)

click(browser_context_id, selector)

close_browser_context(browser_context_id)
```

Handle 设计要包含: 所有权绑定、生命周期、到期时间、权限范围、服务端校验、不可猜测性、过期后的可恢复错误.

千万别拿连接 ID、Worker ID 或内存对象地址当业务状态标识.

## 六、有副作用的 Tool 必须做幂等

这条是新版最容易被忽略的工程责任.

新版 Streamable HTTP **不支持 SSE Resume**. 连接断了, Client 必须用新的 JSON-RPC ID 重发请求.

所以创建订单、发邮件、扣款、发布版本、创建工单、删资源这类操作, 应用层必须实现:

```text
Idempotency Key
Request Deduplication
Operation Handle
Operation Status Query
```

不然会出现:

```text
Server 已执行成功
    ↓
Response 在网络中断时丢失
    ↓
Client 重试
    ↓
操作被执行两次
```

幂等键一般绑: 用户、Tool Name、关键参数、有效时间、业务操作类型.

无状态和重试是一起来的. 你享受了横向扩展, 就得自己收拾重复执行.

## 七、缓存、通知和 Prompt Cache 一起组合

Server 该做的: 为可缓存响应设合理的 `ttlMs`​; 按是否含用户数据设 `cacheScope`​; 保持 `tools/list`​ 返回顺序确定; 变了就发 `list_changed`.

Client 该做的: 缓存 Tool Definition; 收到 `list_changed` 立刻失效; 不缓存 MRTR Retry Result; 不同请求参数用不同 Cache Key.

官方特别提了一句: Server 以确定顺序返回 Tool, 能改善 Client Cache 和模型 Prompt Cache 的命中率.

渐进式加载 Tool 的时候还要注意别频繁改模型 Prompt 的前缀区域. 三个办法: 在 Cache Breakpoint 之后追加新 Tool; 用稳定的 `call_tool(name, arguments)` Meta Tool; 把 Server 的连接和断开限制在 Conversation Boundary.

## 八、MRTR / Progress / Tasks 分清场景

别用一个机制扛所有异步.

**普通 Request**:

```text
几秒内可以完成
不需要用户补充输入
```

**Progress**:

```text
请求仍然保持
需要展示执行进度
```

**MRTR**:

```text
当前调用缺少确认或额外输入
输入完成后继续同一语义操作
```

**Tasks**:

```text
请求需要持久化
可能长期运行
Client 需要稍后回来查询
```

**Subscription**:

```text
监听能力或数据变化
与某次具体 Tool Call 无关
```

分不清的后果很具体: 一个普通 Tool 变成难以恢复的伪后台任务, 断了就没了, 也查不到.

## 九、安全控制放在 Server 和 Host, 不是放在 Description

这条我想强调一下: 把安全约束写在 Tool Description 里等于没写. 那是给模型看的文本, 模型看不看、听不听, 你控制不了.

MCP Server 必须: 校验所有 Tool Input; 实现真实访问控制; 对 Tool 调用限流; 清理 Tool Output; 校验 Resource URI; 防路径穿越; 检查 Resource Permission.

MCP Host 应该: 敏感操作要用户确认; 调用前展示 Tool 和关键参数; 验证 Tool Result; 设超时; 记审计日志.

远程 Server 走 OAuth, 并遵循: Token Audience Validation、HTTPS、PKCE、Credential 与 Issuer 绑定、短生命周期 Access Token、Refresh Token Rotation、禁止 Token Passthrough.

Streamable HTTP Server 还必须校验 `Origin`​ Header 防 DNS Rebinding; 本地 HTTP Server 默认只绑 `127.0.0.1`​, 不要绑 `0.0.0.0`.

## 十、Capability Negotiation 和优雅降级

Client 不该假定 Server 支持 Resources、Prompts、Elicitation、List Changed、Tasks、MCP Apps.

Server 也不能依赖 Client 没声明的 Capability.

扩展能力要给降级路径:

```text
支持 MCP Apps
→ 返回交互式 UI

不支持 MCP Apps
→ 返回 Structured Content 或 Text
```

```text
支持 Tasks
→ 返回 Task Handle

不支持 Tasks
→ 使用同步执行、拆分操作或明确报错
```

另外现阶段还有个现实问题: 生态里同时活着两个时代.

- `2026-07-28` 及之后的 Modern Protocol.
- `2025-11-25` 及之前的 Initialize-Based Legacy Protocol.

要广泛兼容的实现, 得设计成 Dual-Era Client 或 Dual-Era Server. 这活儿不好玩, 但躲不掉.

## 十一、新项目别碰弃用能力

从 `2026-07-28` 开始, 这些别再用:

|弃用能力|替代方案|
| -----------------------------| --------------------------------------|
|Roots|Tool 参数、Resource URI、Server 配置|
|Sampling|Server 直接接入模型 Provider|
|Logging|STDERR 或 OpenTelemetry|
|HTTP+SSE|Streamable HTTP|
|Dynamic Client Registration|Client ID Metadata Documents|

还有至少十二个月的弃用窗口, 但它们已经不代表 MCP 的未来了.

**Sampling 的弃用最值得说.**

它说明 MCP 正在弱化"Server 借用 Client 的模型跑自己内部 Agent Loop"这个设计.

这个设计一开始就很奇怪: Server 想推理, 就把 Client 当通用推理代理用. 计费谁付? 上下文谁管? 模型选谁定?

现在的答案很干脆: Server 自己要推理就自己接 Provider API. 别蹭 Client 的模型.

我觉得这是对的. 这也进一步说明 MCP 在收缩自己的野心, 老老实实做接入层.

## 十二、用标准工具做测试和可观测

开发阶段用 MCP Inspector 测: Modern 与 Legacy 协议协商、Tool List、Tool Call、Resources、Prompts、Elicitation、Authentication、原始 JSON-RPC 流量、错误返回.

Inspector 是官方参考测试和调试工具, Web / CLI / TUI 都有.

生产环境通过 `_meta` 传 OpenTelemetry:

```text
traceparent
tracestate
baggage
```

新版规范已经定了这些 Trace Context 的传播约定.

日志里别记: Access Token、API Key、用户敏感参数、完整 Tool Result、Elicitation 里的用户隐私信息.

最后那条尤其容易翻车. Elicitation 收上来的东西, 天然就是用户最不想被记下来的东西.

# 生产架构

一个相对完整的生产级 MCP 架构:

```text
                         ┌─────────────────────┐
                         │      MCP Host       │
                         │                     │
User ── UI / Agent ─────▶│ Tool Discovery      │
                         │ Context Manager     │
                         │ Approval System     │
                         │ Sandbox / Code Mode │
                         └──────────┬──────────┘
                                    │
                            MCP Client Layer
                                    │
                         Streamable HTTP
                                    │
                    ┌───────────────▼──────────────┐
                    │ Gateway / Auth / Rate Limit  │
                    │ Route by Method / Tool Name  │
                    └───────────────┬──────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                MCP Server A   MCP Server B   MCP Server C
                  Tools          Resources       Tasks
                  Prompts        Search          Apps
                     │              │              │
                     └──────── External Systems ───┘
```

分工是这样: Host 控模型、上下文和用户体验; MCP Client 管协议和兼容性; Gateway 管认证、路由、限流、治理; Server 暴露领域能力; 状态通过业务 Handle 或 Tasks 显式表达; Tool Definition 按需进模型上下文; Tool 之间的大数据流尽量不经过模型.

那个 Gateway 层能画出来, 全靠前面那几行 HTTP header. 这就是为什么我说它是这版最实用的设计.

# 检查清单

## MCP Server

- [ ] 实现 `server/discover`
- [ ] 不依赖协议级 Session
- [ ] 每个 Tool 有明确输入 Schema
- [ ] 重要 Tool 提供 Output Schema
- [ ] 跨调用状态用显式 Handle
- [ ] 副作用 Tool 支持幂等或去重
- [ ] List Result 顺序稳定
- [ ] 正确设置 `ttlMs`​ 和 `cacheScope`
- [ ] 对输入、URI、权限和输出做校验
- [ ] 敏感操作支持用户确认
- [ ] 长任务用 Tasks, 不要长时间阻塞 Tool
- [ ] 用 Streamable HTTP, 不用旧 HTTP+SSE
- [ ] 用 OpenTelemetry 或 STDERR, 不新接 MCP Logging

## MCP Client / Host

- [ ] 支持协议版本协商
- [ ] 支持 Capability 和 Extension Negotiation
- [ ] 实现 Tool Definition Cache
- [ ] Tool 多时支持渐进式发现
- [ ] 处理中间结果时控制 Context 占用
- [ ] 敏感 Tool Call 显示参数并请求批准
- [ ] 正确处理 `complete`​ 和 `input_required`
- [ ] 断线后重建 Subscription
- [ ] 不盲目重试非幂等 Tool
- [ ] 校验 Tool Result 和 Output Schema
- [ ] 不信任 Tool Annotation
- [ ] 不把 Credential 暴露给模型或 Sandbox
- [ ] 用 Inspector 做协议测试

# 总结

MCP 的核心价值远超统一 Tool Calling.

它定义的是五类边界:

```text
能力如何被发现
上下文如何被读取
操作如何被执行
用户如何参与交互
远程能力如何安全运行
```

`2026-07-28` 把 MCP 重构成了:

```text
Stateless
+
HTTP Native
+
Cacheable
+
Routable
+
Extensible
```

这个版本最值得遵守的设计原则, 我排一下序:

1. 按控制权选 Tool / Resource / Prompt.
2. 用严格 Schema 做小而清晰的 Tool.
3. 用渐进式发现控制 Tool Definition 进上下文.
4. 用 Structured Content 和 Code Mode 控制中间结果.
5. 不依赖连接状态, 用显式 Handle.
6. 分清 MRTR / Progress / Tasks / Subscription.
7. 副作用操作做幂等.
8. 授权、确认、校验、限流放在真实执行边界.
9. 用 Capability Negotiation 做渐进增强.
10. 把 MCP 当能力接入层, 不当完整 Agent Runtime.

从这个角度看, MCP 已经从早期那个"桌面 AI 插件协议", 长成了一套面向云端 Agent、企业系统和大规模能力网络的标准接口.

我一年多前说 MCP 不是一个好方案, 也不是一个好消息. 现在回头看, 前半句我认输, 后半句我保留.

它确实变成了一个像样的协议. stateless、可缓存、可路由、可扩展, 这些是真本事, 不是包装.

但它依然只解决能力交换.

Agent 怎么理解任务、怎么组织工具、怎么控上下文、怎么持续跑下去——这些最难的部分, 一个都没被 MCP 解决, 也不该由它解决.

所以下一步的活儿还在 MCP 之上. 那才是有意思的地方.
