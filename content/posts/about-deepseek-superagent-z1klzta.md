---
title: About DeepSeek Super-agent
slug: about-deepseek-superagent-z1klzta
url: /post/about-deepseek-superagent-z1klzta.html
date: 2026-11-01 14:54:34--8:00
lastmod: 2026-11-03 18:16:38--8:00
toc: true
isCJKLanguage: true
---



# About DeepSeek Super-agent

> 有些失望, 我不觉得符合 DeepSeek 一贯的技术风采

DeepSeek 在2026.10.31发布的[这篇文章](https://mp.weixin.qq.com/s/zoS7GlReWPhfCjENGxXCdg) , 对应的 repo [在这里](https://github.com/deepseek-ai/dsh-superagent-prototype)

其中绝大部分的解决方案我是认可的, 但没有看到特别让人眼前一亮的东西, 更像是成熟的技术方案的整合, repo 的名字又是: "**[dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)**" 原型, 感觉非常的不舒服, 这里我讲一下我的看法, 大部分是批评

# ATTENTION IS ALL YOU NEED

我非常认可的部分是: 关心那些真正需要关心的事情, 合理的分配注意力

我现在通常使用 superset 10X 来和一个 master agent 合作, 让他来管理其他的 subagent 来实现高效的管理 agent

这里提到的 master agent 对应 Super-Agent 的 Router 层

但是我认为 Router 层的解决方案不够好, 原因是两个:

1. 如果把所有的信息抽象成 Event, 真正有价值的Event 通过 Thread 传递成为 Trigger, 那么最需要关心的事情是 怎么高速且廉价的过滤 Event, 怎么快速的处理 Event 成为 Trigger, 文章中对于后者的解决方式OK, 但是对于前者只靠程序化的处理我觉得不够好
2. Decision Model 非常适合成为 Router 的核心实现, 包括前置的 Filter / 分配任务 / 进去LLM 前的 Tag...

# 过度的渐进式暴露

![image](/images/image-20261102090537-hj761wh.png)

这本质上是在做过度的渐进式暴露, 而过度的渐进式暴露甚至可能会产生[负面效果](https://arxiv.org/abs/2607.17598?utm_source=chatgpt.com)

在使用 [llmdoc](https://github.com/TokenRollAI/llmdoc) 的过程中, V2 -> V3 之所要做演进就是因为 Context 组织不是越多越好, 而是对于解决问题提供更多的关联性

尤其是在有 Description 的情况下, 用一个额外的 gather(agent or decision)去做, 给 Session 一个干净的 init task 实际上会更有帮助

# 全双工交互对于LLM是假象

task 可以转为 Background, 但是Output 不可能 Background

如果对于 LLM 的返回速度总是有要求, Fork-Merge 可能会更适用

---

总评:

1. 一个成熟且优秀的技术方案和思路的整合
2. 但这不是我们对DeepSeek的期待和要求
