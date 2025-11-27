---
title: 'BLOG迁移: 从Halo + CF Tunnel 到 Hugo + github + Cloudflare page'
slug: blog-migration-from-halo-cf-tunnel-to-hugo-github-cloudflare-page-drhlk
url: >-
  /post/blog-migration-from-halo-cf-tunnel-to-hugo-github-cloudflare-page-drhlk.html
date: '2025-11-25 01:03:22+08:00'
lastmod: '2025-11-28 00:39:58+08:00'
toc: true
isCJKLanguage: true
---



# BLOG迁移: 从Halo + CF Tunnel 到 Hugo + github + Cloudflare page

# 背景

前一段时间, 我的blog数据丢了

其实算不上彻底丢了, 原始的blog内容还存储在思源笔记上, 甚至发布记录都有, 所以本质上的数据确实没有丢

过去blog是用docker部署在我的ubuntu小主机上, 用cf tunnel暴露服务到公网. 但是那天晚上, 我失心疯一样想要重装系统.

于是, 所有的磁盘数据都清掉了.

等我反应过来在这个主机上还有没迁移完的数据的时候, 新版本的ubuntu在冲我笑.

# Halo + CF Tunnel

halo是一个好东西, 开箱即用, 功能丰富

但是太笨重了, 而且过去是部署在我的迷你主机 + cloudflare tunnel 暴露服务

好处是, 确实很方便

坏处是: 偶尔停一次电就无法访问了, cf tunnel 访问起来确实不够快.

在频繁的被提醒blog宕机之后, 我厌倦了重启halo + cf tunnel

# Hugo + Github + CF Page

我要用一个最简单的方式实现blog的部署

这一套方案应该是最简单的方案了.

在思源里写笔记, 持久化存储, 然后通过部署插件推送commit到github, CF中配置github连接, master改动自动打包部署, 渲染使用hugo + 主题插件.

当然了, 也会有很多人好奇: 这是不是不够先进?

坦白说, 确实. hugo确实是个老东西了. 但是我觉得无所谓.

因为够简单, 没有什么大的bug, 打包结果全部是静态资源扔在cf上

主题是基于[hugo-texify3](https://themes.gohugo.io/themes/hugo-texify3/) 用gemini + claude code 魔改的

目前移植过来运行了大概2周, 运行很稳定, 我还比较满意.
