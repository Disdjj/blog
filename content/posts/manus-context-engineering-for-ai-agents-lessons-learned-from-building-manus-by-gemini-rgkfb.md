---
title: manus:AI代理的上下文工程：构建Manus的经验教训 (By Gemini)
slug: >-
  manus-context-engineering-for-ai-agents-lessons-learned-from-building-manus-by-gemini-rgkfb
url: >-
  /post/manus-context-engineering-for-ai-agents-lessons-learned-from-building-manus-by-gemini-rgkfb.html
date: '2025-07-21 22:58:27+08:00'
lastmod: '2025-11-17 23:05:11+08:00'
toc: true
isCJKLanguage: true
---



# manus:AI代理的上下文工程：构建Manus的经验教训 (By Gemini)

[原文链接](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)

这确实是一篇非常好的文章, 详细的内容我觉得各位可以自行去看原文, 原文的介绍已经非常详细了. 我就不再班门弄斧.

其中最吸引我的部分是 [遮蔽,而非移除](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus#:~:text=%E8%B7%AF%E7%94%B1%E8%AF%B7%E6%B1%82%E3%80%82-,%E9%81%AE%E8%94%BD%EF%BC%8C%E8%80%8C%E9%9D%9E%E7%A7%BB%E9%99%A4,-%E9%9A%8F%E7%9D%80%E4%BB%A3%E7%90%86%E8%83%BD%E5%8A%9B) 这一段

这篇文章也只会详细解析这部分.

#### 为什么是“遮蔽”，而不是“移除”？

在构建能执行复杂任务的 Agent 时，我们通常会为其配备多种工具（Tools/Functions）。一个直观的想法是，在任务的每一步，动态地给 Agent “装卸”工具——只提供当前步骤最可能用到的，移除那些无关的。但这会带来两个致命的问题：

1. **性能灾难（KV缓存失效）** ：大语言模型（LLM）的工具定义通常位于上下文的起始部分。在对话中途修改（增加或移除）这部分内容，会导致模型后续所有的注意力缓存（KV Cache）全部作废。这好比你正在读一本书，有人却替换了第一章，你不得不从头再读一遍才能理解后续内容，效率极低。
2. **逻辑混乱（模型困惑）** ：Agent 的记忆中可能还留存着上一步“调用了工具A”的记录，但你却在这一步把“工具A”的定义给移除了。当模型回顾上下文时，会发现一个它用过但现在却“不存在”的工具，这极易导致它逻辑错乱，产生错误的输出或幻觉。

“遮蔽”原则正是为了解决这个问题而生的。它的核心思想是：**工具的完整定义列表在整个任务周期中保持不变，我们只是在 Agent 做决策的瞬间，通过技术手段暂时“蒙住”它的眼睛，让它无法选择某些工具。**

这就像在你的书桌上处理项目：

- **移除**：相当于把一张写满笔记的纸扔进碎纸机，信息永久丢失。
- **遮蔽**：相当于把暂时不用的文件放进抽屉，桌面保持整洁，但需要时随时可以拿出来。

#### “遮蔽”的技术实现：API层面的约束

那么，这种优雅的“遮蔽”是如何实现的呢？幸运的是，主流的大模型提供商（OpenAI, Google, Anthropic）都在其 API 设计中为我们提供了实现这一模式的“武器”。它们将底层的 Logits 操作封装起来，提供了更高级、更易用的接口。

以下是三大厂商实现“遮蔽”模式的关键参数对比：

从上表可以看出，最标准、最通用的做法就是：**在每一次API调用时，根据 Agent 当前的状态，动态构建** **​`tools`​**​ **参数列表，只把你希望 Agent 考虑的工具放进去。**  而对于更精细的控制，各家则提供了不同的实现路径。

#### 实现技巧 1：利用命名约定

原文还提到了一个非常实用的技巧来简化遮蔽逻辑：**为工具名设置一致的前缀**。

例如，所有与浏览器相关的工具都以 `browser_`​ 开头 (`browser_search`​, `browser_click`​)，所有与命令行相关的工具都以 `shell_`​ 开头 (`shell_execute`)。

这样做的好处是，你可以非常容易地实现对一整类工具的“遮蔽”或“开放”。当你的 Agent 进入“网页浏览”状态时，你的代码逻辑可以简单地筛选出所有名字以 `browser_`​ 开头的工具，将它们填入 API 请求的 `tools` 参数中。

#### 实现技巧 2：利用响应预填充（Prefilling）进行强制引导

这是一个更精细、更强大的技巧，它直接作用于模型的生成过程。

**Anthropic Claude 的实现方式：** 正如您所指出的，Anthropic 官方文档明确支持通过 Prompt 结构来实现预填充。你只需在整个提示的末尾，提供 `Assistant` 角色的开头即可。

例如，要强制 Claude 开始调用浏览器工具：

```
Human: Please search for the weather in Paris.

Assistant: <function_calls><invoke><tool_name>browser_
```

当你把以上下文作为 Prompt 发送给 Claude 时，它唯一的选择就是继续补全 `browser_`​ 后面的部分（比如 `search</tool_name>...`），这就完美地实现了对其他所有工具和普通文本回复的“遮蔽”。

**开源模型的实现方式：** 在服务于开源模型的推理框架（如 TGI, vLLM）中，这个概念通常通过一个名为 `response_prefix` 的显式参数来实现，其效果与 Claude 的预填充机制异曲同工。
