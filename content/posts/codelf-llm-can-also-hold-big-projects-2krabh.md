---
title: codelf:LLM也可以hold住大项目
slug: codelf-llm-can-also-hold-big-projects-2krabh
url: /post/codelf-llm-can-also-hold-big-projects-2krabh.html
date: '2025-04-18 11:40:50+08:00'
lastmod: '2025-11-17 23:03:11+08:00'
toc: true
isCJKLanguage: true
tags: ["LLM", "AI编程", "上下文", "开源", "Codelf"]
---



# codelf:LLM也可以hold住大项目

好吧, 有点标题党了.

LLM受限于上下文, 对于大型项目总是缺少控制能力. 这是一个众所周知的问题.

解决方案有这么几种:

1. Memory: 和project绑定的能够长期记忆, 比如说 cline的memory bank
2. Choose: 选择自己需要的部分, 比如说RAG, Cursor/Windsurf通过Search Token/变量来进行组装.

后者的方案对于编写代码可能不错, 但是实现起来比较麻烦.

今天要介绍的是前者, 也是笔者的一个开源项目: https://github.com/Disdjj/codelf

# 使用

在你的Cursor/Windsurf等等支持MCP的Client中, 添加:

```plaintext
{
  "mcpServers": {
    "codelf": {
      "command": "npx",
      "args": ["codelf"]
    }
  }
}

```

一些强化指令

```plaintext
Before responding or modifying the code, one should first obtain comprehensive information via `get-project-info` before making any decisions.
Everytime you finish editing code, you must call `update-project-info` and follow the instructions from the response
```

## 初始化

```plaintext
do init-codelf and follow the instructions
```

# 效果

会在项目目录下增加以下内容

![image](/images/image-20250418114836-wgq2td4.png)

其中: project.md是通过扫描文件树 + 读取一些标志性文件得到的项目介绍.

如下图所示:

![image](/images/image-20250418115123-rm5e8ye.png)

attention.md则是开发的注意事项

![image](/images/image-20250418115207-laigym3.png)

# 原理

通过获取项目的结构, 然后再通过读取一些标志性文件, 例如package.json, project.toml, readme.md, 让LLM生成一系列的项目描述.

在LLM做代码编辑时, 通过MCP将这些项目信息通过MCP调用注入到上下文中, 帮助LLM更好的判断代码变更的影响.

原理很简单, 但是效果还不错.

在一些中大型的项目中, 能够有效的帮助进行上下文的组织, 对于编程能力不是很强的用户非常友好.

生成的文档(在项目的.codelf目录下)本身就有很强的可读性, 甚至可以直接拿来作为项目摘要文档.

非常期待大家能够使用然后给一些反馈.
