---
title: 一些关于AI Coding的经验
slug: some-experiences-about-ai-coding-zaz65l
url: /post/some-experiences-about-ai-coding-zaz65l.html
date: '2025-11-02 21:56:06+08:00'
lastmod: '2025-11-17 22:35:37+08:00'
toc: true
isCJKLanguage: true
tags: ["AI编程","LLM","Prompt","上下文工程","经验"]
---



> 在线查看: https://ai-coding-showcase.pdjjq.org/

# Attention

- "写代码"的门槛非常低, 收益非常的可观 [Anthropic是怎么使用Claude Code](https://www-cdn.anthropic.com/58284b19e702b49db9302d5b6f135ad8871e7658.pdf)
- 写代码 != 产出高质量软件
- 需求的实现成本/难度 **下降**?
- 不要为LLM的发展焦虑, 但不要做 coding义和团<sup>（指 本质正义, 工具落后, 顽固守旧的人）</sup>

# 基座模型

***至少到2025年年底, 我们应该认识到: 基础模型进步带来的收益时最大的***

***在任何生产力场景下, 应该总是选择SOTA模型***

### 基本性能要求

> 一行代码约 10 Token [Token 计算器](https://platform.openai.com/tokenizer)

- 上下文: 128K+ (最好能够到200K) Token

  - [成本](https://www.claude.com/pricing#api)
  - 输出的速度/质量
- 输出速度: 60 Token/s
- 智力水平: [SWE-Bench ](https://www.swebench.com/) 70% (With Thinking) 60% (Low Think / No Think)
- 其他特性:

  - ToolUse / Function Call
  - Prompt Cache
  - Reasoning

### 主流的模型

> 美国: Anthropic / OpenAI / Google Gemini / ~~Grok~~
>
> 中国: Qwen / GLM / Kimi / MiniMax / DeepSeek

##### Anthropic (地域黑/权限狗)

> 对中国用户不友好 , 挂VPN也能封号, 策略最严格 之 <<封号斗罗>>

目前最强的Agent Model: 

- ***[旗舰 Opus](https://www.anthropic.com/claude/opus)***​ ***: 主要使用的Coding模型***
- ***[次旗舰 Sonnet](https://www.anthropic.com/news/claude-sonnet-4-5)***: 在很长的一段时间内, sonnet都是一个全能的模型
- [狗屎 Haiku](https://www.anthropic.com/news/claude-haiku-4-5)

##### OpenAI (CloseAI)

***[gpt-5.2-codex](https://openai.com/zh-Hant/index/introducing-gpt-5-2-codex/)***  ***:  修改准确, 调查充分, 但是耗时过长, 非常适合修复BUG***

##### Gemini (Google大善人)

[Gemini 3.0 pro](https://aistudio.google.com/models/gemini-3): 史上最佳的对话模型

[Gemin 3.0 Flash](https://blog.google/products/gemini/gemini-3-flash/): 我们到现在都不知道Google是怎么做到的

##### Qwen (真正的OpenAI)

[qwen3 Max](https://qwen.ai/blog?id=72071a922385147be2ca81cdfaa50035db6e85d0&from=research.research-list) : 中国特色gemini

***[qwen3 coder plus](https://qwenlm.github.io/blog/qwen3-coder/)***  ***: 狗都不用, 但是必要的时候可以当狗***

##### GLM Kimi MiniMax (整挺好)

***[glm4.6](https://docs.z.ai/guides/llm/glm-4.6)***  ***: 能力很好,***  ***[Coding Plan](https://z.ai/subscribe)***​***也很好, 但是最近在降智***

[Minimax-M2](https://www.minimax.io/news/minimax-m2)

[Kimi K2](https://moonshotai.github.io/Kimi-K2/)

##### **DeepSeek (我卡呢?)**

> 大家举起双手把力量借给DeepSeek 👐👐👐

[DeepSeek-V3.2](https://api-docs.deepseek.com/zh-cn/news/news251201)

# 主流的AI Coding工具

我们可以按照交互的形式主要分为三类

- VsCode-Fork: GUI Local, Fork VsCode 的发行版 , 使用 OpenVSX 作为插件来源 , 集成AI能力增强代码编写体验
- CLI: 在命令行中与Agent进行交互, 对运行环境有最好的支持, 一般能够轻易的在CICD 中集成, 配合前后端分离的架构可以配合VSCode插件使用
- Web/Remote Agent: 提供最开箱即用的能力, 开发环境完全托管远程, 控制能力较弱, 价格较贵

## VsCode-Fork

> 赞美VsCode, 你是IDE的终点, 你是AIDE的起点. GUI > CLI !!!
>
> V门

大部分耳熟能详的AI IDE都是基于VsCode来做, 包括但不限于:

- ***[Cursor](https://cursor.com/)***​ ***: 最流行的AI Coding工具, 开箱即用, 最好的complete功能, 定价变化大***
- ***[Antigravity](https://antigravity.google/)***​ ***: Google出品, 目前提供的额度比较高, 原生连接Chrome, Agent pannel***
- [Windsurf](https://windsurf.com/): 无功无过
- [Trae](https://trae.ai/): 字节出品, 做的不错, 重新设计过UI, 有SOLO模式, 创新不大
- [Qoder](https://qoder.com/): 阿里出品
- [CodeBuddy](https://www.codebuddy.com/): 腾讯出品
- 开源: [Void](https://voideditor.com/)(不再维护了)
- 开源Coding插件: [Cline](https://cline.bot/) / [Roo Code](https://roocode.com/) / [Kilo Code](https://kilocode.ai/) / [continue.dev](https://www.continue.dev/)

最大的优势是: 用户习惯迁移非常方便

缺点是: 同质化非常严重

### Auto Complete

快速自动补全是所有的AI IDE的最基本功能之一, 由此演变来的功能一般还有:

1. [Multi line edits](https://forum.cursor.com/t/cursors-multiline-edit-feautre/45880/4)
2. [Next Edit](https://docs.augmentcode.com/using-augment/next-edit)

当然了, 有[开源的项目](https://github.com/continuedev/continue)提供了类似的能力, 一般支持[FIM的小模型](https://medium.com/@SymeCloud/what-is-fim-and-why-does-it-matter-in-llm-based-ai-53f33385585b)都能够顾胜任此工作

### Commit Message

根据代码变更自动生成Commit Message

![PixPin_2025-11-03_17-45-41](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/PixPin_2025-11-03_17-45-41-20251103174548-s4f3k66.gif)

### Coding Agent

这部分的实现和交互和CLI Agent比较类似, 会在下一个大节详细描述

## CLI

> CLI交互天生就有一种严肃性, 同时CLI也有最广泛的适用性

- ***[Cluade Code](https://www.claude.com/product/claude-code)***  ***: 目前最强大 特性最丰富 普适性最强的的Coding工具***
- ***[Codex CLI](https://developers.openai.com/codex/cli/)***  ***: 功能非常简陋, 纯靠模型能力硬顶***
- ***[OpenCode](https://opencode.ai/)***​ ***: 拥有目前最出色的Plugin设计, 我会逐渐的迁移到OpenCode***

- ***[iflow](https://iflow.cn/)***​ ***: 国产CC***
- [gemini cli](https://github.com/google-gemini/gemini-cli) : 做的也很简陋, 但是更新迭代速度比较快
- [auggie](https://docs.augmentcode.com/cli/overview) / [cursor cli](https://cursor.com/cli): 狗屎

## Web/Remote Agnt

> 非专业开发人员的福音:
>
> 1. 几乎没有环境依赖
> 2. 一般配有 在线预览 + 快速部署的功能
> 3. 非常适合做DEMO验证

[v0.dev](https://v0.dev/)

[lovable](https://lovable.dev/?utm_feeditemid=&utm_device=c&utm_term=loveable&utm_source=google&utm_medium=ppc&utm_campaign=US+-+Search+-+Lovable+-+CORE&campaignid=23072209374&devicetype=c&gclid=CjwKCAiAwqHIBhAEEiwAx9cTeXrxCTihhEasA3K6V3Ol8z0L3FKJF7-ptX6gsrE8xNRMHFvZNXr8ThoCndwQAvD_BwE&creativeid=777017041384&gad_source=1&gad_campaignid=23072209374&gbraid=0AAAAA-iIxGdzRbJfuyfceh8ZUw2kAlW3F)

[Google AI Studio](https://aistudio.google.com/apps)

[bolt.new](https://bolt.new/)

# 个人使用经验

> 提升AI Coding质量的最有效方法:
>
> 1. 提供高质量 高相关度的上下文, 至少是包含相关的上下文
> 2. 合理的划分任务, 每次专注于一个任务

### CLAUDE.md / AGENTS.md

CLAUDE.md 和 AGENTS.md本质上都是注入到Context里的提示词, 在claude code的实现中,  会将 User / Project 的CLAUDE.md 都插入到Context中.

##### 实现原理

```markdown
<system-reminder>
As you answer the user's questions, you can use the following context:
# claudeMd
Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.

...

</system-reminder>
```

![PixPin_2025-11-08_20-28-26](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/PixPin_2025-11-08_20-28-26-20251108202828-tiyz2ko.png)

##### 如何使用?

- 使用 `/init`初始化Claude.md
- 使用 `# content`添加到Claude.md

##### 记录什么东西

1. DO NOT xxx, because xxx
2. Always use xxx to do xxx

```markdown
{项目概况: 名称/技术栈/架构}

## 核心技术栈

## 项目架构

## 开发命令

## 关键配置

## 开发注意事项
```

### **Chat more before coding**

这是最简单的最推荐的提升AI Coding质量的方法, 多聊几轮

如果有Plan模式, 那么先使用Plan模式, 直到AI能够彻底理解你的需求, 并且给出了合理的方案

或者说 并不是 "Chat More" 而是 "先调查, 再规划, 再写代码"

![Cursor切换Plan](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/20251104011708.png "Cursor切换模式")

![Claude Code 中通过Shift + Tab切换Pland模式](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/20251104011830.png "Claude Code 中通过Shift + Tab切换Pland模式")

### SOP Coding

重复自己是最无聊的事情

如果在堆积业务代码, 非常推荐整理出一个SOP, 后续再开发的时候 让AI Follow 这个SOP进行编程.

有两种办法:

1. 在commit之前, 让AI总结操作步骤, 并且写入到项目的文档目录中, 做持久化管理
2. 使用[recorder](https://recorder.tokenroll.ai/) 自动记录你的操作行为成日志, 生成操作文档

### Option Coding

在Claude Code的 [2.0.21](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#2021)的更新中, 引入了一个新的功能: `interactive question tool`

简单来说: AI可以主动向你发文, 你可以做选项回复.

![PixPin_2025-11-05_02-50-06](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/PixPin_2025-11-05_02-50-06-20251105025012-e7nfejb.gif)

对于懒得打字的朋友们来说, 简直是福音.

做选择题, 总是要比做填空题爽是不是?

一般来说在plan模式下, 会更加主动的调用`AskUserQuestion`这个工具, 来让用户进行选择.

所以, Enjoy yourself

### llmdoc

文档系统在AI Coding中只会越来越重要.

LLM没有长期记忆, 全部依赖于Context, 文档系统本质上就是外挂了一个持久化数据层.

帮助AI快速获取充分的信息.

我这里以我们后端系统的文档建设举例.

![image](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/20251105025559.png)

当然了, 全部都是AI生成的, by [cc-plugin](https://github.com/TokenRollAI/cc-plugin)

### MCP

![PixPin_2025-11-05_01-33-04](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/PixPin_2025-11-05_01-33-04-20251105013334-cjlpjfc.gif)

##### 寻找MCP

现在几乎所有主流的AI SaaS服务都有提供MCP, 如果你感兴趣可以在这里主流的平台中寻找MCP:

- [官方收录MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Awsome MCP](https://github.com/punkpeye/awesome-mcp-servers)
- [smithery.ai](https://smithery.ai/)
- [mcp.so](https://mcp.so/zh)
- [魔塔MCP广场](https://www.modelscope.cn/mcp)

##### 常用MCP

- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp): Browser use, 谷歌出品, 调用浏览器, 获取Console/网络请求 日志

- ***[figma](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)***​ ***: 尽管我几乎不使用figma, 但是由于figma巨大的影响力, 还是加上, 防止有些人竟然不知道***
- [K8S](https://github.com/containers/kubernetes-mcp-server): 注意要使用 [readonly模式](https://github.com/containers/kubernetes-mcp-server#:~:text=table)%20(default%20%22table%22)-,%2D%2Dread%2Donly,-If%20set%2C%20the)
- [github](https://github.com/github/github-mcp-server): 和Github交互 (虽然我认为使用 [`gh`](https://cli.github.com/) cli + Bash Tool 是更好的解决方案)
- [context7](https://github.com/upstash/context7): 虽然我认为用处不大, 但是推荐尝试
- [ref](https://ref.tools/): 提供准确的文档, Better than context7 贵的东西的缺点只有贵 :(

##### 不要使用的MCP

- [serena](https://github.com/oraios/serena): 太多的重复功能, 不稳定的LSP, 你不会需要这个的.
- 所有超过10个tools的MCP, 只会让你的Coding Agent变成~~笨蛋~~

##### 不要使用MCP

![image](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/20251105003958.png "图源: Manus 分享 Context Engineering for AI Agents")

使用Tools是有代价的, Tools并不是LLM天生就会的事情.

从[ReAct](https://react-lm.github.io/)开始, 工具调用能力被认为是提升Agent解决问题的能力重要组成部分, 在2025年, 号称是 "?Agent元年", 几乎所有的模型都在强调工具调用能力, 就像是人使用手一样

[MCP](https://modelcontextprotocol.io/docs/getting-started/intro)带来的最重要的进步: 一个更容易接入,实现更自由的, 平台框架解耦的[Function Call](https://platform.openai.com/docs/guides/function-calling) / [Tools](https://claude.com/blog/tool-use-ga)

但是MCP是有代价的, 而且是昂贵的代价, 每一个MCP Tools都占用一个昂贵的`Tool`的位置, Claude Code为了能够强化其ToolUse的能力, 在System提示词中做了巨大的强调 (530 Token, 约25%)

```markdown
# Tool usage policy
- When doing file search, prefer to use the Task tool in order to reduce context usage.
- You should proactively use the Task tool with specialized agents when the task at hand matches the agent's description.
- A custom slash command is a user-defined operation that starts with /, like /commit. When executed, the slash command gets expanded to a full prompt. Use the Skill tool to execute them. IMPORTANT: Only use Skill for commands listed in its Available Commands section - do not guess or use built-in CLI commands.
- When WebFetch returns a message about a redirect to a different host, you should immediately make a new WebFetch request with the redirect URL provided in the response.
- You can call multiple tools in a single response. If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel. Maximize use of parallel tool calls where possible to increase efficiency. However, if some tool calls depend on previous calls to inform dependent values, do NOT call these tools in parallel and instead call them sequentially. For instance, if one operation must complete before another starts, run these operations sequentially instead. Never use placeholders or guess missing parameters in tool calls.
- If the user specifies that they want you to run tools \"in parallel\", you MUST send a single message with multiple tool use content blocks. For example, if you need to launch multiple agents in parallel, send a single message with multiple Task tool calls.
- Use specialized tools instead of bash commands when possible, as this provides a better user experience. For file operations, use dedicated tools: Read for reading files instead of cat/head/tail, Edit for editing instead of sed/awk, and Write for creating files instead of cat with heredoc or echo redirection. Reserve bash tools exclusively for actual system commands and terminal operations that require shell execution. NEVER use bash echo or other command-line tools to communicate thoughts, explanations, or instructions to the user. Output all communication directly in your response text instead.
- VERY IMPORTANT: When exploring the codebase to gather context or to answer a question that is not a needle query for a specific file/class/function, it is CRITICAL that you use the Task tool with subagent_type=Explore instead of running search commands directly.
<example>
user: Where are errors from the client handled?
assistant: [Uses the Task tool with subagent_type=Explore to find the files that handle client errors instead of using Glob or Grep directly]
</example>
<example>
user: What is the codebase structure?
assistant: [Uses the Task tool with subagent_type=Explore]
</example>
```

又是policy, 又是few shot, 然后一个 `mcp add` 引入了20个额外的tools + 巨大的无聊的Description , 完全没有经过设计的Response, context 已经完全不够用了!!!!

**我建议你只使用0-2个MCP, 在不需要的时候及时关掉**

唯一推荐的使用方式是, 在支持多Agent的工具中, 为每个Agent开启一个MCP, 例如Claude Code Subagent.

> 下图为我在[CherryStudio](https://github.com/CherryHQ/cherry-studio)中使用MCP, 尽量让一个Agent做一件事情, 专注于使用一类工具.

![image](https://raw.githubusercontent.com/Disdjj/siyuan-pic/main/20251105013708.png)

MCP是灾难, 调休也是.

# 我还使用哪些AI工具

1. ***[Cherry Studio](https://github.com/CherryHQ/cherry-studio)***​ ***: 桌面AI工具, 好用, 强烈推荐***
2. ***[Gemini](http://gemini.google.com/)***​ ***: 我是Gemini的付费Pro会员, 强烈推荐***
3. ***[AIHubMix](https://aihubmix.com/models)***​ ***: AI代理提供商, 提供几乎所有的主流模型, 强烈推荐***
4. ***[notebooklm](https://notebooklm.google/)***​ ***: Google出品, 我一般用来做知识库使用, 强烈推荐***
5. [Dify](https://dify.ai/): 懒得写代码的时候我会直接用Dify接一些简单的功能, 比如说简单的Chat之类的工作. 比如说这里的 [面试官小工具](https://dify.pdjjq.org/completion/QkoqxPlW2UDYqTPa)
6. [zread](https://zread.ai/) / [deepwiki](https://deepwiki.com/): LLM帮你分析开源repo

# 上下文工程

这里要讲的东西有点太多了, 根本说不完.

这里给出我认为非常适合学习的材料, 感兴趣的可以自行阅读

[结构化提示词](https://github.com/langgptai/LangGPT) : 一个入门教程

[AI代理的上下文工程：构建Manus的经验教训](https://manus.im/zh-cn/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) : Agent必吃榜第一

[Manus AI Agent 分享PPT](https://drive.google.com/file/d/1QGJ-BrdiTGslS71sYH4OJoidsry3Ps9g/view) : Agent必吃榜第二

[Context Rot](https://research.trychroma.com/context-rot): More Input, More Stupid

[评估LLM的上下文能力](https://nrehiew.github.io/blog/long_context/): 1M上下文是童话故事

---

- [Anthropic | How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic | Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic | Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Anthropic | Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Anthropic | How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic | Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Cognition | Don’t Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)
- [Letta | Anatomy of a Context Window: A Guide to Context Engineering](https://www.letta.com/blog/guide-to-context-engineering)
- [Letta | Agent Memory: How to Build Agents that Learn and Remember](https://www.letta.com/blog/agent-memory)
- [Letta | Memory Blocks: The Key to Agentic Context Management](https://www.letta.com/blog/memory-blocks)
- [Letta | RAG is not Agent Memory](https://www.letta.com/blog/rag-vs-agent-memory)
- [LangChain | The rise of "context engineering"](https://blog.langchain.com/the-rise-of-context-engineering/)
- [LangChain | Context Engineering](https://github.com/langchain-ai/context_engineering)
- [LangChain | Agent Middleware](https://blog.langchain.com/agent-middleware/)
- [LangChain | Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- [Github | Context Engineering Resources](https://github.com/davidkimai/Context-Engineering)
- [Github | 12 Factor Agents: Principles for building reliable LLM applications](https://github.com/humanlayer/12-factor-agents)
- [Context Engineering for Agents](https://rlancemartin.github.io/2025/06/23/context_engineering/)
- [Context Engineering Guide](https://www.promptingguide.ai/guides/context-engineering-guide)
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot)
- [How to Fix Your Context](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)
- [What is Context Engineering and How It Differs from Prompt Engineering](https://www.iamdave.ai/blog/what-is-context-engineering-and-how-it-differs-from-prompt-engineering)
- [Context Engineering with Agents using LangGraph: A Guide for Modern AI Development](https://medium.com/ai-artistry/context-engineering-with-agents-using-langgraph-a-guide-for-modern-ai-development-7434ffec3aa8)
- [Context Engineering Skills](https://www.decodingai.com/p/context-engineering-2025s-1-skill)
- [Context Engineering - What it is, and techniques to consider](https://www.llamaindex.ai/blog/context-engineering-what-it-is-and-techniques-to-consider?utm_source=socials&utm_medium=li_social#knowledge-base-or-tool-selection)

---

- [Andrej Karpathy on X: "+1 for "context engineering" over "prompt engineering"](https://x.com/karpathy/status/1937902205765607626?ref=blog.langchain.com)
- [Tobi Lutke tweet](https://x.com/tobi/status/1935533422589399127)
- [Free ~14 minute talk on Context Engineering tips & tricks](https://x.com/addyosmani/status/1966752236249202743)
- [Windsurf: Windsurf’s context retrieval](https://x.com/_mohansolo/status/1899630246862966837?ref=blog.langchain.com)
- [CodeRabbit: Context Engineering](https://x.com/ai_for_success/status/1966874686283018565)
- [Context engineering, clearly explained!](https://x.com/akshay_pachaar/status/1970493414795079904)
- [Context Engineering for PMs](https://x.com/PawelHuryn/status/1949925078562721863)
- [How to build a context engineering workflow](https://x.com/_avichawla/status/1966228573414633743)
- [Context Engineering for Agents - Lance Martin, LangChain](https://www.youtube.com/watch?v=_IlTcWciEC4)
- [Context Engineering with DSPy - the fully hands-on Basics to Pro course](https://www.youtube.com/watch?v=5Bym0ffALaU)

# 一些暴论

1. ***Get Hands Dirty , 动手做比什么都重要***
2. 想象力 &gt; 行动力 &gt; 编程能力<sup>（一切都建立在有软件工程的基本素质）</sup>
3. 领域的融合, 狭窄深邃不再是无法克服的问题
