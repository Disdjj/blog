---
title: 程序员的AI工作流 v3
slug: programmer-s-ai-workflow-v3-on4x8
url: /post/programmer-s-ai-workflow-v3-on4x8.html
date: '2025-07-08 21:40:45+08:00'
lastmod: '2025-11-17 23:04:52+08:00'
toc: true
isCJKLanguage: true
tags: ["AI", "工作流", "编程", "AIDE"]
---



# 程序员的AI工作流 v3

> 快一年过去了, 本文的前两篇: [v1](https://blog.pdjjq.org/archives/programmer-s-ai-workflow-dbpzt) [v2](https://blog.pdjjq.org/archives/wei-ming-ming-wen-zhang)已经显得有些过时了, 本文介绍在2025年中, 我的工作流

# 什么是编程效率

我始终认为编程效率这件事情的前提是: 准确

准确意味着:

1. 你知道自己要完成什么
2. 离完成还差什么

在2025年, 我们谈论编程效率时, 你必须提及AI. AI的出现是对于**编程**最大的颠覆.

为什么? 大模型以每秒40个Token的速度写代码, 一分钟的产出量接近人类一天.

我自己已经有将近60%的代码是由AI编写的, 当有这么高的比例时, 你需要思考的事情就变成了: 怎么让AI写出更好的代码.

# AIDE

IDE已经不再是时髦的东西了, AIDE才是你需要的工具

或者说集成开发环境(Integrated Development Environment)的需求已经不是最重要的, AI 集成开发环境才是你需要的.

如果你不相信这件事情: 请看Jetbrains现在半死不活的样子吧.

## Augment Code

[官网](https://www.augmentcode.com/)

我非常纠结于claude-code以及 Augment Code 到底谁应该排在第一?

最后我给了Augment Code. 为什么? Context Engine实在是太牛逼了, 谁用谁知道.

优点:

1. **T0且没有T1的, 极其出色的上下文组织能力, 几乎无痛接入你的工作流**
2. 插件形式存在, 不需要你在下一个劣质的Vscode发行版

缺点:

1. 昂贵的价格:50$
2. 不稳定的链接, 经常需要重试

## Cursor

[官网](https://cursor.com/en)

如果是三个月前的Cursor, 我会毫不犹豫的给到第一, 但是现在我甚至考虑将其踢出行列

1. 吝啬的上下文
2. 花里胡哨, 但是不实用的功能
3. 难以理解的计价

## Windsurf

[官网](https://windsurf.com/)

从codium我就开始关注了, 直到Windsurf惊艳的出现

直到openai收购前, 我都认为他天下第一:

1. 慷慨的上下文
2. MCP的高优支持
3. 几乎完美的AIDE的能力

无法使用Claude4, 以及卖身closeAI是令人难以接受的

# AI in CLI

我实际上是反命令行主义者

哪怕是现在的TUI, 我觉得也是狗屎一坨, 但是架不住直观, 高效.

怎么使用CLI?

1. git操作
2. 文件系统的批操作
3. 问题排查
4. 任意可以运行命令行的事情

## Claude Code

[链接](https://github.com/anthropics/claude-code)

没有任何异议的强大

但是他的强大是基于**过量的上下文**

唯一的问题是:贵!

## Gemini Cli

[链接](https://github.com/google-gemini/gemini-cli)

我们必须承认: Gemini 2.5 Pro 就是现在最好的通用大模型.

1. 大参数模型带来的从容的智慧, 不像O系列模型靠长推理榨干小模型的所有智能
2. 极为出色的工具调用能力, 能够充当任何Agent系统的核心驱动模型
3. 合理而且逻辑缜密的推理
4. 1M上下文

基于以上, Gemini Cli哪怕是狗来写都没问题.

# Learning

程序员嘛, 怎么少的了学习呢?

## Cherry Studio + 思源笔记

小黄金搭档, 将关键的和AI的对话记录一键导出到思源笔记中

做持久的记录, 谁用谁知道. 不详细的介绍了, 

## Gemini DeepResearch

[官网](https://gemini.google.com/app)

如果你想对于任何一个领域做深入的分析, 你都应该使用它

如果你想要任何技术调研, 你都应该先使用它

如果你想要做任何**深入**的事情, 请立刻使用它!

## NotebookLM

[官网](https://notebooklm.google.com/)

Chat With Your NoteBook

就这么简单, 如果你想要深度的学习, 没有什么好说的, 用吧.

## Folo

[链接](https://github.com/RSSNext/Folo)

用它来获取最新的信息

然后内化为你自己的观点

# CI/CD

## coderabbit.ai

[链接](https://www.coderabbit.ai/)

自动化的AI Code Review

## autofix.ci

[链接](https://autofix.ci/)

自动化的code lint/format
