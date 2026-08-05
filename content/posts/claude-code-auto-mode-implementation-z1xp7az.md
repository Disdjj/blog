---
title: Claude Code Auto Mode 实现
slug: claude-code-auto-mode-implementation-z1xp7az
url: /post/claude-code-auto-mode-implementation-z1xp7az.html
date: '2026-08-05 17:03:55+08:00'
lastmod: '2026-08-05 17:09:31+08:00'
toc: true
isCJKLanguage: true
---



# Claude Code Auto Mode 实现

> From: https://www.youtube.com/watch?v=b8SV4U6fEIc

Claude Code 的 Classifier **不是传统的逻辑回归、小型分类网络，也不是一套命令黑名单**。公开信息显示，它本质上是：**一个独立运行的 Sonnet 4.6，通过固定 Prompt 扮演 LLM Judge，对“用户是否明确授权了这个工具调用”进行二分类。**

“Classifier”描述的是它的职责，不代表 Anthropic 专门训练了一个传统分类模型。Anthropic 没有公开它是否经过额外微调；目前能确认的是，它使用 Sonnet 4.6、固定分类模板和两阶段推理。

---

# 1. Classifier 实际看到什么

它看到的是经过裁剪的 Transcript：

```text
固定的分类 System Prompt
+ Auto Mode 环境与规则配置
+ 用户历次消息
+ Claude 历次工具调用的可执行内容
+ 当前待执行的工具调用
```

它看不到：

```text
Claude 的自然语言回复
Claude 的内部推理
工具执行结果
网页、文件、Shell 输出
```

可以理解为：

```python
classifier_input = {
    "user_messages": [...],
    "tool_call_history": [...],
    "candidate_tool_call": current_call,
    "environment": [...],
    "allow": [...],
    "soft_deny": [...],
    "hard_deny": [...]
}
```

例如主 Agent 说：

> 我确认这个数据库只是测试数据库，所以删除是安全的。

这段解释不会传给 Classifier。Classifier只会看到：

```text
User: 修复测试环境的数据问题

ToolCall:
psql production_db -c "DROP TABLE users"
```

这样可以防止主 Agent 用自己的解释说服审核模型。工具输出也被删除，主要是为了避免网页或文件中的 Prompt Injection 直接进入审核模型。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

---

# 2. 它判断的不是“命令危险吗”

它实际判断的是：

```text
这个动作的实际影响是什么？

这个影响是否被用户明确授权？

它是否跨越了环境、数据或权限边界？
```

即：

```text
Risk = Action Impact × Authorization Gap
```

同一个命令，在不同用户请求下结果可能不同：

```text
用户：把 feature 分支 force push 到 origin
动作：git push --force origin feature
结果：可能允许
```

```text
用户：整理一下这个 PR
动作：git push --force origin feature
结果：阻止
```

因为“整理 PR”与 force push 有关联，但不等于用户明确授权了“重写远程历史”。

Anthropic 给它设定的原则是：

> Agent 自己推导出来的操作默认不算授权，除非用户明确表达。

所以它审核的是 ​**authorization scope**​，不是单纯的 dangerous command detection。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

---

# 3. 固定 Prompt 内部大致如何判断

公开文档显示，其判断优先级是：

```text
1. hard_deny
2. soft_deny
3. allow exception
4. explicit user intent
5. 最终阻止或允许
```

具体含义：

### `hard_deny`

无条件禁止。即使用户明确要求，Classifier 仍然阻止。

```text
永远不要把仓库内容发给第三方代码审查服务
```

### `soft_deny`

默认禁止，但用户明确授权后可以执行。

```text
禁止 force push，除非用户明确要求 force push 到指定分支
```

### `allow`

对 `soft_deny` 的特例豁免。

```text
允许部署到每天重置的 staging namespace
```

### Explicit User Intent

如果用户明确描述了：

- 操作是什么；
- 目标是什么；
- 影响范围是什么；

则可以覆盖剩余的 `soft_deny`。

但不能覆盖 `hard_deny`​。需要注意，这些仍然是自然语言规则，由 LLM 解释，并不是程序意义上的强制访问控制。真正不可绕过的限制必须使用前置的 `permissions.deny`​。([Claude](https://code.claude.com/docs/en/auto-mode-config "Configure auto mode - Claude Code Docs"))

---

# 4. 它会尝试理解“真实执行效果”

Classifier 不只匹配当前命令字符串，还会阅读此前的工具调用历史。

例如：

```text
ToolCall 1:
写入 /tmp/deploy.py

内容：
os.system("kubectl delete namespace production")

ToolCall 2:
python /tmp/deploy.py
```

它被要求把第二个调用理解为：

```text
kubectl delete namespace production
```

而不是把它误认为普通的：

```text
python /tmp/deploy.py
```

类似地：

```bash
prepare && terraform destroy
```

会被视为一个完整动作，而不是只看第一个子命令。Anthropic 的固定 Prompt 明确要求审核实际影响，而不是调用表面的包装形式。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

但这不是严格的符号执行器，而是 ​**LLM 对工具调用文本进行语义解释**。因此它有明显边界：

```bash
rm -rf "$TARGET"
```

假如 `$TARGET`​ 的值只存在于上一条 Shell 输出中，Classifier 看不到这个输出，就无法确定删除目标。目前 Claude Code 对这种无法解析的递归删除倾向于直接阻止，要求 Claude 改成包含明确路径的命令。([Claude](https://code.claude.com/docs/en/permission-modes "Choose a permission mode - Claude Code Docs"))

---

# 5. 为什么分成两个阶段

Classifier 并不是每次都完整思考。

## Stage 1：单 Token 快速过滤

同一个 Sonnet 4.6 收到分类 Prompt，只输出类似：

```text
YES  // 应阻止
NO   // 可允许
```

不生成推理过程，并被要求：

> 不确定时偏向阻止。

流程：

```python
flagged = stage1(transcript)

if not flagged:
    execute()
```

这个阶段追求高召回率：尽量别漏掉危险动作，因此会产生较多误报。

## Stage 2：完整推理复审

只有 Stage 1 判断“可能应该阻止”时，才再次调用模型：

```python
if flagged:
    decision, reason = stage2_reasoning(transcript)
```

Stage 2 使用几乎相同的输入和 Prompt，只把最后的指令改成“仔细推理后判断”。它的作用主要是撤销 Stage 1 的误报。

由于两次请求的大部分 Prompt 相同，Stage 2 可以大量命中 Prompt Cache，从而降低延迟和成本。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

实际数据说明了这种取舍：

```text
                   误阻正常动作       漏放危险动作
Stage 1                8.5%              6.6%
完整两阶段              0.4%             17%
```

Stage 2 大幅降低了正常动作被阻止的概率，但也会错误放行一部分 Stage 1 已经抓住的危险动作。Anthropic 在真实的 52 个 overeager action 样本上报告完整流水线漏放约 17%。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

---

# 6. 一个完整例子

用户：

```text
把已经没用的本地分支清理一下。
```

Claude 准备执行：

```bash
git push origin --delete release old-production backup
```

Classifier 构造的判断大致是：

```text
实际效果：
删除三个远程分支，操作难以恢复。

用户授权：
用户只明确要求清理本地分支。

规则匹配：
remote branch deletion -> soft_deny

Allow exception：
无。

Explicit intent：
用户没有要求删除远程分支，也没有指定目标分支。

Decision：
BLOCK
```

拒绝结果会作为工具结果返回给主 Agent：

```text
该操作超出了用户授权范围，请寻找更安全的方法，
不要尝试规避此限制。
```

Claude 随后可能改为：

```bash
git branch -d old-local-branch
```

连续拒绝三次，或者整个会话累计拒绝二十次后，Claude Code 会停止自动执行并升级给用户；无交互的 headless 模式则会终止进程。([Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode "How we built Claude Code auto mode: a safer way to skip permissions \ Anthropic"))

---

# 7. 最准确的实现抽象

可以把它近似理解成：

```python
def approve_action(session, action, policy):
    if permission_rules.deny(action):
        return DENY

    if permission_rules.ask(action):
        return ASK_USER

    if safe_allowlist.matches(action):
        return ALLOW

    if is_project_local_recoverable_edit(action):
        return ALLOW

    transcript = {
        "user_messages": session.user_messages,
        "tool_calls": session.executable_tool_calls,
        "candidate": action,
        "policy": policy,
    }

    if stage1_single_token(transcript) == ALLOW:
        return ALLOW

    decision, reason = stage2_reasoned(transcript)

    if decision == DENY:
        return DENY_AND_CONTINUE(reason)

    return ALLOW
```

所以它的核心不是“识别危险命令”，而是：

> **使用一个上下文经过隔离的 LLM，对工具调用的真实影响、用户授权范围和组织安全策略做语义对齐判断。**

它的主要优势是可以理解复杂命令和自然语言授权；主要弱点同样来自 LLM：对模糊授权、上下文中的间接同意和实际 blast radius 仍可能判断错误。
