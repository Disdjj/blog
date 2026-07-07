---
title: 'Tager: Advanced Tools'
slug: takes-advanced-tools-1jurdg
url: /post/takes-advanced-tools-1jurdg.html
date: '2026-07-07 14:31:10+08:00'
lastmod: '2026-07-07 15:06:39+08:00'
toc: true
isCJKLanguage: true
---



# Tager: Advanced Tools

## 高阶工具调用能力：从“工具列表”到“工具基础设施”

当工具系统进入真实生产环境后，问题会继续扩大。工具不再只是几个简单的函数，而可能是几十甚至上千个 API、MCP Server、内部业务动作和数据查询能力。此时，工具调用面对的不再只是“如何调用一个工具”，而是以下几个更复杂的规模化问题：

1. **上下文限制**：工具太多，是否应该全部塞进上下文？
2. **延迟痛点**：工具参数很长，是否必须等完整 JSON 生成完才能开始处理？
3. **交互冗余**：多步工具调用是否一定要让模型每一步都重新采样一次？
4. **Token 消耗**：工具结果很大，是否应该全部回填到模型上下文？
5. **系统平衡**：工具调用的成本、延迟、准确率和可控性该如何平衡？

因此，高阶工具调用能力的本质，是​**把 Tools 从“静态函数列表”推进为“可搜索、可流式、可编程、可分层执行的工具基础设施”** 。

### 1. Tool Search：工具不再全部进入上下文，而是按需加载

早期工具调用的默认模式是静态注入：

**开发者提供全部工具定义 ➔ 模型在上下文中看到全部工具 ➔ 模型选择调用**

这个模式在工具数量少时很自然，但当工具数量增长（接入各类内部系统和 API）后，会遇到两大瓶颈：

- **上下文膨胀**：每个工具的名称、描述、参数结构等都会占用大量 Token。
- **准确率下降**：模型需要在大量相似工具之间做路由。Claude 官方明确指出，当工具数量超过 30–50 个时，模型选择的准确率会显著下降。

**Tool Search 的核心思想是“按需加载”：**

不要把所有工具定义提前塞进上下文。先让模型看到工具目录的索引层，当模型判断需要某类工具时，再进行搜索，并将新发现的工具动态注入到上下文窗口末尾。

目前主流厂商提供了不同层面的搜索实现：

- **OpenAI 的两种搜索机制**：

  - **Hosted Tool Search**​：候选工具在请求创建时已知，由 OpenAI 在服务端搜索并加载相关子集（通过设置 `defer_loading: true` 实现）。
  - **Client-executed Tool Search**​：模型发出 `tool_search_call`，由应用程序自己执行搜索并返回结果。适合工具权限依赖用户状态或业务系统状态的场景。
- **Claude 的内置搜索变体**（通常返回 3–5 个最相关工具）：

  - **Regex**：Claude 构造正则表达式模式搜索工具。
  - **BM25**：Claude 使用自然语言 Query 搜索工具。

 **💡 演进总结**

传统 Tools 是将定义全部进入上下文；而 Tool Search 则是按需进入上下文。工具系统从**静态 Prompt 注入**变成了​**动态能力发现**。

### 2. Fine-grained Tool Streaming：打破“等待完整 JSON”的延迟魔咒

传统的 Tool Calling 通常是原子式的，遵循严格的同步流程：

**模型生成调用 ➔ 完整 JSON 生成完毕 ➔ 服务端/SDK 校验 ➔ 应用收到参数 ➔ 工具开始执行**

对于短参数，这很合适，因为它保证了工具输入是完整的标准 JSON。但如果工具参数非常大（例如要求模型生成长文件、长代码或批量数据），等待完整 JSON 生成和校验会带来明显的首字节延迟（TTFB）。

**Fine-grained Tool Streaming（细粒度工具流）**  允许工具输入参数在未经过服务端完整 JSON 缓冲和校验的情况下，以流式（Delta）方式逐步到达客户端。

这本质上是在可靠性与低延迟之间做的工程取舍：

- **传统流式调用**：等完整 JSON 缓冲和验证后再交给应用。优点是结构可靠，缺点是大参数场景延迟高。
- **细粒度流式调用**​：参数边生成边流出。优点是工具可以更早开始处理数据，缺点是​**客户端必须在代码里自己处理不完整（Partial）或无效（Invalid）的 JSON 边界情况**。

 **💡 演进总结**

在细粒度流式调用下，Tools 开始向**实时数据通道**演进，而不仅是“请求-响应”式的单次函数调用。

### 3. Programmatic Tool Calling：让模型生成“调用工具的程序”

这是比普通工具调用更深远的架构改变。在多步任务中，传统的模式是：

**模型决定调用 A ➔ 应用执行 A 并回填结果 ➔ 模型决定调用 B ➔ 应用执行 B 并回填结果...**

如果一个任务需要 20 次工具调用，就会产生 20 次模型往返交互，带来巨大的延迟和 Token 成本。

**Programmatic Tool Calling（编程式工具调用）**  允许模型在一个安全的沙盒代码容器中编写 Python 代码，并在代码中以函数形式批量调用工具，最终只把有用的过滤结果送回模型上下文。

其执行流变成了：

**模型编写代码 ➔ 代码在沙盒中运行并调用工具 ➔ 中间结果在代码层被处理 ➔ 只有最终结果返回给模型**

这种机制非常适合以下复杂场景：

1. **Fan-out (扇出) 查询**：对 50 个员工或 100 条记录分别调用工具。
2. **大结果过滤**：工具返回大量数据，但只有少数记录与任务相关。
3. **批量聚合**：对多个工具结果做汇总、排序、统计。
4. **Agentic 检索**：反复搜索、过滤、再搜索，但不希望每一步都膨胀模型上下文。

 **💡 演进总结**

模型不再是每一步工具调用的直接决策者，而是生成一个“工具调用程序”。它相当于把​**微型 Agent 循环下沉到了代码执行环境**，极大地减轻了外层模型的推理负担。

### 4. 高阶能力横向对比

|<br />能力|<br />解决的核心问题|<br />关键机制|<br />适合场景|<br />主要代价|
| -----------------------------------| ---------------------------------------------------------------------| -----------------------------------------------------------------------| ---------------------------------------------------------------------| -----------------------------------------------------------------------------|
|<br />**Tool Search**|<br />工具太多，塞进上下文成本高、准确率下降|<br />工具索引、检索与按需加载|<br />大规模工具库、MCP 多服务器、企业内网|<br />需精心设计工具命名、描述与命名空间|
|<br />**Fine-grained Streaming**|<br />工具参数极大，等待完整 JSON 导致高延迟|<br />参数 Delta 流式输出，跳过服务端全量校验|<br />生成长文件/代码、大参数工具|<br />客户端必须编写逻辑处理残缺 JSON|
|<br />**Programmatic Calling**|<br />复杂任务往返多、上下文膨胀、结果冗余|<br />在沙盒环境中生成代码，由代码批量执行工具|<br />批处理、扇出查询、大结果过滤、复杂检索|<br />存在沙盒启动与代码执行开销，不适合简单串行任务|

### 5. 高阶能力对 Description 和 Schema 的新要求

这些高级能力进一步放大了“Schema 与 Description 是两类不同契约”这一结论。

在基础调用中，Description 主要帮助模型判断“是否调用”。但在 Tool Search 场景中，​**Description 变成了搜索索引的一部分**（不仅搜索工具名，还会搜索描述、参数名和参数描述）

因此，工具 Description 必须同时承担两层职责：

- **调用时语义**：帮助模型决定是否调用。
- **检索时语义**：帮助模型在庞大的目录中“搜”到该工具。

>  **❌ 糟糕的描述**：Get user data.
>
>  **✅ 优秀的描述**：Fetch a user's CRM profile by internal customer ID, including account status, plan, renewal date, and primary contact. Use this for customer-support or account-management questions. Do not use this for authentication or billing transactions.

同时，在编程式调用中，由于模型会在代码里反序列化和处理工具结果，​**Schema 的严谨性变得更加至关重要**。基础 Tools 只需要 Schema 保证“输入参数正确”；而高阶 Tools 还需要 Schema 和 Output Description 保证“工具结果能被程序化处理、搜索和组合”。

### 6. 总结：Tools 正在演化为“能力操作系统”

纵观整个结构化输出与工具调用的演进主线，这是一个能力不断递进的过程：

1. **JSON Object**​：让模型输出​**可解析**。
2. **JSON Schema**​：让模型输出​**可验证**。
3. **Structured Outputs**​：让 Schema 参与​**生成过程**。
4. **Tools**​：让模型生成​**结构化动作请求**。
5. **Tool Search**​：让模型在大规模目录中​**按需发现能力**。
6. **Fine-grained Streaming**​：让工具参数变为​**低延迟数据流**。
7. **Programmatic Calling**​：让模型生成程序，把多次工具交互​**下沉到代码沙盒**。
8. **Agent Loop**​：让模型在工具结果的反馈中​**持续决策**。

高阶工具调用并不是偏离主线，而是为了解决 Tools 进入生产环境后必然面临的三个规模化痛点：​**数量规模化、参数规模化、步骤规模化**​。最终，Tools 正在变成大模型的​**能力操作系统**：模型负责理解意图与编排，Runtime 基础设施负责检索、执行、流式传输与安全隔离。

### 相关文档与参考链接

- **[OpenAI: Tool Search](https://developers.openai.com/api/docs/guides/tools-tool-search)**

介绍 OpenAI 如何通过 `defer_loading` 以及服务端 (Hosted) / 客户端 (Client-executed) 搜索机制，解决大规模工具加载的上下文限制。

- **[Claude: Tool Search Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)**

探讨 Claude 的内置工具搜索机制（如 Regex 和 BM25），以及针对 50+ 工具目录如何构建健壮的检索链路。

- **[Claude: Fine-grained Tool Streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)**

说明如何跳过服务端完整 JSON 校验，通过解析 `input_json_delta` 直接处理工具的大参数输入，降低系统响应延迟。

- **[Claude: Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)**

详细解析如何在安全的 Python 沙盒容器中，让模型生成批量调用工具的代码，并通过 `allowed_callers` 字段控制工具的调用权限，大幅减少多步任务的 Token 消耗。
