---
title: gemini-cli源码分析
slug: geminicli-source-code-analysis-z1h12im
url: /post/geminicli-source-code-analysis-z1h12im.html
date: '2025-07-09 13:36:54+08:00'
lastmod: '2025-11-17 23:05:02+08:00'
toc: true
isCJKLanguage: true
tags: ["Gemini", "CLI", "源码分析", "AI", "Agent"]
---



# gemini-cli源码分析

> 我们将 [如何分析一个Agent系统](https://blog.pdjjq.org/archives/how-to-analyze-an-agent-system-z1nrsam) 来分析gemini-cli的实现

# Prompt

> 我们仅分析默认情况的gemini-cli的提示词

[文件位置](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/prompts.ts#L40)

整体上是非常标准的任务型提示词的结构(结构化提示词 强烈推荐[^1])

## 整体的结构

1. 一句话描述目标:  `You are an interactive CLI agent specializing in software engineering tasks. Your primary goal is to help users safely and efficiently, adhering strictly to the following instructions and utilizing your available tools.`
2. 核心目标: 这里一个非常值得学习的部分是:不是用简单的话来描述, 而是详实的说明, 我这里举个例子:

    > `Comments: Add code comments sparingly. Focus on why something is done, especially for complex logic, rather than what is done. Only add high-value comments if necessary for clarity or if requested by the user. Do not edit comments that are separate from the code you are changing. NEVER talk to the user or describe your changes through comments.`
    >

    可以看到这里的详实指的是指导上的详实, 而不是操作上详实, 并没说 `高价值`的判断方式.

    我觉得这也是后续对高性能LLM提示词的一个注意事项: 充分的指导而非强迫操作的细节, 很大概率你所说的细节不如AI本身的能力.
3. Workflow: workflow是结构化提示的核心, 所以在gemini-cli的workflow中, 非常清晰的看到它预设的能力

    1. 软件开发: 这里特地强调了Tools的调用 以及 Understand + Planning + Excute 这一套非常标准的Agent模式
    2. 构建新应用: 和上面差不多
4. Attention: 这里是额外的强调, 这里很有意思, 要求了语气, 对话风格, 安全(修改系统的命令的执行), 再次强调了Tools的使用. **如果有任何需要做CLI Agent的我都推荐学习下这段.**
5. FewShot: 在FewShot前其实还有一些环境说明: 是否在沙箱, 使用git 命令获取最近的一些更改之类的.

    1. 最基础Case: 1+1
    2. 数理推断Case
    3. 简单工具调用2: list files
    4. 复杂示例3个

        1. Refactor the auth logic in src/auth.py to use the requests library instead of urllib
        2. Write tests for someFile.ts
        3. How do I update the user's profile information in this system?
        4. Where are all the 'app.config' files in this project? I need to check their settings.
    5. 安全强化: Delete the temp directory.

以上是gemini-cli的核心提示词, 写的非常结构化, 而且足够精确和详实, 可以给一个90分的评级, 对比Trae-agent的开源代码, 我只能说字节跳动有点搞笑

## memory

想不到吧, 基本的提示词还会有memory

### 读取

本质上就是通过`GEMINI.md`这个文件, ​直接附上

- 全局位置：`~/.gemini/GEMINI.md`（用户主目录）
- 项目层级：从当前工作目录向上递归查找` GEMINI.md`文件

### 写入

- **自动写入**：AI 助手通过 `save_memory` 工具自动保存重要信息
- **手动写入**：用户通过 `/memory add` 命令主动添加记忆
- **直接编辑**：用户可以直接编辑 GEMINI.md 文件
- **存储位置**：默认在 `~/.gemini/GEMINI.md`​ 文件的 `## Gemini Added Memories` 部分

# Tools

> 这部分没有什么价值, 实现的也没有什么新意, 以下是AI总结的, 自己看看吧

### 1. 文件系统工具 (File System Tools)

#### `list_directory` (ReadFolder)

- **作用**: 列出指定目录中的文件和子目录
- **功能**:

  - 支持 glob 模式过滤
  - 遵循 .gitignore 规则
  - 按目录优先、字母顺序排序
- **参数**: 路径、忽略模式、是否遵循 git ignore

#### `read_file` (ReadFile)

- **作用**: 读取单个文件内容
- **功能**:

  - 支持文本文件、图片(PNG/JPG/GIF/WEBP/SVG/BMP)、PDF
  - 可指定行范围读取(offset/limit)
  - 自动检测并跳过二进制文件
- **参数**: 绝对路径、偏移量、限制行数

#### `write_file` (WriteFile)

- **作用**: 写入文件内容
- **功能**:

  - 覆写现有文件或创建新文件
  - 自动创建父目录
  - 显示差异对比
- **安全**: 需要用户确认

#### `replace` (Edit)

- **作用**: 精确替换文件中的文本
- **功能**:

  - 基于上下文的精确匹配
  - 支持多阶段编辑纠错机制
  - 自动利用 Gemini 模型优化替换内容
- **安全**: 需要用户确认，显示差异

#### `glob` (FindFiles)

- **作用**: 根据 glob 模式查找文件
- **功能**:

  - 支持复杂的 glob 模式匹配
  - 按修改时间排序(最新优先)
  - 自动忽略常见的干扰目录
- **参数**: 模式、路径、大小写敏感、遵循 git ignore

#### `search_file_content` (SearchText)

- **作用**: 在文件内容中搜索正则表达式
- **功能**:

  - 优先使用 git grep，回退到系统 grep
  - 支持文件过滤
  - 显示匹配行及行号
- **参数**: 正则模式、路径、包含文件模式

### 2. 执行工具 (Execution Tools)

#### `run_shell_command` (Shell)

- **作用**: 执行 shell 命令
- **功能**:

  - Windows 使用 cmd.exe，其他平台使用 bash
  - 支持后台进程(&)
  - 返回详细执行信息(stdout/stderr/退出码等)
  - 支持命令白名单/黑名单限制
- **安全**: 需要用户确认，支持命令限制配置

### 3. 网络工具 (Web Tools)

#### `web_fetch` (WebFetch)

- **作用**: 获取和处理网页内容
- **功能**:

  - 支持最多20个URL
  - 通过 Gemini API 的 urlContext 处理
  - 本地回退机制
  - 包含来源引用和引用
- **参数**: 包含URL的自然语言提示

#### `google_web_search` (WebSearch)

- **作用**: 执行 Google 网络搜索
- **功能**:

  - 通过 Gemini API 执行搜索
  - 返回带引用的摘要
  - 不是原始搜索结果列表
- **参数**: 搜索查询

### 4. 多文件工具 (Multi-File Tools)

#### `read_many_files` (ReadManyFiles)

- **作用**: 读取多个文件或目录内容
- **功能**:

  - 支持 glob 模式和路径数组
  - 文本文件内容连接
  - 图片/PDF 文件 base64 编码
  - 智能二进制文件检测和跳过
  - 支持包含/排除模式
- **用途**: 代码库概览、功能查找、文档审查

### 5. 记忆工具 (Memory Tool)

#### `save_memory` (Memory)

- **作用**: 跨会话保存和回忆信息
- **功能**:

  - 保存到 \~/.gemini/GEMINI.md 文件
  - 在后续会话中自动加载为上下文
  - 支持个性化和定向协助
- **参数**: 要记住的事实

# Agent

没有什么Agent, 但是Tools + 明确的目标已经是一个很清晰的工作流了

# 总结

1. Agent的核心是模型, 在现在的模型能力上, 花哨的提示词不见得是有用的
2. Planning到底是不是必要的一个步骤? 我对此比较怀疑
3. Tools, 我现在觉得一个coding agent不断地重复造工具实在是太无聊了

[^1]: [结构化提示词](https://github.com/langgptai/LangGPT) 强烈推荐
