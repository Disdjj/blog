---
title: 'Tager: Coding & Trending & Toolkit'
slug: taker-coding-zbuccu
url: /post/taker-coding-zbuccu.html
date: '2026-07-07 14:35:47+08:00'
lastmod: '2026-07-07 15:36:10+08:00'
toc: true
isCJKLanguage: true
---



# Tager: Coding & Trending & Toolkit

# Coding

### Research

做好充分的调研, 你可以使用 gemini / ChatGPT, 总是充分的了解一个领域和关联的知识, 获得更好的架构设计/准备

### SPEC: Architecture & Task & Vision

1. vision: 愿景, 项目解决什么问题
2. architecture: 架构设计, 总是选择现代的广泛使用的技术栈
3. task: 逐步的逼近实现

### Coding

- `/goal`​ `/plan`
- `subagnet`​ `workflow`​ `agent team`
- 易于验证的架构:

  - 充分的单元测试
  - 易于本地启动的测试环境: Dockerfile / Docker Compose
- UI

  - Pencil.dev
  - OpenDesign

### Verification

> https://github.com/microsoft/playwright-mcp
>
> https://github.com/mobile-dev-inc/maestro

- DB
- UI
- Feature
- Migration

### More Than Coding

1. 良好的审美
2. 合理的功能设计
3. 遥测: umaimi/ GA ...
4. 推广/运营/增长: ...

# Trending

1. Agent -\> Agents

   1. [Agent Team](https://code.claude.com/docs/en/agent-teams):  [实现分析](https://blog.pdjjq.org/post/research-on-claude-code-agent-teams-mechanism-17xegk)
   2. [Agent Workflow](https://code.claude.com/docs/en/workflows)
   3. Agent Infra
2. Local -\> Cloud
3. Coding -\> Building

   1. Idea
   2. Research
   3. Build
   4. Growth
4. Human First -\> Agent First

# Toolkit

### Coding

1. [Superset.sh](https://superset.sh/): 方便多开 Session
2. [Paseo](https://paseo.sh/): 移动端 + 多设备连接
3. [Xterminal](https://www.xterminal.cn/): SSH + VNC + 服务器管理
4. [cc-switch](https://github.com/farion1231/cc-switch/releases): 管理订阅源, 查看用量
5. [Ghostty](https://ghostty.org/): 高性能, 稳定, 可配置化的终端, 别再用默认的终端了
6. [Typeless](https://typeless.com/): AI语音输入法, 移动端我一般使用[豆包输入法](https://shurufa.doubao.com)
7. [ZCode](https://zcode.z.ai/): 智谱出品, codex app 平替, 强烈推荐

### 网络

1. [Tailscale](https://tailscale.com/): 构建安全的 P2P 个人网络
2. [reqable](https://reqable.com/zh-CN/): 网络抓包, 代理, 重写, 类比 charles
3. [bruno](https://www.usebruno.com/): 类比 Postman/APIPost, Git-Native, 支持版本管理

### 工作管理

1. [滴答清单](https://dida365.com/): 整理自己要做什么, 好用, 但是我懒得用
2. [Xmind](https://xmind.com/): 在产生思路, 架构设计之前, 手动的, 不要 AI 介入的做一遍
3. [Obsidian](https://obsidian.md/): 正在计划从 思源笔记 迁移到 obsidian, 笔记记录等等

### Agent

1. [inspector](https://inspector.pdjjq.org/): 拆解 claude 请求,分析模型特性变更
2. [pi](https://github.com/earendil-works/pi): 一个成熟的 Agent 框架
3. [pydantic-ai](https://pydantic.dev/docs/ai/overview/): 类型安全的LLM 框架, 推荐
4. [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python) / [OpenAI Agent SDK](https://github.com/openai/openai-agents-python): 通过 SDK 的方式替换掉本地 Claude code, codex cli, 快速构建原型
