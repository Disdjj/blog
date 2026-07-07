---
title: 'Tager: JsonOutput 到 Tools Intro'
slug: tager-jsonoutput-dao-tools-intro-sujla
url: /post/tager-jsonoutput-dao-tools-intro-sujla.html
date: '2026-07-07 14:30:02+08:00'
lastmod: '2026-07-07 15:06:14+08:00'
toc: true
isCJKLanguage: true
---



# Tager: JsonOutput 到 Tools Intro

# 从 JSON Object 到 Tools：大语言模型工程接口的演进

## 为什么需要结构化输出

OpenAI 文档中有一句适合作为本章开场的话：

> “JSON is one of the most widely used formats in the world for applications to exchange data.”

这句话的关键点是：JSON 不是为了大语言模型发明的，它本来就是现代软件系统之间交换数据的通用格式。Web API、数据库中间层、前后端通信、配置文件、日志系统、消息队列，都大量依赖 JSON。问题在于，大语言模型原本输出的是自然语言文本，而不是程序可以稳定消费的数据对象。

早期 LLM 应用的典型形态是：

```Plain
应用程序发送 prompt
        ↓
模型返回一段自然语言
        ↓
应用程序尝试解析这段自然语言
```

这在聊天场景中没有问题，但在工程系统中会很脆弱。因为下游程序真正需要的是字段、类型、枚举、数组、对象，而不是“看起来像答案”的文本。

例如一个信息抽取任务，用户希望从简历中抽取：

```JSON
{
  "name": "Alice",
  "email": "alice@example.com",
  "years_of_experience": 5,
  "skills": ["Python", "React", "SQL"]
}
```

如果模型返回：

```Plain
姓名是 Alice，邮箱是 alice@example.com，大概有 5 年经验，技能包括 Python、React 和 SQL。
```

人类当然能读懂，但程序不能稳定消费。程序要继续做正则、字符串切割、异常处理、补字段、类型转换。这样一来，LLM 的输出就没有真正进入软件系统的“类型世界”。

因此，结构化输出的第一层价值是：把模型输出从“人读的文本”转成“程序读的数据”。

OpenAI 官方文档对 Structured Outputs 的定义是：让模型生成始终符合开发者提供的 JSON Schema 的响应，从而避免遗漏必需字段或生成无效枚举值。它列出的优势包括类型安全、可程序化检测拒绝、更少依赖强提示词来维持格式一致性。

参考来源：[OpenAI Structured Outputs 文档](https://developers.openai.com/api/docs/guides/structured-outputs)

## 从 JSON Object 到 Tools 的完整演进图

可以把整条演进线压缩成七个阶段：

```Plain
阶段 1：Natural Language Output
  模型返回自由文本。
  适合聊天，不适合程序消费。

阶段 2：Prompt-only JSON
  用 prompt 要求模型输出 JSON。
  解决部分格式问题，但不稳定。

阶段 3：JSON Mode
  平台保证输出是 valid JSON。
  解决 parseability，但不保证业务 schema。

阶段 4：Structured Outputs / JSON Schema
  平台保证 schema adherence。
  输出成为类型安全的数据对象。

阶段 5：Tools / Function Calling
  模型不只是返回数据，而是请求外部动作。
  JSON Schema 成为函数参数契约。

阶段 6：ReAct-style Tool Use
  推理与行动交替。
  Tool result 成为 observation。

阶段 7：Agent Loop
  多轮感知、决策、工具调用、反馈和终止。
  系统从问答模型变成任务执行体。
```

这条路线可以用一句话概括：

```Plain
JSON Object 是数据格式。
JSON Schema 是数据契约。
Structured Outputs 是生成时结构保证。
Tools 是动作契约。
Agent Loop 是围绕动作契约展开的执行系统。
```

参考来源：[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)、[Gemini Structured Outputs vs Function Calling](https://ai.google.dev/gemini-api/docs/structured-output)、[ReAct 论文](https://arxiv.org/abs/2210.03629)

## 三类能力的边界对比

|能力|解决的问题|输出对象|是否执行外部动作|典型场景|
| --------------------------| --------------------------| ------------------------------| ---------------------| ----------------------------------------------|
|JSON Mode|保证输出是合法 JSON|JSON 文本|否|简单结构化返回|
|Structured Outputs|保证输出符合 JSON Schema|类型安全对象|否|信息抽取、分类、UI 生成、结构化报告|
|Tools / Function Calling|让模型请求外部能力|工具调用请求|是，由 runtime 执行|查数据库、搜索、代码执行、调用业务 API|
|Agent Loop|多步执行与反馈修正|多轮 tool call + tool result|是|复杂任务执行、自动化办公、代码修改、数据分析|

关键区别是：

```Plain
Structured Outputs:
  控制最终回答的形状。

Tools:
  控制模型请求动作的形状。

Agent Loop:
  控制动作、观察、再决策的过程。
```

参考来源：[Gemini Structured outputs vs function calling](https://ai.google.dev/gemini-api/docs/structured-output)、[OpenAI Structured Outputs：function calling vs response_format](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)

# HomeWork

1. 调用任意模型, 返回一个固定的Json Schema
2. 制作 Read / Write / Update / List 三个工具, 并且验证使用
3. 尝试基于以上四个工具, 实现一个最小版本的 Agent
