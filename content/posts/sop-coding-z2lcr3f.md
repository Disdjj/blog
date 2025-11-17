---
title: SOP Coding
slug: sop-coding-z2lcr3f
url: /post/sop-coding-z2lcr3f.html
date: '2025-08-02 00:38:00+08:00'
lastmod: '2025-11-17 23:05:30+08:00'
toc: true
isCJKLanguage: true
---



# SOP Coding

我不喜欢Vibe Coding

我不喜欢一句话说下来生成了几百行代码, 无用的功能和复杂的逻辑堆叠在一起.

我不喜欢让LLM赤裸的玷污我的代码库, 所以除了一些Demo项目, 或者是演示项目, 我都会谨慎的使用LLM

我曾经是狂热的Vibe Coding的支持者, 但是在越来越深入的使用之后, 我觉得LLM需要的不是上下文提供更多的信息, 而是需要上下文提供更多的限制.

现在的LLM是一份非常聪明的实习生, 聪明到比你更聪明, 更懂"写代码", 但是不懂得你的业务.

所以: 你需要的不是Vibe Coding, 而是SOP Coding.

我使用 [recorder](https://github.com/TokenRollAI/recorder)生成操作记录, 然后用[SPEC-mcp](https://github.com/TokenRollAI/SPEC-mcp)生成SOP.

提供项目的上下文, 以及告诉他"做的事情", 以及一个好的指引. 剩下的就是相信LLM, 相信最聪明的AI能够带着镣铐跳舞.

换句话说: 你不能够完全详细AI, 但是你可以相信一个有着良好的指引和清晰目标以及严格束缚的AI编写的代码.

所以, 我向你推荐SOP Coding. 提供给AI一个非常切实可行的指引. 然后让他学习抽象其中的关键步骤, 然后你就可以相信他.

比起Vibe Coding想要更加解放AI的方案, 在严肃的线上项目中, 我会倾向于立下规矩, 使用SOP Coding.

# SOP 示例

> 这是一个基于go-zero开发的示例

```markdown
# SOP 模板: 添加新的API路由

## 概述
本SOP（标准操作程序）旨在指导开发人员在现有服务中添加一个新的API路由。该过程涵盖了从定义API路由、生成初始代码、到实现业务逻辑的完整流程。此模板旨在确保所有新路由的添加都遵循统一的、可重复的最佳实践。

## 循序渐进指南

### 步骤 1: 定义API路由
*   **描述:** 此步骤的核心是在 `.api` 文件中定义新的API路由。这是代码生成工具识别和创建相应处理器（handler）与逻辑（logic）文件的基础。
*   **操作详情:**
    *   修改文件: `api/web/dsl/[service_name].api`
      ‍```diff
      // 在适当的 service 块内添加新的路由定义
      +    @handler [HandlerName]Handler
      +    [http_method] /[route_path] ([RequestType]) returns ([ResponseType])
      ‍```

### 步骤 2: 生成代码
*   **描述:** 使用 `make` 命令来触发代码生成器。此工具会根据在 `.api` 文件中的定义，自动创建或更新处理器（handler）、逻辑（logic）以及路由（routes）文件。
*   **操作详情:**
    ‍```bash
    # 运行此命令以生成必要的API文件
    make api SERVICE_NAME=[service_name]
    ‍```

### 步骤 3: 实现业务逻辑
*   **描述:** 在这一步，您需要在新生成的逻辑文件中实现具体的业务逻辑。代码生成器已经为您创建了必要的文件和函数骨架。
*   **操作详情:**
    *   修改文件: `api/web/internal/logic/[handler_name]_logic.go`
      ‍```go
      // 在生成的函数中填充业务逻辑
      func (l *[HandlerName]Logic) [HandlerName](req *types.[RequestType]) (resp *types.[ResponseType], err error) {
          // TODO: 在此实现您的业务逻辑
          return
      }
      ‍```

## 关键分析与总结

### 关键文件原型
*   **API 定义文件 (`api/web/dsl/[service_name].api`):** 这是项目的"蓝图"。所有新的API路由都必须在这里定义。它是代码生成器的输入，决定了后续生成文件（如处理器和逻辑文件）的结构。
*   **处理器文件 (`api/web/internal/handler/[handler_name]_handler.go`):** 该文件负责解析传入的HTTP请求，并将其传递给相应的逻辑文件进行处理。它通常是自动生成的，并且在大多数情况下不需要手动修改。
*   **逻辑文件 (`api/web/internal/logic/[handler_name]_logic.go`):** 这是实现业务逻辑的核心文件。所有的数据处理、与数据库的交互以及其他核心功能都应在此文件中实现。

### 文件关系模式
*   API路由的生命周期始于 `.api` 定义文件。
*   `make api` 命令会读取 `.api` 文件，并生成或更新相应的处理器和逻辑文件。
*   处理器文件作为请求的入口点，将请求转发给逻辑文件。
*   逻辑文件包含核心业务逻辑，并在处理完请求后返回结果。

### 主要变更与次要变更
*   **主要变更 (核心逻辑):**
    *   在 `.api` 文件中对路由的定义。
    *   在逻辑文件中对业务逻辑的实现。
*   **次要变更 (自动化生成):**
    *   处理器文件的生成。
    - 逻辑文件的初始框架。
    - 路由文件的更新。

    开发人员应将主要精力集中在核心逻辑的变更上，而次要变更则可以被视为自动化流程的结果。
```

Enjoy yourself.
