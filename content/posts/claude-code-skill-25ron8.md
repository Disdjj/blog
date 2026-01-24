---
title: Claude Code SKill
slug: claude-code-skill-25ron8
url: /post/claude-code-skill-25ron8.html
date: '2026-01-24 14:28:01+08:00'
lastmod: '2026-01-24 17:46:55+08:00'
toc: true
isCJKLanguage: true
---



# Claude Code SKill

# Skill的实现以及指令

让我们来抓包Claude Code的请求, 看看Claude Skill的实现吧

```json
    {
      "name": "Skill",
      "description": "Execute a skill within the main conversation\n\nWhen users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.\n\nWhen users ask you to run a \"slash command\" or reference \"/<something>\" (e.g., \"/commit\", \"/review-pr\"), they are referring to a skill. Use this tool to invoke the corresponding skill.\n\nExample:\n  User: \"run /commit\"\n  Assistant: [Calls Skill tool with skill: \"commit\"]\n\nHow to invoke:\n- Use this tool with the skill name and optional arguments\n- Examples:\n  - `skill: \"pdf\"` - invoke the pdf skill\n  - `skill: \"commit\", args: \"-m 'Fix bug'\"` - invoke with arguments\n  - `skill: \"review-pr\", args: \"123\"` - invoke with arguments\n  - `skill: \"ms-office-suite:pdf\"` - invoke using fully qualified name\n\nImportant:\n- When a skill is relevant, you must invoke this tool IMMEDIATELY as your first action\n- NEVER just announce or mention a skill in your text response without actually calling this tool\n- This is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task\n- Only use skills listed in \"Available skills\" below\n- Do not invoke a skill that is already running\n- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)\n- If you see a <command-name> tag in the current conversation turn (e.g., <command-name>/commit</command-name>), the skill has ALREADY been loaded and its instructions follow in the next message. Do NOT call this tool - just follow the skill instructions directly.\n\nAvailable skills:\n- tr:reviewPR: Conducts an automated review of a GitHub Pull Request.\n- tr:updateDoc: Updates the documentation based on recent code changes.\n- tr:initDoc: Generate great doc system for this project\n- tr:what: Clarifies a vague user request by asking clarifying questions.\n- tr:withScout: Handles a complex task by first investigating the codebase, then executing a plan.\n- tr:commit: Analyzes code changes and generates a conventional commit message.\n",
      "input_schema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
          "skill": {
            "description": "The skill name. E.g., \"commit\", \"review-pr\", or \"pdf\"",
            "type": "string"
          },
          "args": {
            "description": "Optional arguments for the skill",
            "type": "string"
          }
        },
        "required": [
          "skill"
        ],
        "additionalProperties": false
      }
    }
```

### Instructions

```markdown
Execute a skill within the main conversation

When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

When users ask you to run a \"slash command\" or reference \"/<something>\" (e.g., \"/commit\", \"/review-pr\"), they are referring to a skill. Use this tool to invoke the corresponding skill.

Example:
  User: \"run /commit\"
  Assistant: [Calls Skill tool with skill: \"commit\"]

How to invoke:
- Use this tool with the skill name and optional arguments
- Examples:
  - `skill: \"pdf\"` - invoke the pdf skill
  - `skill: \"commit\", args: \"-m 'Fix bug'\"` - invoke with arguments
  - `skill: \"review-pr\", args: \"123\"` - invoke with arguments
  - `skill: \"ms-office-suite:pdf\"` - invoke using fully qualified name

Important:
- When a skill is relevant, you must invoke this tool IMMEDIATELY as your first action
- NEVER just announce or mention a skill in your text response without actually calling this tool
- This is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task
- Only use skills listed in \"Available skills\" below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
- If you see a <command-name> tag in the current conversation turn (e.g., <command-name>/commit</command-name>), the skill has ALREADY been loaded and its instructions follow in the next message. Do NOT call this tool - just follow the skill instructions directly.

Available skills:
- tr:reviewPR: Conducts an automated review of a GitHub Pull Request.
- tr:updateDoc: Updates the documentation based on recent code changes.
- tr:initDoc: Generate great doc system for this project
- tr:what: Clarifies a vague user request by asking clarifying questions.
- tr:withScout: Handles a complex task by first investigating the codebase, then executing a plan.
- tr:commit: Analyzes code changes and generates a conventional commit message.
```

除此之外, 在 System 的 Tool Usage Policy 中还有这么一个

```markdown
- /<skill-name> (e.g., /commit) is shorthand for users to invoke a user-invocable skill. When executed, the skill gets expanded to a full prompt. Use the Skill tool to execute them. IMPORTANT: Only use Skill for skills listed in its user-invocable skills section - do not guess or use built-in CLI commands.
```

### 1. 功能

- **核心定位：**  这是一个**中转站**。它的核心功能是将自然语言（如 "help me fix this bug"）或 显式指令（如 "/commit"）映射到具体的系统预设能力（Skills）上。
- **触发机制：**

  1. **意图识别：**  用户任务需要专业能力辅助时。
  2. **符号触发：**  明确的斜杠命令 `/`。
- **状态管理：**  它不仅仅是调用，还包含了一个非常关键的**状态检查**功能（检查 `<command-name>` 标签），用于防止死循环（即防止模型在已经加载了技能的情况下再次尝试调用技能）。

### 2. 构成与强调内容

采用了 **Context（背景） -> Trigger（触发器） -> Examples（示例） -> Constraints（约束） -> Knowledge Base（可用列表）**  的经典结构。

- **强调内容（Emphasis）：**

  - **即时性与阻断性（Blocking Requirement）：**  使用了大写的 `IMMEDIATELY`​、`BLOCKING REQUIREMENT`​、`BEFORE generating`​。这是为了解决 LLM 常见的一个毛病： **“光说不练”** （即模型回复“好的，我来帮你运行 commit”，但实际上并没有发起工具调用）。这里强制要求工具调用必须是第一动作。
  - **排他性（Negative Constraints）：**  明确规定了**不该做什么**（不要用于内置 CLI 命令，不要只是嘴上说说，不要调用未列出的技能）。
  - **防递归（Loop Prevention）：**  特别强调了检测 `<command-name>` 标签。这说明该系统是一个多轮对话或基于 Agent 的系统，技能加载后会注入新的 Prompt，必须防止 Router 再次拦截。

### 3. 适配高智能模型 & 声明式 vs 命令式

- **适配度：高**。这段 Prompt 非常适合高智商模型。
- **风格分析：**

  - **混合风格**，但偏向**命令式（Imperative）** 。
  - 虽然有声明式的描述（"Skills provide specialized capabilities..."），但在执行逻辑上使用了大量的命令式语句（"Use this tool...", "Check if...", "Do NOT call..."）。
  - **点评：**  对于**工具调用（Function Calling）** 类任务，**命令式**通常优于声明式。因为工具调用需要严格的语法和时序准确性，模糊的声明可能导致模型自由发挥而产生幻觉
- **思维链引导：**  Prompt 隐式地要求模型先进行判断（Check if relevant），然后行动。

# Skill的调用

### command 调用

让我们直接调用一个 command, 然后观察他的执行流程吧

Claude Code 其实会把一个 command 的调用拆解成两个步骤

1.  `command-name`Tag 包裹的命令请求

   ```json
           {
             "type": "text",
             "text": "<command-message>tr:what</command-message>\n<command-name>/tr:what</command-name>"
           },
   ```
2. SKILL.md 的内容

   ```json
           {
             "type": "text",
             "text": "CONTENT of SKILL"
           }
   ```

### skill folder

claude code skill 提供的另外一个令人兴奋的能力是: https://code.claude.com/docs/en/skills#add-supporting-files

可以将 skill 涉及到的文件封装在同一个目录下, 这样可以实现更好的结构化.

来看看这部分是怎么实现的, 我们将使用一个空的目录, 看看这个目录的结构吧

```json
.claude
└── skills
    └── say-hello
        ├── scripts
        │   └── hello.sh
        └── SKILL.md
```

skill 的内容非常简单

```json
---
name: say-hello
description: Say hello to the user
disable-model-invocation: true
---

run scripts/hello.sh
```

##### 执行流程

```json
❯ /say-hello                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
⏺ Bash(bash /Users/test/code/claude-code-skill-research/.claude/skills/say-hello/scripts/hello.sh)                                                                                         
  ⎿  Hello, World!                                                                                                                                                                         
                                                                                                                                                                                           
⏺ 脚本已成功执行，输出：Hello, World!
```

这部分其实就没有什么惊喜了, 但是这里要注意: 不要声明绝对目录

##### 请求设计

```json
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "<command-message>say-hello</command-message>\n<command-name>/say-hello</command-name>"
        },
        {
          "type": "text",
          "text": "Base directory for this skill: /Users/test/code/claude-code-skill-research/.claude/skills/say-hello\n\nrun scripts/hello.sh\n",
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    }
```

可以看到, 这里也没有什么魔法, 或者很工程的设计, 唯一一个需要注意的是:

​`Base directory for this skill: /Users/test/code/claude-code-skill-research/.claude/skills/say-hello`

所以, skill 的 folder 是怎么实现的呢? 很简单, 在提示词里显式的说明了 skill 的路径, 好吧, 有点失望

### context-fork

另外一个值得观察的: context fork 的能力, 按照官网描述:

> Set to `fork` to run in a forked subagent context.

听描述应该是说, 会启动一个 subagent, fork 主 agent 的 context, 在完全独立的上下文中运行

让我们看一看, 这个 subagent 的使用吧

现在修改下 SKILL.md, 使用 context fork 以及使用 general-purpose agent 来运行

```markdown
---
name: say-hello
description: Say hello to the user
disable-model-invocation: true
context: fork
model: sonnet
agent: General-purpose
---

run scripts/hello.sh

```

执行路径

```plaintext
❯  hello                                                                        
                                                                                
⏺ Hello! How can I help you today?                                              
                                                                                
❯ /say-hello                                                                    
  ⎿  The script ran successfully and outputted:                                 
                                                                                
     Hello, World!                                                              
                                                                                
     The script is located at /Users/test/code/claude-code-skill-research/.claud
     /skills/say-hello/scripts/hello.sh and simply prints a greeting message.   
                                                                                
❯ ok, hi, claude code                                                           
                                                                                
⏺ Hi! What can I help you with? 
```

##### subagent的工作流

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "messages": [
    {
      "role": "user",
      "content": "Base directory for this skill: /Users/test/code/claude-code-skill-research/.claude/skills/say-hello\n\nrun scripts/hello.sh\n"
    },
    {
      "role": "assistant",
      "content": [
        {
          "type": "thinking",
          "thinking": "The user wants me to run the script `scripts/hello.sh`. They've also provided a base directory for a skill: `/Users/test/code/claude-code-skill-research/.claude/skills/say-hello`\n\nI should run the script. The path could be:\n1. Relative to the current working directory (which is `/Users/test/code/claude-code-skill-research`)\n2. Relative to the skill base directory\n\nLet me try running it. Since the current working directory is `/Users/test/code/claude-code-skill-research`, the script path would likely be `scripts/hello.sh` relative to that, or it could be within the skill directory.\n\nLet me check what's available. I'll try to run the script first and see what happens.\n\nActually, given that the base directory for the skill is provided, the script is likely at `/Users/test/code/claude-code-skill-research/.claude/skills/say-hello/scripts/hello.sh`\n\nLet me run that script.",
          "signature": "Eq0ICkYICxgCKkDugd7USNmyDSocrUDwZIgs5NHZ+c/rCy1NrlCexGsxGojGT34iwzaaRAzlzx8Ej9zyvLcL1W1RcBlABJtseubTEgxgFSMj0JHL/v34/OwaDI8rm6XT4rIsJdZHQCIwfc+IqhSnC2tuc6oAFVemNtHNM8zHjbHe88RSGxRCttWvDstUOwN/yFzsBRWkWJs3KpQHn2gPaqbkB+KO4rHA9zL57EM0U9fag2hq1LudmJQ+EjevffqwidkNw5SQOkxKZi5sWE7bEnBYFLw02stS2B8MPYC/sLlKSXom4/G5EuEDWDK92yOuLa/otpAiVNC897c4m7Tq4EZmPpt52elsdwJFtJSRfn4XWdqP0xi5UeT/h6Z6m0NR3zgF04vpg9HMpo/DYEV0/MxGgKcPODXFOuPfup6LHCsXEH2v2g1TAiqECtUc1Qo/RY2Fc2VV6jrN+vmp8pnwuOUiJuXgSUP4hFIkqZylo9Nwv4tHik2sdzfQW+2RAiKDmsjOjuCLaYEeJ2G6TWEe0kYGzSDiY+Wvl5TXPOPpCtYVrQBWySS7ojMT/1uK9UKD2lPyiiEzYjzlfZ40lLDsJf4YTAXI5IEiiJxi4Du5gxgcq50aanwGXnnbkiYQB8hucKI18CF2NG/7obDyidOYJj56aVLAVqauTFp2Wf6Gw3coY4WZuAokS8uPhucM35oo4Ip+XS5VYwCvVe7iSNqZNgVzntnsipFkEi31F0TKmu9lo/mXEix3p9gjem88JvCAOvGFxorh+1+yPZbK+sIUmwf8DAU+gdb2G1s9Tsiue3aUPiImGY53cxrRWu8OlbJ0GBHNeW/9HrX30Rmx2cV1DkSQpV0VZLES6X8d0q821wqGnF+wPp+QXvN2VDTdQzv74GPnKWKfyDVMlBRIVMZ9Zy4YzOeO5kEDAkXgPKMkTUbfd8f/K97I38+jE9uavVRkyVefjpNkSca89tXCnMMYGormXrkVczZr08Wgny/nJXIS4qapbaoRwVpQWKh8thfVttpkQngktd2152e1iFspfNlnn1PxVJ8EDKvQTKBEXL5hXl6j42XkybXI19za79ppvvViXK/s373IUTtlLeJGZuqUdj1cbtEunNlS0NjDFRMZD6nWdx81tJraJjr7AFKzbuXG57UhUlJ6pR7co3kaCzkpVU899LM0XXoZ702VXy1JvgKIEh8yceQuhGuCVDMT04OeVZMsGk7EPVQpIYLOdMVl08fzrc3096TkFM+wRunonIqDNq/t5pCA/mHiREAOkpSD5ZyFfj1eTY/s5H1vrxJJah26yeHuPRAU4ermSduIx9tcSqioJe/aNK/9HUZTZXDz1eNKw5DUoNCwmeLIa0Tod7Rb+85aGlqTKVyk9EUqhMXBvz4LWn6b4yII2+Ta7wjr+xS3akphBB67TsLQ/BgB"
        },
        {
          "type": "text",
          "text": "I'll run the hello.sh script for you."
        },
        {
          "type": "tool_use",
          "id": "toolu_01ANhWLy3masVW2f6K7dcSTF",
          "name": "Bash",
          "input": {
            "command": "bash /Users/test/code/claude-code-skill-research/.claude/skills/say-hello/scripts/hello.sh",
            "description": "Run the hello.sh script"
          },
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "tool_use_id": "toolu_01ANhWLy3masVW2f6K7dcSTF",
          "type": "tool_result",
          "content": "Hello, World!",
          "is_error": false,
          "cache_control": {
            "type": "ephemeral"
          }
        }
      ]
    }
  ]
}
```

### subagent的 context

[https://github.com/anthropics/claude-code/issues/20492](https://github.com/anthropics/claude-code/issues/20492)

很遗憾, subagent 里并不是fork master context, 看起来就像是运行普通的 agnet 一样, 只是把 Skill 的执行放在了 subagent 中

我尝试了以下做法:

1. 不指定 skill 使用的 subagent
2. 在 skill.md 中要求 load master agent 的上下文
3. 只使用 agent 不使用 context fork

现在看来, 这里的 context fork 指的并不是 fork master agent 的 context, 而是指的是 subagent skill + agent 本身的 context, 其实是一个 new 的 context, 有点失望

# Claude Code Skill 机制研究总结

## 核心发现

### 1. Skill 工具本质

Skill 工具是一个**路由器（Router）** ，而非执行器。它的职责是：

- 将用户意图（自然语言或 `/command`）映射到预定义的能力
- 触发 Skill 的加载，而非直接执行
- 通过 `<command-name>` 标签进行状态管理，防止递归调用

### 2. 执行流程

Skill 调用被拆解为两步：

```
用户输入 → Skill Router → 注入 Skill 内容 → LLM 执行
```

1. **标记注入**：`<command-name>/skill-name</command-name>`
2. **内容注入**：SKILL.md 的实际指令

这不是一个复杂的编排系统，而是**简单的 Prompt 拼接**。

### 3. Skill Folder 的实现

**毫无魔法可言。**

实现方式仅仅是在 Prompt 中显式声明基础路径：

```
Base directory for this skill: /path/to/skill/folder
```

然后依赖 LLM 自行推断相对路径。这是一个脆弱且依赖模型理解能力的设计。

### 4. Context Fork 的真相（最大失望点）

**文档描述具有误导性。**

|官方描述|实际行为|
| --------------------------| -----------|
|"Fork" 主 Agent 的上下文|创建**全新的独立上下文**|
|Subagent 继承对话历史|Subagent **仅接收 Skill 指令**|
|类似子进程 fork|更像是 **spawn 一个新进程**|

实测证明：

- Subagent 无法访问主对话的任何历史
- 不存在真正的上下文继承
- ​`context: fork`​ 的 "fork" 是**名义上的**，实际是 "new"

---

## 最终结论

### 定性评价

Claude Code Skill 系统是一个**工程上极简、能力上有限**的实现：

|维度|评价|
| ------| -----------------------------------|
|**架构复杂度**|低（本质是 Prompt 路由 + 拼接）|
|**扩展性**|中（支持目录结构、多模型）|
|**隔离性**|弱（依赖 LLM 自律，无真正沙箱）|
|**上下文管理**|差（无真正的 fork，仅 spawn）|
|**文档准确性**|存在误导（context fork 名不副实）|

### 核心局限

1. **无真正的 Subagent 上下文继承**：如果你的 Skill 需要依赖主对话的上下文（如"基于之前讨论的方案执行 X"），当前设计无法满足
2. **路径管理依赖模型理解**：Skill Folder 的相对路径解析完全依赖 LLM，存在幻觉风险
3. **状态同步缺失**：Subagent 执行结果仅通过文本返回主对话，无结构化状态同步

‍
