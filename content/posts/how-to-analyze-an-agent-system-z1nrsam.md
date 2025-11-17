---
title: 如何分析一个Agent系统
slug: how-to-analyze-an-agent-system-z1nrsam
url: /post/how-to-analyze-an-agent-system-z1nrsam.html
date: '2025-07-09 11:24:11+08:00'
lastmod: '2025-11-17 23:04:58+08:00'
toc: true
isCJKLanguage: true
---



# 如何分析一个Agent系统

我们可以认为Agent系统的最核心:

1. (WHAT) Prompt, 要解决什么问题
2. (HOW) Tools/MCP, 用什么样的方式解决问题
3. (WHO) 工作流/Multi-Agent, 谁来解决问题

在此之外, 还有一些次核心的问题:

1. Agent框架: 别他妈的用langchain了, 快去用pydantic-ai
2. output-format: 是否有对于输出做一些格式化的处理, 统一为json? xml?
3. 人机交互: 人类介入是何时发生的? 怎么发生的? 或者说: 人类怎么使用这套系统?
4. 任务并行化: 是否有对任务执行做并行化的加速处理

‍
