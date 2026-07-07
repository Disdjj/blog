---
title: 'Tager: 格式化输出'
slug: tager-formatted-output-z2frdhg
url: /post/tager-formatted-output-z2frdhg.html
date: '2026-07-07 14:30:41+08:00'
lastmod: '2026-07-07 15:06:22+08:00'
toc: true
isCJKLanguage: true
---



# Tager: 格式化输出

## 第一阶段：Prompt-only JSON

最早的做法不是 API 级能力，而是纯 prompt 约束。开发者会在 system prompt 或 user prompt 中写：

```Plain
请严格输出 JSON。
不要输出 Markdown。
不要解释。
不要添加额外文字。
必须包含 name、email、age 三个字段。
```

这种方式的本质是用自然语言约束自然语言模型。它在 demo 中通常有效，但在生产环境中不稳定。模型可能输出 Markdown code block：

```JSON
{
  "name": "Alice"
}
```

也可能在 JSON 前后添加解释

```JSON
下面是你要的 JSON：
{
  "name": "Alice"
}
```

还可能出现漏字段、字段类型错误、枚举值幻觉、数组结构不稳定、字符串转义错误等问题。

Prompt-only JSON 的问题在于，它只是软约束。模型知道你“希望”它输出 JSON，但推理过程本身没有被硬性限制。它仍然可以在任意位置输出任意 token。也就是说，JSON 在这个阶段只是一种格式建议，而不是协议。

这个阶段的典型工程补救包括：

```Plain
1. 尝试 JSON.parse
2. 如果失败，要求模型重试
3. 如果仍失败，使用正则或 JSON repair
4. 再用 schema validator 检查字段
5. 如果字段错误，再 retry
```

这套流程可以工作，但本质上是事后补救。模型先可能犯错，然后应用程序再修复。它没有从生成机制上阻止错误发生。

参考来源：[OpenAI Structured Outputs 对 JSON mode 与 Structured Outputs 的区分](https://developers.openai.com/api/docs/guides/structured-outputs)、[JSON Schema 入门文档](https://json-schema.org/learn/getting-started-step-by-step)

## 第二阶段：JSON Mode

JSON Mode 是 Prompt-only JSON 之后的一个关键进步。它不再完全依赖 prompt，而是让模型平台在输出层面保证结果是合法 JSON。

JSON Mode 解决的是：

```Plain
模型输出能不能被 JSON.parse 解析？
```

它不能完整解决的是：

```Plain
字段是否齐全？
字段类型是否正确？
枚举值是否有效？
是否添加了多余字段？
是否满足业务约束？
```

OpenAI 文档中明确区分了 JSON Mode 和 Structured Outputs：两者都能确保输出是 valid JSON，但只有 Structured Outputs 能确保输出遵循指定 schema。OpenAI 也建议在可用时优先使用 Structured Outputs，而不是 JSON Mode。

因此可以这样理解：

```Plain
Prompt-only JSON:
  希望模型输出 JSON，但不保证。

JSON Mode:
  保证输出是合法 JSON，但不保证符合业务结构。

Structured Outputs:
  保证输出是合法 JSON，并且符合开发者提供的 JSON Schema。
```

JSON Mode 是一个中间阶段。它让输出从“可能不可解析”变成“通常可解析”，但还没有把模型输出升级为真正的数据契约。

参考来源：[OpenAI Structured Outputs vs JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs)

## 第三阶段：JSON Schema 与 Structured Outputs

JSON Schema 的作用不是简单地告诉模型“请输出 JSON”，而是定义这个 JSON 应该长什么样。

例如：

```JSON
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["search", "reply"]
    },
    "query": {
      "type": "string"
    }
  },
  "required": ["action", "query"],
  "additionalProperties": false
}
```

这个 schema 传达了几个信息：

```Plain
输出必须是 object。
必须包含 action 和 query。
action 必须是 string。
action 只能是 search 或 reply。
query 必须是 string。
不能添加 schema 之外的字段。
```

JSON Schema 把 JSON Object 从“数据格式”提升为“数据契约”。这正是结构化输出真正有用的地方：应用程序不再只是拿到一个能 parse 的 JSON，而是拿到一个符合预期字段、类型和约束的数据对象。

JSON Schema 官方文档也说明，JSON Schema 是一套可以用于标注和验证 JSON 文档的词汇表。它可以描述 JSON 数据的结构、约束和类型。`properties`​ 用于定义对象字段，`required`​ 用于声明必需字段，`additionalProperties: false` 用于禁止额外字段。

参考来源：[JSON Schema 入门](https://json-schema.org/learn/getting-started-step-by-step)、[JSON Schema object / properties / required / additionalProperties](https://json-schema.org/understanding-json-schema/reference/object)

## `description` 的特殊位置：它不是硬约束，而是语义说明

在 JSON Schema 中，`description`​ 和 `title` 属于 annotation keywords，也就是注释型关键词。JSON Schema 官方文档明确说明，这类关键词不是用来做 validation 的，而是用来描述 schema 的含义。

也就是说：

```JSON
{
  "query": {
    "type": "string",
    "description": "The search query to send to the web search engine."
  }
}
```

这里的 `type: "string"` 是硬约束。它告诉 validator 或 constrained decoder：这个字段必须是字符串。

但 `description` 不是硬约束。它不会阻止模型输出某个字符串。它真正的作用是告诉模型：这个字段在语义上应该填什么。

这就是为什么 `description` 在 LLM 时代突然变得非常重要。传统程序读取 schema 时，主要关心的是类型、必填项、枚举、额外字段等机器可验证信息。但大语言模型读取 schema 时，还会利用字段名和 description 来理解任务意图。

因此可以把 schema 分成两层：

```Plain
结构层：
  type
  properties
  required
  enum
  items
  additionalProperties

语义层：
  name
  description
  field description
  examples
```

结构层负责“能不能填”，语义层负责“应该怎么理解”。

参考来源：[JSON Schema annotations](https://json-schema.org/understanding-json-schema/reference/annotations)、[OpenAI Function Calling function definition](https://developers.openai.com/api/docs/guides/function-calling)、[Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)

## Structured Outputs 的实现方式：Constrained Decoding

Structured Outputs 的关键实现思想通常是 constrained decoding，也叫 constrained sampling。它不是模型完整输出之后再接一个小模型修复 JSON，而是在模型生成每一个 token 时，根据 schema 判断哪些 token 仍然合法。

普通解码大致是：

```Plain
模型根据上下文预测下一个 token 的概率分布
        ↓
从整个词表中选择一个 token
        ↓
继续生成
```

Constrained decoding 则是：

```Plain
模型预测下一个 token 的概率分布
        ↓
Schema / grammar engine 判断当前状态下哪些 token 合法
        ↓
非法 token 被 mask，概率变成 0
        ↓
重新采样或选择下一个 token
        ↓
重复直到输出完成
```

OpenAI 在 Structured Outputs 技术说明中明确说，他们会把 JSON Schema 转换成 context-free grammar，推理引擎在每个 token 生成之后动态判断下一步哪些 token 合法，然后把非法 token 的概率降为 0。OpenAI 还说明，CFG 相比 FSM 或 regex 能表达更复杂的递归和嵌套结构。

这意味着 schema 不再只是事后验证器，而是变成了生成时约束器。

一句话概括：

```Plain
Structured Outputs 把 JSON Schema 从“模型说完以后检查对不对”，推进为“模型每说一个 token 时就限制它不能说错格式”。
```

但 constrained decoding 也有边界。它主要保证结构合法，不保证语义正确。例如 schema 能保证：

```JSON
{
  "city": "Paris"
}
```

中的 `city` 是字符串，但不能保证 Paris 就是用户真正想问的城市。事实正确性、业务正确性和用户意图匹配仍然依赖模型理解、上下文、工具结果以及应用侧校验。

参考来源：[OpenAI Structured Outputs 技术博客](https://openai.com/index/introducing-structured-outputs-in-the-api/)、[OpenAI Structured Outputs 文档](https://developers.openai.com/api/docs/guides/structured-outputs)

## 7. 主流厂商如何实现结构化输出

### 7.1 OpenAI

OpenAI 当前把结构化输出分为两类：

```Plain
1. response_format / text.format:
   控制模型最终响应的结构。

2. function calling / tools:
   控制模型调用工具时的参数结构。
```

OpenAI 文档明确建议：如果你是在连接模型到工具、函数、数据或系统能力，应使用 function calling；如果只是希望模型最终回答符合某个结构，应使用 structured response format。

OpenAI 还区分了 JSON Mode 和 Structured Outputs。JSON Mode 只保证合法 JSON，Structured Outputs 才保证 schema adherence。对于 strict mode，OpenAI 要求 function parameters 中每个 object 设置 `additionalProperties: false`，并要求 properties 中所有字段都被列入 required。

参考来源：[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI Function Calling strict mode](https://developers.openai.com/api/docs/guides/function-calling)

### 7.2 Anthropic Claude

Anthropic 的 Claude Tool Use 文档强调：Claude 会基于用户请求和工具 description 判断是否调用工具，然后返回一个结构化调用。客户端工具由应用程序执行，服务端工具由 Anthropic 执行。

Claude 文档还明确说明，工具 token 成本来自工具名称、description、schema、tool\_use blocks 和 tool\_result blocks。也就是说，工具定义并不是系统外部的隐藏元数据，而是会进入模型可见的上下文，并影响模型判断。

参考来源：[Anthropic Tool Use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)

### 7.3 Google Gemini

Gemini 文档同样区分了 Structured Outputs 和 Function Calling。Gemini 的 Structured Outputs 用于让模型最终响应遵循 JSON Schema；Function Calling 用于让模型在对话过程中请求外部函数执行真实动作。

Google 文档中明确写到：Structured Outputs 适合数据抽取、结构化分类和 agentic workflows；Function Calling 则让模型连接外部工具和 API，不再只是生成文本，而是决定何时调用函数并提供执行参数。

参考来源：[Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)、[Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling)
