---
title: Cheap Context and Expensive Context
slug: cheap-context-and-expensive-context-z1nszbd
url: /post/cheap-context-and-expensive-context-z1nszbd.html
date: '2025-10-14 22:37:45+08:00'
lastmod: '2025-11-17 23:06:23+08:00'
toc: true
isCJKLanguage: true
---



# Cheap Context and Expensive Context

[Repo](https://github.com/TokenRollAI/cc-plugin)

# Cheap Context

SubAgent的Context是廉价的而且是一次性的

或者可以称之为 `intern context` 像实习生一样非常的廉价, 执行一次性任务, 而且受限于传入上下文的限制, 显得有些笨

在这种执行环境受限的情况下, 应该用: 明确的任务划分+明确的输出 + 廉价的上下文(廉价模型)

# Expensive Context

主Agent的Context是昂贵的:

1. 一旦压缩一定会出现执行漂移.
2. 高性能大模型昂贵的价格

## 主Agent

1. 负责调度的Agent
2. 负责任务解决的Agent
3. 负责核心输出的Agent

# 体验一下

在claude中

```
# 添加 TokenRoll 插件市场
/plugin marketplace add https://github.com/TokenRollAI/cc-plugin

# 下载tr插件
/plugin install tr@cc-plugin


# 强调使用bg-worker
# Always consider use bg-worker to solve simple task
```

# Solution

在[cc-plugin](https://github.com/TokenRollAI/cc-plugin)的bg-worker中, 解决方案十分粗暴, 毫无技术含量.

SubAgent + 明确的任务划分+明确的输出 + 廉价的上下文 来换取 主Agent上下文的紧凑 + 总成本的降低

## 效果

> 使用的Repo: https://github.com/zeromicro/go-zero  
> 需求: 告诉我这个项目的结构如何?

### 省流

> Context 和 Cost 节省效果明显

```
normal:    27.4k    $0.1304
bg-worker: 16.2k    $0.0867
```

## 发展方向

并发的使用廉价模型SubAgent 为 主Agent提供紧凑高密度上下文  
主Agent的作用: 任务划分/总结/判断 + 核心内容输出

# 实验对比

### 1. 不使用bg-worker

```

 ▐▛███▜▌   Claude Code v2.0.14
▝▜█████▛▘  Sonnet 4.5 · API Usage Billing
  ▘▘ ▝▝    /home/djj/code/go-zero

> 告诉我这个项目的结构如何? do not use bg-worker / scout agent

● 我来帮你分析这个项目的结构。让我先查看项目的根目录结构。

● Bash(ls -la /home/djj/code/go-zero)
  ⎿  total 156
     drwxr-xr-x 12 djj djj  4096 Oct 13 22:19 .
     drwxr-xr-x 17 djj djj  4096 Oct 13 21:17 ..
     … +22 lines (ctrl+o to expand)

● Bash(find /home/djj/code/go-zero -maxdepth 1 -type d | head -20)
  ⎿  /home/djj/code/go-zero
     /home/djj/code/go-zero/gateway
     /home/djj/code/go-zero/internal
     … +8 lines (ctrl+o to expand)

● Read(README.md)
  ⎿  Error reading file

● Read(readme.md)
  ⎿  Read 253 lines

● Bash(ls -la /home/djj/code/go-zero/core)
  ⎿  total 192
     drwxr-xr-x 48 djj djj 4096 Oct 13 21:17 .
     drwxr-xr-x 12 djj djj 4096 Oct 13 22:19 ..
     … +46 lines (ctrl+o to expand)

● Bash(ls -la /home/djj/code/go-zero/rest)
  ⎿  total 124
     drwxr-xr-x 12 djj djj  4096 Oct 14 02:11 .
     drwxr-xr-x 12 djj djj  4096 Oct 13 22:19 ..
     … +18 lines (ctrl+o to expand)

● Bash(ls -la /home/djj/code/go-zero/zrpc)
  ⎿  total 60
     drwxr-xr-x  4 djj djj 4096 Oct 13 21:17 .
     drwxr-xr-x 12 djj djj 4096 Oct 13 22:19 ..
     … +10 lines (ctrl+o to expand)

● Bash(ls -la /home/djj/code/go-zero/tools)
  ⎿  total 12
     drwxr-xr-x  3 djj djj 4096 Oct 13 21:17 .
     drwxr-xr-x 12 djj djj 4096 Oct 13 22:19 ..
     drwxr-xr-x 25 djj djj 4096 Oct 13 21:17 goctl

● Bash(ls -la /home/djj/code/go-zero/gateway)
  ⎿  total 44
     drwxr-xr-x  3 djj djj 4096 Oct 13 21:17 .
     drwxr-xr-x 12 djj djj 4096 Oct 13 22:19 ..
     … +5 lines (ctrl+o to expand)

● Read(go.mod)
  ⎿  Read 125 lines

● 根据我的分析,这是 go-zero 项目的结构概述:

  项目简介

  go-zero 是一个集成了各种工程实践的 Go 语言 web 和 rpc 框架,被 CNCF 云原生生态收录。它专注于高并发服务的稳定性,具有弹性设计理念。

  核心目录结构

  1. core/ - 核心功能库(48个子模块)

  这是框架的核心,包含各种基础工具和组件:
  - conf - 配置管理
  - breaker - 熔断器
  - limit - 限流器
  - load - 负载均衡/自适应降载
  - bloom - 布隆过滤器
  - collection - 集合工具
  - stores - 数据存储(redis/sql/mongo等)
  - logx - 日志系统
  - trace - 链路追踪
  - metric/prometheus - 监控指标
  - mr - MapReduce并发工具
  - threading/syncx - 并发控制
  - service - 服务基础组件
  - discov - 服务发现
  - 其他 - hash、queue、codec、fx、executors等工具

  2. rest/ - REST API框架

  HTTP服务相关功能:
  - engine.go/server.go - HTTP服务引擎
  - router/ - 路由管理
  - handler/ - 请求处理器
  - httpx/ - HTTP工具
  - httpc/ - HTTP客户端
  - middleware/ - 中间件
  - chain/ - 中间件链
  - pathvar/ - 路径参数
  - token/ - Token处理

  3. zrpc/ - RPC框架

  gRPC服务相关功能:
  - client.go/server.go - RPC客户端和服务端
  - config.go - RPC配置
  - resolver/ - 服务解析
  - internal/ - 内部实现

  4. tools/goctl/ - 代码生成工具

  命令行工具,用于从 .api 文件生成代码:
  - 支持生成 Go、Java、TypeScript、Dart、JavaScript 等多种语言代码
  - 自动生成项目骨架
  - API 语法定义和解析

  5. gateway/ - API 网关

  HTTP API 网关功能:
  - server.go - 网关服务器
  - config.go - 网关配置
  - internal/ - 内部实现

  6. internal/ - 内部实现

  框架的私有实现细节

  7. mcp/ - MCP相关功能

  技术栈特点

  - Go 1.21+
  - 支持 etcd 服务发现
  - 集成 Prometheus 监控
  - OpenTelemetry 链路追踪(Jaeger/Zipkin)
  - 支持 Redis、MySQL、PostgreSQL、MongoDB
  - Kubernetes 集成

  核心特性

  1. 高可用性 - 熔断器、限流、负载均衡、自适应降载
  2. 微服务治理 - 服务发现、链路追踪、监控指标
  3. 并发控制 - 内置并发控制、超时控制
  4. 代码生成 - 通过 goctl 工具自动生成代码
  5. 容错设计 - 面向失败的编程理念

  这是一个典型的微服务框架项目结构,分层清晰:底层核心库(core) + HTTP框架(rest) + RPC框架(zrpc) + 代码生成工具(goctl) + API网关(gateway)。

> /cost
  ⎿  Total cost:            $0.1304
     Total duration (API):  1m 5s
     Total duration (wall): 14m 59s
     Total code changes:    0 lines added, 0 lines removed
     Usage by model:
         claude-3-5-haiku:  5.9k input, 251 output, 0 cache read, 0 cache write ($0.0058)
            claude-sonnet:  3.2k input, 1.8k output, 60.9k cache read, 18.6k cache write ($0.1246)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> 
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Model: Sonnet 4.5  Ctx: 27.4k  Ctx: 13.7%  ⎇ master  (+146,-12)  Cost: $0.13
```

### 2. 使用bg-worker

```

 ▐▛███▜▌   Claude Code v2.0.14
▝▜█████▛▘  Sonnet 4.5 · API Usage Billing
  ▘▘ ▝▝    /home/djj/code/go-zero

> use bg-worker to 告诉我这个项目的结构如何?

● 我会使用 bg-worker agent 来分析这个项目的结构。

● tr:bg-worker(分析 go-zero 项目结构)
  ⎿  Done (5 tool uses · 18.8k tokens · 40.8s)

● 根据分析，这是 go-zero 项目的结构概览：

  📁 主要目录结构

  核心组件

  1. core/ - 框架核心功能库
    - 包含 timex, conf, iox, naming, netx, mathx, collection 等工具包
    - 提供并发控制、配置处理、网络工具等基础设施
  2. rest/ - RESTful API 服务
    - 中间件(middleware)、路由(router)、处理器(handler)
    - 支持完整的 HTTP 服务功能
  3. zrpc/ - RPC 服务组件
    - 基于 gRPC 的 RPC 服务实现
    - 包含解析器和内部实现
  4. tools/goctl/ - 代码生成工具
    - 快速生成微服务代码的 CLI 工具
    - 支持多语言客户端代码生成
  5. gateway/ - API 网关服务
  6. internal/ - 内部工具组件
    - 编码、mock、性能分析等功能

  🛠️ 技术栈

  - 语言: Go 1.21+
  - 服务发现: etcd
  - 监控追踪: Prometheus, OpenTelemetry
  - 数据存储: MySQL, Redis, MongoDB
  - 认证: JWT
  - 容器编排: Kubernetes

  🏗️ 架构特点

  - ✅ 微服务架构设计
  - ✅ 高性能、高并发
  - ✅ 内置熔断、限流等弹性设计
  - ✅ 自动代码生成 (goctl)
  - ✅ 丰富的中间件支持
  - ✅ 分布式链路追踪
  - ✅ 自动参数验证

  总结: go-zero 是一个生产级的 Go 微服务框架，专注于工程实践和开箱即用的企业级特性。

> /cost
  ⎿  Total cost:            $0.0867
     Total duration (API):  1m 18s
     Total duration (wall): 11m 47s
     Total code changes:    0 lines added, 0 lines removed
     Usage by model:
         claude-3-5-haiku:  10.0k input, 1.2k output, 50.3k cache read, 10.5k cache write ($0.0272)
            claude-sonnet:  8 input, 920 output, 20.9k cache read, 10.5k cache write ($0.0595)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> 
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Model: Sonnet 4.5  Ctx: 16.2k  Ctx: 8.1%  ⎇ master  (+146,-12)  Cost: $0.09 
  ⏵⏵ accept edits on (shift+tab to cycle)
```

### 使用multi bg-worker

```
> use multi bg-worker to 告诉我这个项目的结构如何?

● 我将使用多个 bg-worker 代理并行分析这个项目的结构。

● tr:bg-worker(分析项目根目录结构)
  ⎿  Done (3 tool uses · 16.1k tokens · 16.1s)

● tr:bg-worker(分析主要代码目录)
  ⎿  Done (5 tool uses · 9.2k tokens · 34.4s)

● tr:bg-worker(分析核心包结构)
  ⎿  Done (4 tool uses · 10.7k tokens · 25.2s)

● tr:bg-worker(分析工具和命令)
  ⎿  Done (6 tool uses · 10.0k tokens · 27.5s)

● tr:bg-worker(分析测试和文档)
  ⎿  Done (3 tool uses · 8.7k tokens · 14.4s)

● 根据多个 bg-worker 代理的并行分析，这个项目的结构如下：

  📋 项目概述

  项目名称: go-zero模块: github.com/zeromicro/go-zero类型: Go 语言微服务框架Go 版本: 1.21+

  🏗️ 目录结构

  1. core/ - 核心基础库（最重要的部分）

  包含 30+ 个子模块，提供微服务开发的基础设施：

  系统工具类:
  - utils, lang, stringx, mathx, timex, codec, hash

  并发与系统:
  - threading, syncx, proc, executors, contextx

  网络与服务:
  - netx, naming, service, discov, configcenter

  存储与数据:
  - stores, collection, queue

  日志与监控:
  - logx, logc, metric, prometheus, trace

  稳定性保障:
  - limit(限流), breaker(熔断), rescue(异常恢复)

  其他工具:
  - bloom, jsonx, mapping, validation 等

  2. tools/goctl/ - 代码生成工具

  强大的命令行工具，支持：
  - API 代码生成（Go, Java, Dart, TypeScript 等）
  - RPC 服务生成
  - 数据模型生成（SQL, MongoDB）
  - Docker/Kubernetes 配置生成
  - 项目迁移和环境管理

  3. internal/ - 内部实现

  包含 encoding, mock, profiling, trace, health 等内部模块

  4. gateway/ - 网关相关功能

  5. rest/ - REST API 框架

  （从 git status 看到有 rest/middleware/ 未提交文件）

  📊 项目规模

  - 测试文件: 373 个 *_test.go 文件
  - 文档文件: 25 个 Markdown 文件
  - 核心代码: 约 467 个 Go 文件（仅 core 目录）

  🎯 核心特性

  1. 微服务架构: 完整的微服务解决方案
  2. 服务治理: 服务发现、负载均衡、熔断、限流
  3. 可观测性: 集成 OpenTelemetry、Prometheus 监控
  4. 多存储支持: Redis、MySQL、MongoDB
  5. 代码生成: 通过 goctl 快速生成项目脚手架
  6. 高性能: 适合高并发场景

  📝 架构特点

  - 模块化设计: 每个目录职责明确
  - 库项目: 主要作为框架库使用，而非独立应用
  - 完善的测试: 大量单元测试覆盖
  - 文档分布式: 各模块都有独立的 README

  这是一个成熟的、生产级别的 Go 微服务框架，提供了从基础工具到服务治理的完整解决方案。

> /cost
  ⎿  Total cost:            $0.1845
     Total duration (API):  3m 8s
     Total duration (wall): 3m 27s
     Total code changes:    0 lines added, 0 lines removed
     Usage by model:
         claude-3-5-haiku:  20.6k input, 4.9k output, 171.0k cache read, 52.5k cache write ($0.1024)
            claude-sonnet:  8 input, 1.9k output, 20.9k cache read, 12.7k cache write ($0.0820)

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
> 
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Model: Sonnet 4.5  Ctx: 18.4k  Ctx: 9.2%  ⎇ master  (+146,-12)  Cost: $0.18 
  ⏵⏵ accept edits on (shift+tab to cycle)
```

# 缺陷

真的有如同看起来这么美妙吗?

NO! NO! NO!

至少目前看有这么几个问题:

1. 如果使用并发模式来调用bg-worker的话, 如果认为划分的过于简单, 会出现主Agent的输出 + 读取成本高于bg-worker的运行节省的成本, 尽管还是可以节省主Agent的Token, 但是不再具备成本优势
2. bg-worker执行的任务越复杂,越具备成本优势,执行效果越差.
