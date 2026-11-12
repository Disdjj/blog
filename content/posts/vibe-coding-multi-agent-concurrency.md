---
title: 我的 Vibe Coding 并发方案：让 Agent 管理 Agent
slug: vibe-coding-multi-agent-concurrency
url: /post/vibe-coding-multi-agent-concurrency.html
date: '2026-11-13 01:02:00+08:00'
lastmod: '2026-11-13 01:02:00+08:00'
toc: false
isCJKLanguage: true
tags: ["AI", "AI编程", "Vibe Coding", "Agent", "工作流"]
---

最近不少朋友聊起 Vibe Coding 和多 Agent 并发，实际跑起来很容易变成自己同时盯着四五个终端来回切窗口——窗口开得越多，人反而越像救火客服。

我现在稳定跑下来的一套并发工作流很简单，核心是**人只跟一个 Master Agent 对话，让 Agent 去管理 Agent**：

1. **网页 Deep Research**：先在 ChatGPT / Claude / Gemini 网页端把外部方案和约束摸透，导出原始 `deep_research.md`。
2. **Master 协同收敛**：把原始调研交给单个 Master Agent，只跟它讨论核心取舍，由它生成并维护 `prd.md`、`decisions.md` 和 `dod.md`，不手写繁琐文档。
3. **模型分工与闭环验收**：Master 按本机可用工具和模型能力，在独立 Git Worktree 里并发拉起 Sub-Agent；常规分歧查文档自决，真缺口才升级找人拍板，最后统一按 `dod.md` 验收合并。

下面是用 Joplo 做的完整可交互演示，直接点播放即可：

{{< joplo
  src="/demos/vibe-coding-parallel/index.html"
  title="我的 Vibe Coding 并发方案：让 Agent 管理 Agent"
  caption="支持自动连播与语音旁白；随时暂停后可点击左侧栏的 Astra / Claude / Sol / Carbon / Kimi 切换查看对应终端，按 F 全屏。"
>}}
