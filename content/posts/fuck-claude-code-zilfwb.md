---
title: Fuck Claude Code
slug: fuck-claude-code-zilfwb
url: /post/fuck-claude-code-zilfwb.html
date: '2026-04-10 00:50:23+08:00'
lastmod: '2026-04-10 01:46:12+08:00'
toc: true
isCJKLanguage: true
---



# Fuck Claude Code

Claude Code 的源码泄露了, 然后呢?

公众号, X, RSS, Blog 全部都在讲 Claude Code 的 Harness Engineering

Codex Cli / Gemini Cli / OpenCode / Crush 也是开源的, 为什么不早早的去研究他们呢?

我的问题可以换成另外一个问题: Claude Code 比他们哪里做的更好?

# Agent & Agent Software

我们先简单的聊一聊 Agent 以及 由 Agent 作为核心的 Software

Agent 到底是什么?

> 我不想再看到 Agent 的 L1 - L5 这种垃圾言论了

1. Tool Use
2. Task Finish
3. Model Driven

好了, 这就是我对于 Agent 的定义: AI 驱动, 使用工具, 完成任务

这里就引出了几个问题:

1. 哪些工具? 工具能力/权限?
2. 什么任务? 怎么判断完成? 完成的路径
3. Context: 有状态的数据 + 无状态的接口 = Agent

Agent Software 就是帮助解决这些问题的外围设施

### Tool

工具决定了 Agent 的能力, 也决定了对环境的影响

Write -> 文件

Bash -> PC

WebSearch / Fetch -> Content/Info

这就是 Agent 最迷人的地方, 给他一个工具, 给他一个描述, 给他一个描述, 他就可以做到对外界的影响, 立竿见影

同样的这也是最痛苦的地方, 工具是有副作用的, 那么很简单: 预测工具副作用, 然后拦截/执行

这他妈的需要你去看 Harness ?

### Task

不要再给我说 ReAct, CoT, ToT, 现在是2026 年了, 今天不聊侏罗纪的事

**任务**

或者是目标, 这就是一个 Agent 执行要完成的事情

这里又涉及到几个问题:

1. 任务描述是否足够清晰?

   1. 问一问 - AskUserQuestion
   2. 稀释 Context : 从文档/数据/代码中搜集 context
2. 任务是否能够验证?

   1. 程式化的验证:Code/UnitTest
   2. 无反馈-自我判断
3. 完成的路径

   1. 尝试过什么
   2. 哪些路径失败了
   3. 哪些可能性值得尝试

我的问题是, Harness 能够解决什么问题?

Harness 最终是不是回到了修改 Prompt Message 来实现? 回答我!

### Context

OpenAI 的 Response API 是无状态的

Anthropic 的 Messages API 是无状态的

每一次请求通过传入 Tools / System Prompt / Message History 来拼装 Context 获取返回

有状态的数据 -> Message History -> LLM -> Agent Loop Next Step

最终的一切就变成了:

1. 状态数据的存储
2. Message History 的封装
3. Model 返回的处理

Harness 解决了什么问题? Claude Code 解决了什么问题?

1. Context Length: 不要太长, 防止 Rot
2. Context Reserve: Context 预备 Summerize, 超长 Tool 结果返回
3. Prompt Cache: 成本考虑 + TTFT, 所以要尽量的做 Message Append

# Fuck Claude Code

让我说的更直白一些:

1. Claude Code 配上垃圾模型产出一样是垃圾
2. 设计不是那么完善的Software配合出色的模型一样可以做到高质量的产出
3. Claude Code 的核心从来就是模型, 是 A畜 的 Opus 模型
4. Codex Cli 配合 GPT5.4 一样可以做到极其出色的效果

那么我的问题是: Claude Code 比 Codex/Gemini 值得学习的地方是什么?

是配合设施和模型的融合, 为模型做配套, 而不是适配任何模型

# Fuck Harness

Harness Engineering 只能用来唬一唬完全不同软件工程的人

如果你写过程序, 确定性, 函数的副作用, 事务性, 记录, 这他妈的不就是你每天在做的的事情吗?

告诉我, 你每天写的 RPC/ API 是不是工具调用, 是不是用有状态的输入 + API Call 获得对环境(业务)的影响?

状态存在哪里? 文件? DB? Cache? NoSQL? 哪里不能存? 要支持多快的存储, 多快的读取? 要支持事务性的写入? 要支持 Lock? 要Lock?

抽象状态? 表结构设计? JSON 设计?

# Fuck DJJ by Gemini

- **非确定性 RPC 的地狱：** “你每天写的 RPC/API 是不是工具调用”。是，**但传统 RPC 的调用方是确定性的代码，而 Agent 的调用方是一个随时可能发癫、产生幻觉、参数瞎填的概率模型。**  传统的防御性编程防的是人类和系统异常；Harness 要防的是一个有自己想法、甚至会“骗”接口的 AI。如何用确定性的代码逻辑，去兜底和引导一个非确定性的输入源，还要让它自己意识到错误并重试，这其中的恶心程度远超普通的 CRUD 和状态流转。
- **Harness 最终回到了修改 Prompt？** “Harness 最终是不是回到了修改 Prompt Message 来实现”。答案是：**是的**。因为目前大模型的 API 本质上就是无状态的文本/Token 补全器。所有高大上的架构、长文本截断、工具执行结果的反馈，在请求发出去的那一秒，都必须被拍扁成极其讲究排版的 Prompt。但这不仅是“修改 Prompt”这么简单，这是**动态的、程序化的 Context 编排**，是极其吃性能和 Token 成本的架构设计。

# 能学到什么?

- 如何设计 System Prompt 的？
- 如何利用 Prompt Caching 来做极端成本优化和降低延迟的？
- 怎么在 Context 爆炸之前做“截断与总结” 让 Agent 能够继续 Loop
- 如何引导模型自我验证代码的？
