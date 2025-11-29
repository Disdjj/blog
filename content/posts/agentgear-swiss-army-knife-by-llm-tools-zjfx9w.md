---
title: 'agent-gear: LLM Tools 开发的瑞士军刀'
slug: agentgear-swiss-army-knife-by-llm-tools-zjfx9w
url: /post/agentgear-swiss-army-knife-by-llm-tools-zjfx9w.html
date: '2025-11-30 01:32:15+08:00'
lastmod: '2025-11-30 02:33:58+08:00'
tags:
  - llm工具开发
  - agent系统
  - rust-python集成
  - 文件系统优化
  - 性能提升
keywords: llm工具开发,agent系统,rust-python集成,文件系统优化,性能提升
description: >-
  agent-gear 是一个专为 LLM Tools 开发设计的高性能工具库，旨在解决 Agent 系统中文件系统操作重复实现的问题。作者在开发
  miniCC 时发现近一半代码用于处理文件系统，而现有方案（如 deepagents）实现较为粗糙。因此决定基于 Rust +
  Python（Pyo3）构建核心，通过内存文件树、FS Notify、ripgrep 和批量操作优化性能。尽管最终性能提升约 2-3
  倍（未达数量级），但成功封装了常用文件操作，并通过 AI 辅助完成了从规划、编码到部署的全流程。项目凸显了当前 AI
  时代“想法即实现”的趋势，并提醒应聚焦核心问题优化。
toc: true
isCJKLanguage: true
---



# agent-gear: LLM Tools 开发的瑞士军刀

​#LLM#​ #Agent#​ #AI#​ #Rust#​ #Python#

> [Repo](https://github.com/TokenRollAI/rs-agent-gear)
>
> [agent-gear在线文档](https://llmdoc-viewer.tokenroll.ai/TokenRollAI/rs-agent-gear)

# 背景

最近在开发[`minicc`](https://github.com/TokenRollAI/miniCC)​ , 在为minicc提供tools时, 发现一件怪事. 整个项目的有效代码 2千行, [tools](https://github.com/TokenRollAI/minicc/blob/main/minicc/tools.py)的实现竟然占了快一半.

为什么? 有一半的代码是在处理 filesystem

今天在查看[deepagents](https://github.com/langchain-ai/deepagents/blob/master/libs/deepagents/deepagents/backends/filesystem.py)的源码, 实现的也相当丑陋. 大量的使用了 os / shutil / glob这些标准库. 总给人一种裸奔的感觉.

直觉上觉得: 现在需要一个成熟的包库, 用来给Agnet System提供基本能力. 而不是让每个Agent系统都要手动写一遍tools, 这简直是一种折磨.

# Tools

LLM 或者说 Agent, 至少要有哪些工具?

1. TODO
2. AskUserQuestions
3. SubAgent
4. Net: WebSearch / WebFetch
5. FileSystem: Read / Write / Edit / Search(Grep) / Glob / List
6. ...

先列到这里, 这里我觉得应该能够看出来, 对于一个Agent, 或者说对于一个典型的Coding Agent系统来说.

FileSystem是最基本而且最重要的操作, 那我们就从这里开始

# 架构

如果追求简单, 我们可以直接放在一个python中, 糊上500行代码, 然后直接push pypi就好了

但是既然做这件事情, 不如做的出色一点, 比如说把性能做的好一些.

怎么把性能做的好呢? 别烧脑了, [问问gemini吧](https://gemini.google.com/app/4bed3596cc3d5b05)

最后我的解决思路是:

1. Pyo3 + Maturin: Rust 写核心代码, python封装
2. 内存文件树 + FS Notify: 把list/glob操作变成纯内存查找, 不经过OS
3. ripgrep + globset: 直接使用性能出色稳定的三方库
4. Batch: 提供batch操作, 少次多量的获取文件.

思路非常棒, 唯一的问题是: 我不会写Rust, 上一次写还是3年前, WTF?!

但是不要紧, 我们有伟大的Vibe Coding!

# 实现

1. 在Plan模式下, 把完整的需求发给Claude Code, 生成一份计划书.
2. Review Plan: 不错
3. 开始写: 撒泡尿, 回来review代码 (你又看不懂你Review你🐴呢)
4. 到Context限制了, 保存下进度, 保留TODO, 已实现的内容. 记录到`llmdoc`
5. /clear, 继续写
6. Claude code写完了, 写单元测试, 开始改bug
7. bug改完, 写benchmark, 开始提升性能
8. [性能不错](https://github.com/TokenRollAI/rs-agent-gear?tab=readme-ov-file#performance), 找codex + gemini 开始review实现, 然后狂改
9. 好, 提交到Pypi, 配置CICD
10. CI改了他妈的10轮, 终于跑通了, 我草这个世界.
11. 完成

最后性能平均只是提升了 2 -3 倍左右, 感觉有点低于预期, 不是说用Rust之后就秒天秒地吗? 我觉得至少应该有个数量级的提升吧. ☺️

python标准库的实现性能相当可以, 而且考虑到LLM的特性, Filesystem的交互并不是性能瓶颈, 但是无所谓, 写都已经写完了

一共用了多久呢? 写代码只用了30分钟, 调试/Debug/Perf 用来1个小时, 修复傻逼的github CI 用了一个半小时!

# 总结

1. 最底层的包库写完了, 接下来给minicc来个瘦身计划, 把tools的实现用agent-gear改一遍 , minicc的核心功能实现已经OK了, 接下里把边角料的 slash command / file import / TUI 美化 这些功能实现, 一个教学用的claude code基本就差不多了
2. 已经到了这样一个时代了: 你有点子, 那就意味着你实现了它, 想象力和视野可能是最重要的事情
3. 优化最核心的性能, 而不是优化边缘的性能, 除了带来虚假的满足感之外, 没有解决任何问题.
