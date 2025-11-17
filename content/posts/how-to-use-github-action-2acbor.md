---
title: 如何使用Github Action
slug: how-to-use-github-action-2acbor
url: /post/how-to-use-github-action-2acbor.html
date: '2025-08-09 12:20:47+08:00'
lastmod: '2025-11-17 23:05:55+08:00'
toc: true
isCJKLanguage: true
tags: ["GitHub", "CI/CD", "GitHubAction", "自动化"]
---



# 如何使用Github Action

# 为什么需要Github Action

本质上是CICD

1. Code Format
2. Bug Check (By LLM)
3. 密码泄露
4. 单元测试集成

但是因为Github的社区属性, 所以还有一些需要特别注意的东西:

1. Issue的处理: label, assign ...
2. PR Review: AI Check ...
3. Release发布
4. 文档更新发布

# 常用的Github Action

- [autofix.ci](https://autofix.ci/) 自动的执行Format并且提交
- [Auto-Release](https://github.com/marketplace/actions/gh-release) push tag之后自动发布release
- [secret检测](https://github.com/marketplace/actions/trufflehog-oss) 自动检测是否有泄露的密码/秘钥
- [Issue Labeler](https://github.com/marketplace/actions/ai-issue-labeler) 根据当前项目通过AI自动打label
- [PR Review](https://github.com/truongnh1992/gemini-ai-code-reviewer?tab=readme-ov-file) Gemini自动的Code Review

### Github APP

- [Gemini AI Assistant](https://github.com/marketplace/gemini-code-assist) Google官方出品, 目前免费
- [Codecov](https://github.com/marketplace/codecov) 代码覆盖率

# 怎么找到合适的Github Action

[官方MarketPlace](https://github.com/marketplace?category=ai-assisted&type=actions)

在官方的MarketPlace中找吧.

‍

‍

‍
