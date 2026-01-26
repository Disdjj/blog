---
title: llmdoc viewer
slug: llmdoc-viewer-scqzo
url: /post/llmdoc-viewer-scqzo.html
date: '2026-01-26 23:39:44+08:00'
lastmod: '2026-01-27 00:15:11+08:00'
tags:
  - llmdoc
  - 文档系统
  - ai编程
  - 开源工具
  - 代码文档
keywords: llmdoc,文档系统,ai编程,开源工具,代码文档
description: >-
  本文介绍了llmdoc
  viewer工具，它是一个将llmdoc（专为AI设计的代码文档格式）转换为可读文档系统的适配工具。文章回顾了llmdoc的设计初衷，强调其结构对人同样清晰易读。llmdoc
  viewer项目完全开源，无需服务端存储，部署在Cloudflare
  Pages上，允许用户通过输入GitHub仓库链接（如“Disdjj/llmdoc-viewer”）在线查看格式化后的文档。示例网站已上线，展示了该工具如何将llmdoc转化为直观的文档界面，便于开发者阅读和理解项目代码。
toc: true
isCJKLanguage: true
---



在之前的一个[帖子](https://linux.do/t/topic/1508439)以及[博客](https://blog.pdjjq.org/post/llmdoc-solving-the-last-100-meters-of-ai-coding-z2tuegp.html)中, 已经比较系统的讲述了llmdoc的诞生以及设计思路

也收到了很多人的支持和鼓励, 让我觉得我的工作很有价值

今天再给大家介绍下, 一个适配的工具, 把llmdoc直接转为可读的文档系统

### llmdoc viewer

repo地址: [https://github.com/Disdjj/llmdoc-viewer](https://github.com/Disdjj/llmdoc-viewer)

在线访问: [https://llmdoc.tokenroll.ai/](https://llmdoc.tokenroll.ai/)

示例: [https://llmdoc.tokenroll.ai/Disdjj/llmdoc-viewer](https://llmdoc.tokenroll.ai/Disdjj/llmdoc-viewer)

![PixPin_2026-01-26_23-55-02](/images/PixPin_2026-01-26_23-55-02-20260126235503-cxo83c2.png)

![PixPin_2026-01-26_23-55-11](/images/PixPin_2026-01-26_23-55-11-20260126235517-ib779mj.png)

### 目的

启动这个项目实在比较久之前了, 当时的目的是发现llmdoc虽然是给llm看的, 但是在llmdoc的设计之处, 是非常强调文档架构的合理性以及可读性

所以, 后面会发现, 如果把`llmdoc`拿出来作为文档系统也远超 90% 开源项目的文档建设

这也是一个比较惊喜的发现: 至少在2026年, 人能够非常好理解的结构, 对于AI来说是更好理解的

### 实现

1. 完全没有服务端存储, 部署在cloud flare pages上
2. 项目代码完全公开, 任何人都可以贡献
3. 目前只能获取开源项目的llmdoc

### 使用方式

你可以自部署或者使用我已经部署的pages

##### 访问主页

> [https://llmdoc.tokenroll.ai/](https://llmdoc.tokenroll.ai/)

![PixPin_2026-01-26_23-58-56](/images/PixPin_2026-01-26_23-58-56-20260126235857-n3f890v.png)

##### 输入repo链接

> 例如:
>
> 1. Disdjj/llmdoc-viewer
> 2. https://github.com/Disdjj/llmdoc-viewer

然后就可以开始愉快的看文档了

![PixPin_2026-01-26_23-59-46](/images/PixPin_2026-01-26_23-59-46-20260126235947-jfr5uja.png)

![PixPin_2026-01-27_00-00-03](/images/PixPin_2026-01-27_00-00-03-20260127000005-c6g9que.png)
