---
title: 'Tager: Tools'
slug: taker-tools-zciolf
url: /post/taker-tools-zciolf.html
date: '2026-07-07 14:31:00+08:00'
lastmod: '2026-07-07 15:06:31+08:00'
toc: true
isCJKLanguage: true
---



# Tager: Tools

## 从 Structured Outputs 到 Tools：关键跃迁

Structured Outputs 和 Tools 都使用 JSON Schema，但它们的目的不同。

Structured Outputs 的目标是：

```Plain
让模型最终回答变成结构化数据。
```

Tools / Function Calling 的目标是：

```Plain
让模型生成一个结构化动作请求。
```

这两者之间有一个本质差异：

```Plain
Structured Outputs:
  模型输出的是结果。

Tools:
  模型输出的是请求。
```

例如 Structured Outputs 可能返回：

```JSON
{
  "intent": "check_weather",
  "city": "Paris"
}
```

而 Tools 可能返回：

```JSON
{
  "tool": "get_weather",
  "arguments": {
    "location": "Paris"
  }
}
```

前者是给应用程序消费的结构化答案。后者是让应用程序执行的结构化动作。

OpenAI 官方文档把 tool call 描述为模型在判断需要使用某个可用工具后生成的一种特殊响应。应用程序收到 tool call 后，需要执行对应代码，再把 tool output 送回模型。Google 文档也明确说，模型不会自己执行函数，执行函数是应用程序的责任。Anthropic 也强调：client tools 在应用程序侧运行，Claude 返回 `tool_use`​，应用程序执行后再返回 `tool_result`。

因此，Tools 的本质不是“更复杂的 JSON 输出”，而是把模型输出变成了软件系统中的动作接口。

参考来源：[OpenAI Function Calling flow](https://developers.openai.com/api/docs/guides/function-calling)、[Gemini Function Calling flow](https://ai.google.dev/gemini-api/docs/function-calling)、[Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)

## Tool Definition 的组成

现代主流厂商的工具定义通常包含以下字段：

```Plain
name:
  工具名称，模型用它来标识要调用哪个工具。

description:
  工具语义，告诉模型这个工具做什么、什么时候用、什么时候不用。

parameters / input_schema:
  工具输入参数的 JSON Schema。

strict:
  是否要求工具调用参数严格符合 schema。
```

OpenAI 文档中对 function definition 的字段解释非常清楚：

```Plain
type:
  通常是 function。

name:
  函数名称。

description:
  何时以及如何使用这个函数。

parameters:
  用 JSON Schema 定义函数输入参数。

strict:
  是否强制函数调用遵循 schema。
```

这里的关键是：Tools 把 JSON Schema 从“输出格式约束”升级成了“函数参数契约”。这意味着模型不只是返回数据，而是在生成一次类似 RPC / API call 的请求。

传统 API 调用中，调用者是程序员写的代码：

```Plain
app.call("get_weather", { location: "Paris" })
```

Tools 中，调用者变成了模型：

```Plain
model decides:
  call get_weather(location="Paris")
```

运行时仍然由应用程序或平台执行真正的函数。模型只是生成调用请求，不直接拥有执行权限。

参考来源：[OpenAI Function Calling - Defining functions](https://developers.openai.com/api/docs/guides/function-calling)、[Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)

## 为什么 Tools 特别需要 Description

在普通 JSON Schema 中，description 是注释。在 Tools 中，description 变成了工具路由的重要语义信号。

考虑两个工具：

```JSON
{
  "name": "search_web",
  "description": "Search public web pages for current or factual information."
}
```

```JSON
{
  "name": "search_docs",
  "description": "Search internal company documents and uploaded files."
}
```

它们的参数 schema 可能完全一样：

```JSON
{
  "query": {
    "type": "string"
  }
}
```

如果只有 schema，模型只能看到两个工具都需要一个字符串 query。它无法稳定判断：

```Plain
什么时候查公开网页？
什么时候查内部文档？
什么时候两个都不该查？
```

description 提供的就是这种语义边界。

可以用一句话概括：

```Plain
Schema 约束“参数长什么样”。
Description 解释“这个工具是什么意思、什么时候应该用、什么时候不应该用”。
```

这也是为什么工具调用中 description 的质量会直接影响模型表现。一个模糊的 description 会导致误调用、漏调用、参数错配、工具竞争；一个清晰的 description 则可以帮助模型做更稳定的 tool routing。

好的 tool description 通常应包含：

```Plain
1. 工具能做什么
2. 工具不能做什么
3. 什么时候应该调用
4. 什么时候不应该调用
5. 参数含义
6. 返回值大致是什么
7. 与相似工具的区别
```

例如：

```JSON
{
  "name": "search_web",
  "description": "Search public web pages for current, factual, or time-sensitive information. Use this when the answer may have changed recently. Do not use it for private user files or internal company documents."
}
```

这个 description 比简单写成 “Search the web” 更有用，因为它明确了触发条件和排除条件。

参考来源：[OpenAI Function Calling function fields](https://developers.openai.com/api/docs/guides/function-calling)、[Anthropic Tool Use：工具调用依赖用户请求和 tool description](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[JSON Schema annotations](https://json-schema.org/understanding-json-schema/reference/annotations)

## Tools 与 System Prompt、User Message 的关系

理解 Tools 时，必须把它放回完整上下文结构中：

```Plain
System Prompt:
  定义模型的全局行为、边界、优先级、身份和策略。

User Message:
  定义当前任务、当前问题、当前自然语言意图。

Tools:
  定义模型可请求的外部能力。

Tool Description:
  定义每个工具的语义边界与触发条件。

JSON Schema:
  定义工具参数的结构与类型。

Tool Result:
  定义外部执行后的 observation，供模型继续使用。
```

可以进一步拆成三层：

```Plain
全局策略：
  System Prompt

当前任务：
  User Message / Conversation Context

外部能力：
  Tools / Description / Schema
```

System Prompt 可以告诉模型整体策略，例如：

```Plain
当用户询问可能变化的信息时，优先使用 web_search。
不要在没有用户确认的情况下发送邮件或下单。
如果工具结果和模型记忆冲突，以工具结果为准。
```

User Message 提供当前任务，例如：

```Plain
帮我查一下巴黎今天的天气。
```

Tools 提供可用能力，例如：

```JSON
{
  "name": "get_weather",
  "description": "Get current weather for a given city.",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string"
      }
    },
    "required": ["location"]
  }
}
```

模型综合三者后决定是否调用工具。如果调用工具，它生成 tool call；运行时执行工具；工具结果再被放回上下文；模型基于新上下文继续生成最终答案。

Anthropic 文档明确说，Claude 是否调用工具可以通过 system prompt 调整。OpenAI 文档也说明，函数定义会被注入到模型上下文中，因此工具名称、description 和 schema 都会消耗 input token。

参考来源：[Anthropic Tool Use：system prompt 可影响工具调用边界](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[OpenAI Function Calling：工具定义注入上下文并计入 token](https://developers.openai.com/api/docs/guides/function-calling)

## Tools 的完整执行流

一个标准的 tool calling 流程可以写成：

```Plain
1. 应用程序向模型发送 user message，同时提供 tools 定义。
2. 模型判断是否需要调用某个工具。
3. 如果需要，模型返回 tool call。
4. 应用程序解析 tool call，并执行真实函数。
5. 应用程序把 tool result 送回模型。
6. 模型基于 tool result 生成最终回答，或者继续请求更多工具。
```

以天气查询为例：

```Plain
User:
  What is the weather in Paris?

Model:
  tool_call get_weather({ "location": "Paris" })

Runtime:
  调用天气 API

Tool Result:
  { "temperature": 25, "unit": "C" }

Model:
  The weather in Paris is 25°C.
```

这个流程说明一个关键事实：模型并不直接执行工具。模型只生成结构化调用请求。真正的执行发生在应用程序或平台 runtime 中。

这就是 Tools 的安全边界。工具是否真的能发邮件、下单、修改数据库、运行代码，不由模型自身决定，而由 runtime 的权限控制、执行逻辑和审批机制决定。

参考来源：[OpenAI Tool Calling Flow](https://developers.openai.com/api/docs/guides/function-calling)、[Anthropic Tool Use：client tools 与 server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[Gemini Function Calling：模型不执行函数，应用负责执行](https://ai.google.dev/gemini-api/docs/function-calling)
