---
title: 'Tager: Context'
slug: tager-context-z1e7rai
url: /post/tager-context-z1e7rai.html
date: '2026-07-07 14:32:24+08:00'
lastmod: '2026-07-07 15:14:29+08:00'
toc: true
isCJKLanguage: true
---



# Tager: Context

# Context组成

|<br />上下文类型|<br />本文统一定义|
| -------------------------------------------------------| -------------------------------------------------------------------------------------------------------------------|
|<br />会话上下文|<br />单线程/单会话内随轮次累积的消息、工具调用、工具结果、临时状态|
|<br />短期工作记忆|<br />为当前任务保留的摘要、计划、whiteboard、scratchpad、thread state|
|<br />长期/情节记忆|<br />跨会话保存的、可再次检索的事实、经验、偏好、案例|
|<br />文件/工件上下文|<br />大文本、代码库、PDF、图像、二进制结果、生成物的外部存储与引用|
|<br />推理/思考状态|<br />模型在当前回合生成的 thinking / reasoning 痕迹及其可见性、可回传性、是否计入后续窗口|
|<br />工具 schema 与结果|<br />工具定义、参数 schema、tool\_use / tool\_result、引用与工件化结果|
|<br />KV-cache / prefix 上下文|<br />不直接属于“语义记忆”，但决定成本/TTFT 的稳定前缀与缓存命中|

一个重要的边界是：​**context window 不是长期存储**。Google ADK、Mem0 和 Manus 都在不同表述下强调了这一点：短期会话上下文只是“当前工作内存”，长期知识要么进入 MemoryService / memory layer，要么变成文件/工件，要么成为可再次检索的外存索引。

### Claude Code 为例

https://inspector.pdjjq.org/

# Prefix Cache

1. 成本, 1% \~ 10% input cache 成本
2. TTFT, 大幅降低
3. 前缀不变性, Always Append

> 平均输入与输出的token比例约为100:1。

# Context Floor

我个人会把 "满足 Agent 解决需求的 context 的丰富度" 称之为: Context Floor

1. 调用了多少工具
2. 占用了多少 Token
3. 关键信息的密度

现在让我们回过头来看, 一些经典的解决方案:

1. LSP MCP: 通过提升关键Symbol密度 + 大量的工具调用 实现快速到达context floor
2. ACE / RAG: 通过少量的工具调用 + 稀疏的关键信息密度, 很难保证信息的关联性和有效性
3. Agentic RAG: 让 Agent 做一次信息的搜集, 提供一份概要, 一般使用 SubAgent, 在 claude code 中的explorer就是承担了类似的作用, 虽然 subagent 执行任务可以保证 master agent 上下文足够干净, token 占用量也不高, 关键信息密度也很高, 但是耗时太久了 TTCR (Time to Context Floor)实在是难以忍受

# 为什么要降低 Context

https://github.com/chroma-core/context-rot

# 渐进式披露

Context 稀释: 高浓度稀释成低浓度

name -\> description -\> 完整内容 -\> reference/template ...

# Context 的趋势

1. 分层: Tools Description / 字段 Description / Memory / Role ...
2. 分模块: Skill / Command / Workflow
3. Context Compiler -\> Agent Context Control

---

![image](assets/image-20260707143347-c1bcw7w.png)

![image](assets/image-20260707143354-n9x2r6r.png)

![image](assets/image-20260707143400-58jpju3.png)

![image](assets/image-20260707143405-nxvk0bu.png)

Manus & Langchain: https://www.bilibili.com/video/BV168WbzZEYA

Manus Context Engineering 的经验: https://manus.im/zh-cn/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
