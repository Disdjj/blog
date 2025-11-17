---
title: 'Claude MCP: 不是一个好方案也不是一个好消息'
slug: claude-mcp-not-a-good-solution-or-a-good-news-z2uwddj
url: /post/claude-mcp-not-a-good-solution-or-a-good-news-z2uwddj.html
date: '2024-11-26 23:01:25+08:00'
lastmod: '2025-11-17 23:02:02+08:00'
toc: true
isCJKLanguage: true
tags: ["Claude", "MCP", "AI", "思考"]
---



# Claude MCP: 不是一个好方案也不是一个好消息

**先说结论, 我认为MCP并不是一个好的解决方案**

MCP直觉上和Function Tool 以及 [ReAct](https://www.promptingguide.ai/techniques/react), [ToolUse](https://blog.pdjjq.org/archives/codeprompt03-tooluse-react-2gcmsu) 几乎是一致的:

1. 功能函数参数 -> 构建Prompt, Insert to Context
2. 功能函数调用 -> 通过ReAct等方式, 让LLM按照参数要求给出 参数列表(在Dify中, 其实是通过限制其输出为Json实现的, 其他的实现大同小异)
3. 功能函数实现 -> 网络/数据交互, 正常的程序函数

# 解决什么问题

本质上是为了解决: LLM和外界的交互:

1. 调用链长
2. 等待时间长
3. ReAct的上下文消耗

# 现在的解决方案是什么?

抽象出了三种主要的交互类型:

1. Prompt: 主要是作为Prompt模板
2. Tool: 可以被调用的函数
3. Resource: 各种可以被Parse为文本的资源

其中Prompt主要是为了Claude Desktop准备, 没有研究意义

Resource和Tool没有本质的区别, 其实最终都是函数调用.

在之前已经比较成熟的方案是什么? Dify/FastGPT/llamaindex/FuntionTool 本质上都是ReAct.

那么Claude有什么区别呢? 现在还没有进行抓包, 还不知道claude对于上下文的处理是不是还像ReAct那么丑陋, 需要巨大的上下文, 以及联系的请求.

所以我认为本质上MCP是提供了一个Proxy, 或者是SiderCar, 将函数定义和函数实现分开了.

LLM Client只和这个Proxy进行交互, Proxy根据LLM Client所需要的调用, 进行Remote Call

# 感想

MCP本质上只是一个工程优化的方案, 而且并不是一个美丽的工程优化方案

最暴力的情况下, 我甚至直接提供HTTP接口给LLM, 识别Json并进行调用, 这和MCP没有本质上的区别.

就现阶段而言, 我不认为MCP能够称之为是一个: `protocol`, 本质上就是Function Call  + Proxy

Claude还在发展自己的Desktop生态, 对于已经很久没有动静的产业届来说, 这不是一个好消息

当最顶级的LLM提供商都在想要发力应用的时候, 我们要认识到: 这不是一个好消息

不知道LLM的黄金时代, 是否已经到来? 希望还没有.
