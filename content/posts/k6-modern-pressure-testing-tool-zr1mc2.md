---
title: K6:现代的压力测试工具
slug: k6-modern-pressure-testing-tool-zr1mc2
url: /post/k6-modern-pressure-testing-tool-zr1mc2.html
date: '2024-11-30 13:03:49+08:00'
lastmod: '2025-11-17 23:02:07+08:00'
toc: true
isCJKLanguage: true
tags: ["k6", "压测", "工具", "性能"]
---



# K6:现代的压力测试工具

最近要做对线上做压力测试, 我向来是喜欢用locust的, 简单方便, 也有导出的Report

最近发现了一个使用起来更加方便的工具 [k6](https://k6.io/)

> [中文文档](https://grafana.org.cn/docs/k6/latest/)

# 压力测试是什么?

个人经验压力测试要有这么几点:

1. 足够强的并发量: 能够形成足够强的压力
2. 可以进入版本的脚本管理: 可以不依赖GUI也能够清晰的了解测试逻辑
3. 支持设置压力测试的Steps: service warmup, QPS曲线
4. 支持多阶段操作: 为了进行实际的业务请求, 会有一些前置的操作.
5. 美观的UI, Report导出

# K6的优点

1. 基于Go, 支持Js脚本:这两者决定了在网络请求这种重IO的操作中, 基本性能不会太差
2. 支持Scenario, 丰富的设置项, 轻松设置压力曲线
3. 一个
4. 自带Dashboard

# 竞品比较

笔者使用的压测工具不多

1. locust: UI丑, 但是简单易上手
2. go-stress-testing: 没有UI, 没有阶梯设置
3. jmeter: 太重

# 总结

我建议尝试k6替代掉之前的压测工具, 你需要一个更现代化, 更强大的工具.
