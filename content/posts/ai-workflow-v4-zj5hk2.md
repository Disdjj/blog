---
title: AI 工作流 V4
slug: ai-workflow-v4-zj5hk2
url: /post/ai-workflow-v4-zj5hk2.html
date: '2026-05-09 00:03:13+08:00'
lastmod: '2026-05-09 00:52:12+08:00'
toc: true
isCJKLanguage: true
---



# AI 工作流 V4

从 24 年开始,工作流写了三版:

[V1](https://blog.pdjjq.org/post/programmer-s-ai-workflow-dbpzt)

[V2](https://blog.pdjjq.org/post/programmer-s-ai-workflow-v2-z1rp29o)

[V3](https://blog.pdjjq.org/post/programmer-s-ai-workflow-v3-on4x8)

但是时代变化太快了, 太快了, 快到我完全想不到的程度, 回看上一篇就像是看类人猿

而且已经不能再写程序员的 AI 工作流, 因为我认为职业边界将进入彻底模糊的时代, 不会再有程序员了

# Coding

> 推荐且仅推荐 claude code 以及 codex cli

### Claude Code

Claude Code , 沟槽的 A÷, 但是架不住模型确实屌, 工具确实全面

开箱即用, 推荐, subagent 以及 agent teams 是很好的特性, plugin 生态也非常全面, 强烈推荐

### Codex Cli

功能上来说是低配版的 Claude Code, 但是模型非常强劲, 5.5 是我心中的最佳编程模型

除了上下文只有 258K, ☺️

# 并行工作

这里要特别强调并行工作的重要性, 某种意义上也是 agent 编排的起点

### superset.sh

[链接](https://superset.sh/)

![PixPin_2026-05-09_00-13-49](/images/PixPin_2026-05-09_00-13-49-20260509001351-sqrhca2.png)

自动开启 worktree, 自动的 setup 环境, 一个窗口多开 claude code, codex

这使得并行 10 个任务不是梦

### conductor

[链接](https://www.conductor.build/)

> 坦白说, superset 抄的 conductor, 但是功能相差无几的情况下, 我更喜欢开源项目

# Agent Tool

> 生产力 agent tool

### llmdoc

[链接](https://github.com/TokenRollAI/llmdoc)

☺️ 排在第一, 就是屌, doc for agent, 立刻安装

### superpowers

[链接](https://github.com/obra/superpowers)

现在有些臃肿了, 但是好用, 立刻安装

### happy code

[链接](https://github.com/slopus/happy)

远程也能操作 claude code / codex , 好用, 建议安装

### trellis

[链接](https://github.com/mindfold-ai/trellis)

大型项目推荐使用, 但是侵入性很强

llmdoc + superpower 的结合体

### pencil.dev

[链接](https://www.pencil.dev/)

做 UI 蛮好的, 起码能看的过去了

### mcporter

[链接](https://github.com/openclaw/mcporter)

强烈推荐!

装几个 mcp 可能带来 100 个 tools, 太臃肿了

放在 cli 里吧, cli 天生就是渐进式披露的, 你悟到了吗?

# 自主 Agent

这里只写两个, 部署一个吧, 提升幸福感

以后你会看到漫天的自主 agent 的

[openclaw](https://docs.openclaw.ai/)

[hermes-agent](https://hermes-agent.nousresearch.com/docs/zh-Hans/getting-started/quickstart)

# Agent 编排

我认为 Agent 的编排现在还不够成熟，原因主要有以下几点：

1. 使用体验非常奇怪  
   目前的编排工具要么需要一大堆极其琐碎的配置，要么就会出现各种乱七八糟的问题。比如 Agent 核心会突然断联，而断联后的恢复运行又是一个巨大的挑战，频繁的中断让人非常头疼。
2. 缺乏合理的任务拆解  
   我实际上认为，如果你需要用到 Agent 编排，那大概率是因为你面对的是一个巨大的任务。这种情况下，必须先进行充分且合理的任务拆解，在拆解逻辑成立的前提下，才谈得上编排。
3. 验证机制缺失  
   接下来是推进到 Agent 的验证，坦白讲，目前对于代码或程序产物的验证部分并没有被很好地解决。直到现在，AI 验证程序这件事依然众说纷纭，没有统一的标准或结果，甚至连生成一个基础的测试环境都非常麻烦。

所以在目前基础设施还不成熟的环境下，想要做好 Agent 的编排有点天方夜谭。

Cloud Code 的 Agent Team 实际上在解决 Agent 之间的通信问题，但是，Agent 的通信和 Agent 的编排完全是两码事。

所以这里就先简单放一个项目：

### ruflo

[链接](https://github.com/ruvnet/ruflo)

自己看吧, 一两句话说不明白

---

坦白说，从2024年7月到2025年7月，再到2026年的5月，我认为这个时代变化的速度太快了。快到我已经记不起来一两个月前的工作是什么样子，手写代码的能力下降得非常快。

我现在去考察一些候选人，做技术面试的时候，我已经完全放开了：

1. 我允许你使用 AI。
2. 我甚至鼓励你使用 AI 去解决一些开放性的问题，比如解决一个 GitHub issue 这样的问题。
3. 我认为抗拒使用 AI 的人是不行的。

一定要拥抱这种变化。只有这样，你才能够不成为原始人，不成为类人猿，不成为那种古老的东西。我觉得拥抱变化是一个人是否年轻的标志，不拥抱变化就会死亡。
