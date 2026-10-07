---
title: Agent Model Routing by GPT-6-Astra
slug: agent-model-routing-by-gpt6astra-znro6c
url: /post/agent-model-routing-by-gpt6astra-znro6c.html
date: '2026-10-08 02:55:25+08:00'
lastmod: '2026-10-08 03:55:45+08:00'
toc: true
isCJKLanguage: true
---



# Agent Model Routing by GPT-6-Astra

一个 Coding Agent 完成“给网站加上登录功能”这类任务，往往要调用几十次模型：读文件、设计方案、改代码、跑测试、看报错、再改。这几十次调用对模型能力的要求并不相同。

- 一直用最强的模型：稳，但很多简单步骤也按最贵的价格计费。
- 一直用便宜模型：单次省钱，可能在难点上反复出错，最后总花费反而更高。

**Agent 模型路由**要解决的就是这个矛盾：在 Agent 每次调用模型前，决定这一步交给哪个模型、投入多少推理。把选择、转发、记账集中到一个服务里，就是 **Agent 模型路由网关（Agent Model Routing Gateway）** 。

难点也很直接：**任务成没成功要到最后才知道，路由器却必须现在就做选择。**

这篇文章分四部分：

1. 问题是什么，最直觉的方案为什么不够；
2. 已有的几类方案，以及 11 个代表项目各自做了什么；
3. 两种新思路：**Advisor**（不换模型，执行中请教强模型）和 **Decision 模型**（用专门输出概率的小模型做判断）；
4. 怎样把它们组合起来，以及怎样证明路由真的有用。

---

## 一、Agent 路由到底在路由什么

### 路由器插在哪里

Agent 是一个围绕模型运行的程序：模型决定下一步做什么，**执行程序（Harness）**  实际去读文件、跑命令，再把结果交回模型。Claude Code、Codex 都包含这样的执行程序。模型被调用一次、返回一个答案或一组工具调用，叫做一次**模型调用**（英文资料常写 inference hop）。

路由器就插在每次模型调用之前：

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
user: "用户任务\n给网站加上登录功能" {class: input}
agent: "Agent 执行程序（Harness）\n保存进度，准备下一次模型请求" {class: input}
router: "模型路由器\n这一步交给谁？投入多少推理？" {class: policy}
cheap: "较便宜的模型" {class: good}
strong: "能力更强的模型" {class: warn}
action: "模型提出下一步动作\n读文件 / 改代码 / 跑测试" {class: input}
tool: "执行程序实际调用工具\n输出与成败写入历史" {class: note}
next: "未完成：带着新结果进入下一轮\n已完成：交付给用户" {class: good}
user -> agent -> router
router -> cheap: "能胜任且划算"
router -> strong: "需要更强能力"
cheap -> action
strong -> action
action -> tool -> next
next -> agent: "下一次模型调用"
```

*图 1：模型路由插在 Agent 循环的什么位置。工具执行结果进入下一轮请求，路由器每一轮都有机会重新选择。*

要先说明一点：选“调用搜索工具还是数据库工具”，或者把用户问题分给不同业务 Agent，也常被叫做 Agent routing。本文只讨论**模型选择**以及与之相关的推理投入。

### 同一个任务里，为什么需要换模型

还是看登录功能这个例子。设计方案时，需要理解多个模块之间的关系；方案定下来之后，批量修改相似文件可能很机械；测试持续失败时，又需要重新诊断。任务名字一直是“实现登录”，**但当前这一步需要什么能力一直在变**。

所以路由器可以问两种不同的问题：

|路由器问的问题|能用的信息|容易漏掉什么|
| --------------------------------| --------------------------------------------| ------------------------------------|
|“用户这个问题难不难？”|原始请求、任务类别|Agent 已经做到哪一步、是否陷入失败|
|“Agent 现在这一步需要什么？”|当前请求，加上工具结果、错误、已完成的工作|仍不知道最终结果，但更接近真实需求|

第二种叫 **execution-aware routing（理解执行过程的路由）** 。“理解”不一定要再调一次大模型，统计最近几次工具调用是否失败，也算利用了执行信息。

### 要优化的是三个结果，而不是单次价格

1. **任务能否成功。**  便宜模型反复产出错误补丁，单次再便宜也没意义；强模型也解决不了权限缺失、外部服务宕机这类问题。
2. **整个任务花了多少钱。**  失败的尝试、重试、路由器自己的调用、换模型后重读长历史，全部都要算进去。
3. **用户等了多久。**  多问一次分类器会变慢，便宜模型反复重试也会变慢。

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
direction: right
late: "路径 A：晚升级" {
  direction: down
  cheap: "5 次便宜模型 × 1 = 5\n其中包含无效尝试" {class: warn}
  strong: "1 次强模型 × 10 = 10" {class: policy}
  total: "总成本 = 15" {class: warn}
  cheap -> strong -> total
}
early: "路径 B：先解决难点" {
  direction: down
  strong: "1 次强模型 × 10 = 10" {class: policy}
  cheap: "2 次便宜模型 × 1 = 2" {class: good}
  total: "总成本 = 12" {class: good}
  strong -> cheap -> total
}
note: "教学示例，单位不代表真实价格\n假设两条路径都成功\n真实评估还要计入失败任务、缓存、路由器本身的费用" {class: note}
late.total -> note
early.total -> note
```

*图 2：单次更便宜，不一定让整个任务更便宜。教学示例，单位不代表真实价格。*

路径 B 先用了贵的模型，但少走了弯路，总成本从 15 降到 12。真实系统要回答的是：先用强模型是否**真的**能减少尝试次数，省下的钱是否抵得过切换成本。

### Router 和 Gateway 不是一回事

**Router 负责做选择，Gateway 负责接收、转发和管理请求。**  Router 可以只是一段函数；Gateway 还要处理凭证、预算、请求格式、服务错误和流式返回。比如 Router 决定“这一轮用模型 B”，Gateway 还要决定调用哪个提供 B 的服务地址。某个地址过载就换一个地址，这是**服务调度**；Agent 卡在难题上就换更强的模型，这是**能力选择**。两者不要混为一谈。

---

## 二、三个最直觉的方案，以及它们的坑

### 起点：一直用一个强模型

这是最重要的对照组：不用猜难度，行为也一致。缺点是简单步骤也按高价计费。**如果路由器不能在保持质量的前提下比它更便宜或更快，就证明不了增加路由的价值。** “一直用便宜模型”是另一个必要的对照组：有些任务本来就不需要强模型。

### 直觉一：简单的用便宜模型，复杂的用强模型

```text
包含“架构设计”“复杂推理”等关键词 → 强模型
问候、改格式、简短问答 → 便宜模型
其他 → 默认模型
```

规则便宜、透明，但“简单”和“复杂”很难从字面判断。一句很短的“继续修”，可能发生在第五次测试失败之后；一段很长的请求，可能只是让模型照格式复制内容。更麻烦的是，Agent 每轮都会带上操作规则、工具定义、历史结果：看整个请求的长度，每轮都显得很难；只看最后一句，每轮又都显得很简单。

### 直觉二：先用便宜模型，失败了再升级

关键在于：**什么才算失败？**

|现象|是否说明需要强模型|
| --------------------------------| ---------------------------------------------|
|模型服务返回 429（请求过多）|应该处理限流或换服务地址，不需要更强模型|
|服务正常返回，但代码测试不通过|可能需要诊断或升级，HTTP 成功不等于任务成功|
|Agent 多次执行同一条命令|可能卡住了，也可能是在等外部状态或正常复测|
|测试失败，原因是数据库没启动|该修环境，换更强的模型没有用|

“失败后升级”的主要工作量在于分辨失败原因。此外还要防两件事：刚升级就马上降回去，导致修复过程反复换模型；或者升级后一直停在强模型上，失去节省。

### 直觉三：先问一个小模型

让一个便宜的**分类器（classifier）**  判断“这一步该交给谁”。它比关键词更懂语义，但多了一次调用，而且自己也会判断错。没看到失败历史，它照样会把“再试试”判成简单；每轮都读一遍巨长的历史，分类本身又慢又贵。

这三个方案已经引出了后面所有项目都绕不开的四个问题：

> **给路由器看什么？用什么方法判断？怎样安全地切换？怎样知道判断有效？**

后面要讲的 Decision 模型，可以看作是对“直觉三”的一次重新设计；Advisor 则换了一个角度：**能不能不换模型，只在关键时刻借用强模型的判断力？**

---

## 三、方案全景

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
direction: down
before: "调用前选模型\n（谁来回答这一步）" {
  direction: down
  fixed: "固定模型\n最简单的对照组" {class: note}
  request: "按请求选择\nRouteLLM / OpenRouter Auto" {class: input}
  exec: "按执行过程选择\nSwitchyard / LiteLLM / vLLM SR" {class: policy}
  learned: "从历史结果学习\nLLMRouter / RouteLLM" {class: policy}
  decision: "新：Decision 模型做判断\nJev / Jev Router" {class: new}
}
after: "先做再说\n（用结果修正选择）" {
  direction: down
  cascade: "级联：先答再验证\nAutoMix" {class: warn}
  bandit: "在线调整\nLiteLLM Adaptive / TensorZero" {class: warn}
}
during: "执行中求助\n（不换主模型）" {
  direction: down
  advisor: "新：Advisor 顾问\nClaude advisor tool / openrouter:advisor" {class: new}
  multi: "路由器自己多轮提问\nRouter-R1" {class: good}
}
cross: "横跨所有方案：整段任务成本与缓存\nNot Diamond Code / vLLM 会话评分 / Jev Router" {class: note}
before -> after: "结果不可靠时"
after -> during: "只在关键节点花钱"
during -> cross
```

*图 3：已有方案与两种新思路。紫色粗框是本文新增的两种方式。越往下，越依赖执行过程中的信息。*

按“在什么时候做选择”，可以把现有做法大致分成三组：

- **调用前选模型**：固定模型、按请求选、按执行过程选、从历史结果学习，以及新出现的 **Decision 模型**。
- **先做再修正**：级联（先答再验证）、在线调整（bandit）。
- **执行中求助**：路由器自己组织多轮提问（Router-R1），以及新出现的 **Advisor**。

横跨所有方案的还有一层：**整段任务的成本和缓存**。下面逐类介绍。

### 3.1 按请求选择：这个问题适合哪个模型

输入主要是问题文字和任务类别，做法可以是人工规则，也可以是训练好的小评分器。适合问答、翻译、摘要这类相对独立的请求。短板是**看不到执行历史**。

- **RouteLLM**：准备一强一弱两个模型，让路由器给问题打分，预测“强模型的回答有多大可能更受偏好”，超过门限就用强模型。其中一种实现是矩阵分解（MF），可以理解为一个学过历史偏好数据的小评分器。但它的 Controller 默认只把**最后一条消息**交给路由算法，几轮之后最后一条可能只是一段工具输出，路由器根本不知道修复过程已经失败了好几次。另外，“偏好分数”也不等于“补丁能通过测试”。它很适合当基线：复杂的执行路由要先证明自己比它强。
- **OpenRouter Auto Router**：先识别任务类型，再参考过去七天社区在同类任务上的花费分布，结合用户选择的价格档位挑模型。好处是能跟上模型市场的变化；但“大家花钱多”不等于“最适合你这一步”。

### 3.2 按执行过程选择：看工作有没有进展

输入加上最近的工具调用、错误、测试结果，判断 Agent 是在正常推进还是在原地打转。

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
trace: "最近的工具调用与结果\n读文件 → 改代码 → 测试失败 → 同样失败" {class: input}
signals: "提取信号\n错误严重度 / 重复失败 / 只探索不产出 / 正在改文件" {class: input}
hard: "直接升级的情况？\n重复失败 / 严重错误 / 上下文被压缩" {shape: diamond; class: warn}
score: "加权打分\n失败与停滞 → 往强模型加分\n持续产出 → 往便宜模型加分" {class: policy}
band: "分数越过门限？" {shape: diamond; class: policy}
abstain: "弃权：交给分类器\n或使用事先约定的默认档位" {class: note}
strong: "较强档\n升级后短暂保持（hold）" {class: warn}
weak: "较便宜档" {class: good}
trace -> signals -> hard
hard -> strong: "是"
hard -> score: "否"
score -> band
band -> strong: "偏强"
band -> weak: "偏省"
band -> abstain: "拿不准"
```

*图 4：把工具结果变成“升级还是节省”的依据（Switchyard 风格）。“弃权”的意思是当前方法拿不准，请求照常执行，只是交给下一层方法或默认档位。*

- **Switchyard（NVIDIA NeMo）Stage Router**：从工具轨迹里提取几类**信号**：错误严重程度、重复失败、只探索不产出、正在改文件。失败和停滞往强模型方向加分，持续产出往便宜模型方向加分。重复失败、严重错误、检测到上下文被压缩（compaction），会直接升级。升级后默认**保持（hold）** 两次请求，避免刚开始修复就被一次正常的文件修改切回便宜模型；测试干净通过可以提前解除。它的 ​`confidence` 只是分数的强度，不是“80% 概率成功”这样的统计保证。官方独立 server 也明确只是演示用途。
- **LiteLLM Complexity Router**：先从很长的 Agent 请求里**提取真正的用户要求**（跳过纯工具输出和运行提醒），再分到简单/中等/复杂/推理几档。开启卡住检测后，默认看最近 6 次工具调用：如果**最新一次**调用（工具名+参数）在窗口里重复至少 3 次，就升一档。锚定最新一次是为了不被旧失败干扰：前三次失败、第四次已经转去改文件了，就不该再升级。它的难点在于组合：卡住升级和“整个会话固定模型”互斥，一些插件和自适应选择也不能同时开。
- **vLLM Semantic Router**：把判断拆成 Signal（观察到什么）→ Projection（组合成分数或类别）→ Decision（哪些模型可以参与）→ Selector（在候选里选一个）四层。它最值得学的是会话内切换的处理方式：

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
facts: "会话事实\n当前模型 / 工具循环 / 历史长度 / 缓存 / 剩余预算" {class: input}
can: "第一步：能不能换？\n新模型读得下历史吗？支持这些工具吗？\n私有状态能交接吗？" {class: warn}
keep: "保持当前模型\n（硬约束，不靠分数绕过）" {class: note}
worth: "第二步：值不值得换？\n质量收益 − 交接成本 − 缓存重建 − 频繁切换惩罚" {class: policy}
gate: "第三步：证据够不够？\n刚换过吗？退步能归因到模型吗？" {class: warn}
commit: "执行选择\n同时记录采用和拒绝的理由" {class: good}
facts -> can
can -> keep: "不能"
can -> worth: "能"
worth -> keep: "不划算"
worth -> gate: "划算"
gate -> keep: "证据不足"
gate -> commit: "通过"
```

*图 5：先问“能不能换”，再问“值不值得换”。不兼容属于硬约束，不能被高质量分数抵消；缓存损失属于可以权衡的成本。*

vLLM 的会话选择器会比较“留在当前模型”（连续性、缓存加分）和“换一个”（质量收益减去交接、缓存重建、频繁切换的扣分）。可选的进展门控（Progress Gate）只能批准或抑制已有的切换建议，不会凭空生成升级；它默认关闭，开启后默认也只是观察模式。代价是部件和配置多，而且分数需要真实数据支撑，否则加分扣分都只是人为假设。

### 3.3 先回答，再验证：级联

让小模型先作答，再检查回答是否可信，不可信再交给大模型重做。这叫**级联（cascade）** 。它比只看输入多了一份“实际回答”作为证据，代价是小模型作答和验证本身的费用。验证器太宽松会放过错误，太严格就变成每次都调好几个模型。**AutoMix** 是代表，LLMRouter 里有实现。

### 3.4 从历史结果学习：找到模型各自的专长

先让多个候选模型跑同一批任务，记录质量和成本，得到一张“任务 × 模型”结果表，再训练路由器预测新任务该用谁。**LLMRouter（UIUC）**  是一个把多种算法放进同一套训练评估流程的研究框架：

|算法|做法|主要不足|
| ----------| --------------------------------------------| --------------------------------|
|KNN|找相似的历史问题，沿用它的最佳模型|默认标签取最高质量，不考虑价格|
|RouterDC|学习问题和模型的向量，让合适的模型得分更高|需要覆盖充分的训练结果|
|AutoMix|小模型先答、自验证、必要时升级|验证可能失准|

要注意：表里记录什么目标，模型就学什么。只记录质量，它就会学着一直选最强的。此外，独立问答的结果表模拟不了 Agent：换一个模型之后补丁不同，后续测试结果也不同，必须真的重新运行。

### 3.5 在使用中调整：bandit 与实验

- **LiteLLM Adaptive**：用 **Thompson Sampling**，从每个模型当前效果的不确定估计中抽样，再结合价格打分，让不太确定的候选也有机会被试用。问题是反馈可能误导：用户说“谢谢”不代表代码正确，工具故障也不一定是模型的错。
- **TensorZero**：目标不同，它比较的是**哪一整套配置更好**（不同模型、提示词，甚至不同路由策略），用 Track-and-Stop 收集证据，确定赢家后停止探索。同一次任务（episode）尽量保持同一个实验变体。它补的是**评估层**，不是执行状态提取。

### 3.6 让路由器自己组织多轮求解

**Router-R1** 的路由器本身就是一个模型：用 ​`search`​ 标签向候选模型提子问题（这里的 search 不是网页搜索），结果放回上下文，必要时继续问，最后用 ​`answer` 输出。它用强化学习训练，奖励兼顾答案质量（EM/F1）、格式和调用成本；质量为零时，不会因为便宜而得分。但原论文主要评估问答任务。如果把它嵌进一个已有的 Agent，会出现两层执行循环，必须讲清楚谁执行工具、谁拥有任务状态、谁负责停止。

### 3.7 横跨一切：整段任务成本与缓存

Agent 每轮都会重复发送相同的规则和历史，模型服务可以复用之前对相同前缀的计算，这就是**提示缓存（prompt cache）** 。缓存是**按模型分别记账**的：

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
grid-rows: 4
grid-columns: 3
grid-gap: 18
h1: "时刻" {class: input}
h2: "模型 A 的缓存" {class: input}
h3: "模型 B 的缓存" {class: input}
t1: "t1：调用 A" {class: note}
a1: "写入 A 的前缀缓存" {class: good}
b1: "尚未建立" {class: note}
t2: "t2：切到 B" {class: note}
a2: "A 的缓存可能仍在" {class: good}
b2: "B 从零开始重读整段历史" {class: warn}
t3: "t3：切回 A" {class: note}
a3: "地址、前缀、TTL 都满足\n才可能命中 A 的缓存" {class: good}
b3: "B 的缓存独立存在\n不会转移给 A" {class: good}
```

*图 6：不同模型的缓存分别计算。切到 B 并不会把 A 的缓存带过去。*

所以即使 B 的单价更低，这一轮的实际成本也不一定更低。**Not Diamond Code** 的公开目标就是“当前质量 + 整段会话总成本”，并且同时选择模型和 **reasoning effort（推理投入程度）** ；但它的核心算法闭源，默认只上传元数据，请求正文和对话记录需要用户主动开启才会收集。

这里有一个根本冲突：**固定模型有利于连续性和缓存，却可能挡住必要的升级。**  下面两种新思路，正是从不同方向绕开这个冲突。

### 3.8 两个基础设施型项目

- **LangChain Middleware**：在 ​`wrap_model_call`​ 中拿到请求、历史、工具和运行状态，用 ​`request.override(model=...)`​ 换模型。它不提供选择算法，但提醒我们：**关键状态最好由知道事实的执行程序直接传出来**，网关的分类器再聪明，也补不回它没收到的信息。
- **Portkey**：按 metadata 或请求参数做条件路由，外加失败回退、负载均衡。Agent 上报 ​`repeated_test_failure=true`，就可以写规则转到强模型。但“谁来识别 repeated test failure”是另一个问题。

---

## 四、新思路一：Advisor —— 不换模型，执行中请教强模型

### 它想解决什么

前面所有方案都在回答“这一步**交给谁**”。一旦决定升级，就要把整段对话交给另一个模型，于是付出交接成本、重读历史、缓存失效。

Advisor 换了一个问法：**能不能让便宜模型从头干到尾，只在关键决策点借用强模型的判断力？**

这个模式由 Anthropic 在 2026-04-09 的博客 *The advisor strategy* 中正式命名，并以服务端工具 ​`advisor_20260301`​ 的形式上线 Claude Platform（beta）。Claude Code 里对应 ​`/advisor`​ 命令。2026-06 OpenRouter 推出了跨厂商的 ​`openrouter:advisor`。

### 它怎样工作

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
app: "你的应用\n一次 Messages 请求，tools 里带上 advisor" {class: input}
executor: "Executor（便宜模型）\n全程负责：调工具、读结果、迭代、写最终答案" {class: good}
tools: "普通工具\n读文件 / 改代码 / 跑测试" {class: note}
ask: "关键节点：调用 advisor()\n无参数，只表达“现在需要建议”" {class: policy}
advisor: "Advisor（强模型）\n读取完整对话记录\n不调用工具，不对用户输出" {class: new}
advice: "advisor_tool_result\n一份计划 / 一个纠正 / 一个停止信号" {class: new}
result: "最终响应\n用量按两个模型分别计费" {class: input}
app -> executor
executor -> tools: "大多数步骤"
tools -> executor: "结果"
executor -> ask: "开工前 / 卡住时 / 收尾前"
ask -> advisor: "服务端转发完整上下文"
advisor -> advice
advice -> executor: "继续执行"
executor -> result
```

*图 7：Executor 主导、Advisor 只给建议。整个求助过程发生在一次* ​ *​`/v1/messages`​*​ *请求内部，应用不需要多做一轮往返。*

两个角色：

- **Executor（执行者）** ：较便宜的模型，例如 Sonnet 或 Haiku。负责全部工作：调工具、读结果、迭代、写最终答案。
- **Advisor（顾问）** ：更强的模型，例如 Opus。它**不调用工具，也不直接对用户输出**，只返回一份计划、一个纠正或一个停止信号。

以 Claude 的实现为例，一次求助的过程是：

1. Executor 像调用普通工具一样发出 ​`server_tool_use`​，​`name: "advisor"`​，​**​`input`​**​ **为空**。Executor 只决定“什么时候问”，上下文由服务端补齐。
2. 服务端用 Advisor 模型另跑一次推理。Advisor 使用 Anthropic 提供的系统提示，并以引用的形式收到 Executor 的**完整对话记录**：系统提示、工具定义、之前的轮次和工具结果，以及本轮已经生成的内容。
3. 建议以 ​`advisor_tool_result` 块返回给 Executor（Advisor 的思考过程会被丢弃，只留建议文本），Executor 接着往下做。

接入只需要在请求里加一个工具：

```json
{
  "model": "claude-sonnet-5-5",
  "tools": [
    {
      "type": "advisor_20260301",
      "name": "advisor",
      "model": "claude-opus-5-5",
      "max_uses": 3,
      "max_tokens": 2048
    }
  ]
}
```

请求头需要带上 ​`anthropic-beta: advisor-tool-2026-03-01`。几个工程上需要注意的地方：

|关注点|官方行为|
| ----------| ----------------------------------------------------------------------------------------------------------------------------------------|
|次数上限|`max_uses`​ 是**单次请求**的上限，超出后返回 ​`max_uses_exceeded`​ 错误，Executor 继续工作但拿不到建议。没有会话级上限，需要在客户端自己计数，到上限后把工具从 ​`tools` 里移除|
|计费|Advisor 按自己的价格单独计费；顶层 ​`usage`​ **只包含 Executor 的 token**，Advisor 的用量在 ​`usage.iterations[]`​ 中，​`type`​ 为 ​`advisor_message`|
|缓存|两层相互独立：Executor 侧的建议块可以像普通内容一样缓存；Advisor 侧需要打开 ​`caching`​，大约**调用三次以上**才能回本|
|流式|Advisor 那一段**不流式**，Executor 的输出流会暂停，建议整体一次性到达|
|输出长度|建议给 Advisor 设置 ​`max_tokens: 2048`。官方在一个高难推理测试上（每组 n=40）测得平均输出减少约 7 倍，质量没有可检测的下降|
|模型配对|Advisor 必须至少是 Sonnet 4.6，且能力不低于 Executor；非法组合返回 400|

### 厂商公布的效果

以下数字来自 Anthropic 官方博客，是厂商自报：

- **SWE-bench Multilingual**：Sonnet + Opus advisor 比 Sonnet 单独跑高 2.7 个百分点，**每个任务的成本反而低 11.9%** 。
- **BrowseComp**：Haiku + Opus advisor 得分 41.2%，Haiku 单独跑是 19.7%；整体得分比 Sonnet 单独跑低 29%，但每个任务的成本低 85%。

为什么加了一个更贵的模型，成本反而可能下降？官方的解释是：在编码和 Agent 任务中，好的早期计划能**减少工具调用次数和对话长度**。少走的弯路省下的 Executor token，抵过了 Advisor 那几次调用的费用。这和图 2“先解决难点”的逻辑是一样的，只是它不需要换模型。

### 什么时候该问：这是 Advisor 的核心难题

Advisor 把“何时升级”的判断交给了 **Executor 自己**。这样做的好处是 Executor 拥有最完整的现场信息；风险是它不一定会问，或者不在该问的时候问。官方文档明确说，**在编码任务上 Executor 默认会少调用 Advisor**，因此给出了一段建议的系统提示，核心是：

- **实质性工作之前先问**：先做必要的摸底（找文件、看现状），然后在写代码、确定理解方式之前调用 Advisor。摸底不算实质性工作。
- **认为完成之前再问一次**：先把结果落盘（写文件、提交），再调用。如果会话在等待期间中断，已落盘的结果不会丢。
- **卡住时问**：错误反复出现、方法不收敛、结果对不上的时候。
- **出现分歧时再问一次**：自己查到的证据和建议矛盾时，不要悄悄换方向，而是带着证据再问一次，让 Advisor 来裁决。

还有两个细节：对 Haiku 这类 Executor，可以在对话中途追加提醒消息；Opus 5.5、Sonnet 5.5 等较新的 Executor 不接受用 ​`tool_choice` 强制调用工具，只能通过提示来引导。

官方也写明了**不适用**的场景：单轮问答（没什么可计划的）；用户已经自己选好成本与质量取舍的纯转发模型选择器；以及每一轮都确实需要强模型全部能力的工作。

### OpenRouter 的版本有什么不同

`openrouter:advisor` 把同一个思路扩展到任意厂商：

- **任何模型都能当 Executor，任何厂商的模型都能当 Advisor**，例如用 GPT-4o Mini 执行、Claude Fable 5 当顾问。
- 可以配置**多个具名顾问**，比如一个 ​`security-reviewer`​、一个 ​`architect`​，每个都有自己的 ​`instructions`。Executor 看到的是多个独立工具，按问题去问对应的顾问。
- 和 Claude 版的无参数调用不同，这里 Executor 要提供一个 ​`prompt` 说明需要什么帮助。
- Advisor 只回答一轮，不运行自己的工具循环；子调用里会去掉 advisor 工具，防止递归；每个请求的调用次数有上限。
- 官方估计，一次 50 次工具调用的编码会话里，可能只有 2–3 次会去问 Advisor。

### Advisor 和路由、子代理有什么区别

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
direction: right
router: "路由 / 级联：换人来做" {
  direction: down
  r1: "路由器在调用前选择模型" {class: policy}
  r2: "被选中的模型执行这一步" {class: input}
  r3: "失败或升级时\n换另一个模型接手" {class: warn}
  r4: "代价：交接、重读历史、缓存失效" {class: note}
  r1 -> r2 -> r3 -> r4
}
orch: "编排者 / 子代理：大模型指挥" {
  direction: down
  o1: "大模型拆解任务" {class: warn}
  o2: "小模型各自带工具完成子任务" {class: input}
  o3: "大模型汇总" {class: warn}
  o1 -> o2 -> o3
}
adv: "Advisor：小模型主导，大模型出主意" {
  direction: down
  a1: "小模型从头到尾执行" {class: good}
  a2: "自己判断何时求助" {class: policy}
  a3: "大模型只看记录、只给建议" {class: new}
  a4: "小模型继续执行，任务所有权不变" {class: good}
  a1 -> a2 -> a3 -> a4
}
```

*图 8：三种“大小模型协作”的职责划分。Advisor 和常见的“大模型编排、小模型执行”正好反过来。*

||路由 / 级联|编排者 / 子代理|Advisor|
| ----------------| --------------------------------| ------------------| ---------------------------|
|谁主导任务|路由器选出的模型（可能中途换）|大模型|**小模型**|
|大模型做什么|接手整个步骤|拆任务、汇总|读记录、给建议|
|谁决定用大模型|外部路由器|固定架构|**Executor 自己**|
|切换成本|交接、重读历史、缓存失效|子任务上下文隔离|只有 Advisor 自己那次推理|
|主要风险|路由判断错误|编排开销|Executor 不问或问得不对|

**放进网关语境，Advisor 不是“路由器的替代品”，而是路由器之外的另一个动作。**  路由器决定这一步由谁执行；Advisor 让执行者在这一步内部还有一个“请教”的选项。两者可以叠加：网关选 Sonnet 当 Executor，同时在 ​`tools` 里给它挂一个 Opus Advisor。

### Advisor 的不足

1. **依赖 Executor 的自知之明。**  模型对自己什么时候会出错的判断并不可靠，需要靠提示和中途提醒来弥补，这本身就要调参。
2. **建议不等于正确。**  Advisor 只看记录、不看真实环境，也可能出错。官方提示强调：执行中有一手证据与建议矛盾时，要带着证据再问一次。
3. **能力差距越小，收益越小。**  官方文档指出，Executor 本身能力越接近 Advisor，收益越小。
4. **可观测性。**  用较新的 Opus 5 当 Advisor 时，返回的是加密的 ​`advisor_redacted_result`，客户端看不到建议原文，只有服务端在下一轮解密。想审计建议内容，要选返回明文的 Advisor 模型，比如 Opus 4.8。
5. **成本仍要按整段任务核算。**  每次求助都会把完整记录发给贵的模型。Advisor 侧缓存要调用三次以上才回本，问得太勤，省下的钱就没了。

---

## 五、新思路二：Decision 模型 —— 让判断变成一个概率

### 回到“直觉三”的老问题

用小模型判断“该用哪个模型”，常见写法是给一个通用 LLM 写提示：“请判断这个请求属于简单还是复杂，只回答一个词。”然后解析它的回答。这有几个毛病：

- 输出是文字，要解析，偶尔还会格式出错；
- 没有可靠的不确定度，“简单”就是“简单”，看不出它有多拿不准；
- 阈值和分支藏在提示词里，难以测试、难以做版本管理；
- 用一个会写长文的模型来答一道选择题，又慢又贵。

**Decision 模型**专门针对这一步：**它不生成文字，只对事先声明好的问题返回带概率的类型化答案。**  阈值和分支逻辑留在你自己的代码里。

### 代表：TypeSafe Jev

**Jev** 是 TypeSafe 推出的第一个 Decision 模型，TypeSafe 把它叫做 “System One” 模型（借用卡尼曼“快思考”的说法）。2026-09-15 通过 OpenRouter 的 alpha 版 **Decisions API** 开放早期访问：

- 接口：​`POST https://openrouter.ai/api/alpha/decisions`​；模型 ID 为 ​`typesafe/jev-1.13`​，别名 ​`~typesafe/jev-latest`。
- 输入：一段文本形式的应用状态 ​`state`​，加上一个或多个类型化问题 ​`questions`。只接受文本。
- 三种问题类型：

|类型|用途|返回|
| ------| --------------------------------| --------------------------------------------|
|**Choice**|从几个选项里选一个|选中的项、每个选项的概率、confidence|
|**Noul**|判断某个条件是否成立|“是”的概率（没有单独的 confidence）|
|**Score**|在有序等级上打分（最多 10 级）|按概率加权的位置、每一级的概率、confidence|

- 价格：每百万输入 token 0.042 美元，**输出免费**。OpenRouter 博客的例子是一次三个问题的调用，用了 447 个输入 token，约 0.000019 美元。
- 限制：不输出推理过程和解释，不调用工具，不进行对话；不适合精确算术、日期计算和规则逻辑（这些交给正则或数据库更合适）；闭源，没有公开权重或论文。

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
state: "应用状态（state）\n最近工具结果、错误次数、当前计划……" {class: input}
q: "类型化问题（questions）\nChoice：选哪一档？\nNoul：这一步需要更强模型吗？\nScore：难度 1–5 级？" {class: input}
jev: "Decision 模型（如 Jev）\n一次读完，只输出概率\n没有自由文本，不调用工具" {class: new}
out: "类型化答案\n每个选项的概率 + 集中程度（confidence）" {class: new}
code: "阈值写在受版本控制的代码里" {shape: diamond; class: policy}
auto: "高概率：自动执行\n例如直接升级到强模型" {class: good}
review: "中间区间：保守处理\n保持现状 / 交给分类器 / 请 Advisor" {class: warn}
human: "接近 0.5 或高风险：\n交给人或默认策略" {class: note}
log: "审计日志\n请求编号、问题名、概率、所用阈值" {class: note}
state -> jev
q -> jev
jev -> out -> code
code -> auto
code -> review
code -> human
code -> log
```

*图 9：Decision 节点——模型给概率，代码定分支。模型只负责“估计”，“怎么做”由受版本控制的代码决定，每次判断都能写进审计日志。*

### 为什么“输出概率”很重要

OpenRouter 的介绍文章里有几条实用建议，对网关设计很有参考价值：

- **校准只在平均意义上成立。**  0.8 的意思是在大量回答中大约 80% 是对的，单个回答仍然可能错。所以阈值应该用你自己的标注数据来定，作者建议几百条样本。
- **confidence 衡量的是概率分布有多集中，不是答案对不对。**
- **概率在多次调用间会轻微波动**（同一张工单，一次 0.79，一次 0.84），所以要用**区间**而不是精确值做判断。TypeSafe 推荐分三段：自动执行；执行但需复核或确认；交给人。
- **接近 0.5 本身就是一个信号。**  作者对同一个模糊输入得到 0.52 和 0.49，建议把这种情况当作第三种结果：追问，或者升级。
- **审计日志**记录请求编号、问题名、概率和所用阈值，不记录客户的 ​`state` 原文。

放到路由里，这意味着可以把“该不该升级”写成：

```text
state = 最近 6 次工具调用摘要 + 最新测试结果 + 当前计划步骤
Noul  "当前便宜模型能独立完成下一步吗？"
Score "这一步需要的推理深度（1–5）"

p_ok = 能完成的概率
if p_ok > 0.85:         继续用便宜档
elif p_ok < 0.30:       升级到强档（并设置 hold）
else:                   保持现状 + 给 Executor 挂一个 Advisor
```

这里的阈值只是示意，必须用自己的任务数据来校准。注意最后一个分支：**Decision 模型拿不准的区间，正好可以交给 Advisor 处理**，不必立刻换模型。

### Jev Router：Decision 模型做成路由器

2026-09-25，OpenRouter 上线了 ​`typesafe/jev-router`​，用 Jev 为每个请求选择**下游模型和 reasoning effort**。Jev 自己不写回答，回答由被选中的生成模型完成。根据 OpenRouter 的发布说明：

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
turn: "新的一轮请求\n（OpenAI 兼容 chat completions）" {class: input}
score: "Jev 读取对话文本并打分\n任务类型 / 难度 / 精确度要求\n更大模型或更多推理是否有帮助\n便宜模型是否已够 / 任务是否变了" {class: new}
stay: "当前模型仍合适？" {shape: diamond; class: policy}
effort: "保持模型\n只调高或调低 reasoning effort" {class: good}
switch: "预期收益 > 切换成本？\n（含失去的缓存）" {shape: diamond; class: warn}
keep: "继续用当前模型" {class: good}
change: "切换到新模型" {class: warn}
fail: "Jev 超时或输出无效：\n请求直接失败，没有内置回退" {class: note}
turn -> score -> stay
stay -> effort: "是"
stay -> switch: "否"
switch -> change: "是"
switch -> keep: "否"
score -> fail: "异常"
```

*图 10：Jev Router 每一轮怎样决定（根据公开描述整理）。内部算法未公开，此图只是对官方文字描述的流程化整理。*

- 每轮之前，Jev 读取对话并评估：任务类型、**难度**、**精确度要求**、更大模型或更多推理是否有帮助、便宜模型是否已经够用、**任务是否变了**。
- **尽量不在会话中途换模型**：当前模型合适就继续用；能通过调整 reasoning effort 解决的就只调 effort；只有预期收益大于切换成本（包括失去的缓存）时才换。
- OpenRouter 自己总结了它要解决的两个问题：每条消息都换模型会让缓存全部失效；大多数路由器按任务**类型**而不是**难度**分配，简单和困难的编码任务拿到的是同一个模型。
- 隐私：附件不会发给 Jev；支持 ​`zdr: true`。
- **没有内置回退**：Jev 调用超时或返回无效结果时，请求直接失败，不会悄悄换成别的路由器。生产环境要自己加重试和固定的兜底模型。
- OpenRouter Chat 会显示每一轮选了哪个模型，以及背后的任务、难度、精确度、大模型收益等分数。

效果数据同样是厂商自报：OpenRouter 称在四个 Agent 基准上，Jev Router 完成了 423 个任务中的 237 个，Auto Router 是 130 个。同时也有用户在社交媒体上报告，自己测试的结果与固定使用某个模型相近，花费略高、耗时更长。**没有公开的任务集、模型池和原始结果，无法独立复现。**

### 让 Decision 节点成为通用设计模式

Decision 模型并不只服务于模型路由。几个相关信号：

- 2026-09-29，OpenRouter 发布了 ​`openrouter-decisions` 技能：把编码 Agent 指向代码中的分类、路由或审核步骤，它会用 Decisions API 重建这一步。官方数据是：没有这个技能时，27 次编码运行中只有 4 次用上了 Decision 模型；用了技能后 27 次全部用上。
- 社区的 Agent 设计模式目录把它收录为 **semantic-decision-node**：在分支点上，小型决策模型只回答一个声明好的问题，以类型化概率返回；阈值和分支留在版本化的 harness 代码中，控制流因此确定、可审计。
- 学术上，Wei Sun 的论文 *Decision-Centric Design for LLM Systems*（arXiv 2604.00414，2026-04）给出了同样的架构原则：把**决策相关信号**和**把信号映射到动作的策略**分开，让“回答、追问、检索、调用工具、修复还是升级”成为一个显式、可检查的层。失败就能归因到三处之一：信号估计、决策策略或执行。

这和前文 vLLM Semantic Router 的 Signal → Decision → Selector 分层是同一个思想。区别在于，Jev 这类 Decision 模型把“从文本中估计信号”这一步做成了一个便宜、带概率的专用模型。

### Decision 模型的不足

1. **它只是更好的“估计器”，不会自动看到执行状态。**  你传什么 ​`state` 给它，它就只看到什么。执行程序要把工具结果、错误次数等事实整理好再交给它，这一点和 LangChain 中间件的启示一致。
2. **阈值要自己校准。**  厂商的校准是平均意义上的；你的任务分布、你的“成功”定义都不同，必须用自己的标注数据确定区间。
3. **又多了一跳外部依赖。**  虽然便宜，但它是一次额外的网络调用；Jev Router 甚至不提供回退。延迟和失败处理都要自己验证。
4. **闭源、alpha 阶段。**  没有公开权重或论文，接口仍处于 alpha，版本升级可能改变概率分布，阈值也要跟着重新校准。
5. **不解释原因。**  需要向用户或审计方解释时，官方建议的做法是：Decision 模型负责判断，另用一个聊天模型撰写说明。

---

## 六、放在一起看

### 它们不是在做同一件事

|方式 / 项目|核心问题|真正提供的东西|用之前还缺什么|
| ----------------------| --------------------------------------| --------------------------------------| ----------------------------------------|
|RouteLLM|这个问题值不值得用强模型|学习型请求评分|执行信息和 Agent 任务评估|
|Switchyard|最近的工作是否需要更强能力|工具信号、升级规则、短期保持|按业务调规则、承载它的服务|
|LiteLLM|怎样把智能选择接进网关|分类、卡住检测、部署调用的组合|选定一条配置路径并做任务测试|
|vLLM Semantic Router|怎样分层组合策略、控制会话内切换|信号/规则/候选分层、会话评分|可信的评分依据与运维投入|
|Not Diamond Code|怎样降低整段会话成本|托管的模型与推理投入建议|对闭源策略做业务验证|
|LLMRouter|哪种算法适合手头的数据|训练、推理、比较框架|真实 Agent 轨迹与质量标签|
|Router-R1|能否学会多轮调用与综合|可训练的路由 Agent|与外层 Agent 的职责划分|
|LangChain Middleware|在哪里截获每次模型调用|能读取执行状态的入口|选择策略本身|
|OpenRouter Auto|怎样跟着市场选模型|托管分类与候选更新|对你工作流的适用性证明|
|TensorZero|哪套配置更好|任务反馈与自适应实验|可评价的任务指标|
|Portkey|怎样按明确策略可靠转发|条件规则与网关基础能力|执行状态提取和智能策略|
|**Advisor**|能否不换模型就借到强模型的判断|Executor 主导、按需请教的服务端工具|求助时机的提示调优、整段任务的成本核算|
|**Decision 模型 / Jev Router**|能否把“判断”做成便宜、带概率的一步|类型化概率答案、按难度与会话粘性路由|自己的阈值校准、失败回退、执行状态整理|

所以不要给它们排一个“智能程度”星级。LangChain 是接入点，TensorZero 是实验机制，Switchyard 是策略库，LiteLLM 和 Portkey 承担大量服务职责；**Advisor 是执行模型的一个工具，Decision 模型是判断环节的一个零件。**

### 两种新方式分别补上了哪块短板

回到前面的四个问题：

1. **看得到**：都没有魔法。Advisor 能看到完整对话，因为它就在执行循环内部；Decision 模型只能看到你传给它的 ​`state`。
2. **判断得合理**：Decision 模型把“判断”从一段需要解析的生成文字，变成了**可以设阈值的概率**，阈值写在代码里，便于测试和审计。Advisor 把“这一步需要多少智慧”的判断交给了离现场最近的 Executor。
3. **换得过去**：这正是 Advisor 最大的价值，它**根本不换**，因此绕开了交接成本和缓存失效。Jev Router 则把“尽量不换、先调 reasoning effort”作为默认行为。
4. **知道有没有用**：两者都不能替你回答。厂商数据都是自报，必须在你自己的任务上做对照。

### 一个组合起来的网关

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
req: "Agent 发来这一步的请求\n附任务编号、最近工具结果" {class: input}
facts: "1. 提取事实\n执行信号：失败、重复、进展" {class: input}
filter: "2. 硬约束\n排除放不下历史、不支持工具、超预算的模型" {class: warn}
rules: "3. 明确情况用规则\n明显卡住 → 升级；正常产出 → 省钱" {class: policy}
decide: "4. 拿不准时问 Decision 模型\n返回概率，代码按阈值分段" {class: new}
session: "5. 会话层权衡\n换模型是否抵得过缓存与交接成本" {class: policy}
send: "6. 转发给执行模型\n可在 tools 中附带 advisor" {class: good}
advisor: "执行中遇到关键决策\n由 executor 自己请教 Advisor" {class: new}
ledger: "7. 记账与评估\n每个模型的 token、缓存、advisor 调用\n整段任务是否成功；下一轮重新判断" {class: note}
req -> facts -> filter -> rules
rules -> decide: "证据不足"
rules -> session: "明确"
decide -> session
session -> send
send -> advisor: "可选"
advisor -> send: "建议"
send -> ledger
```

*图 11：把规则、Decision 模型、会话权衡和 Advisor 组合到一个网关里。各个框是代码职责，一开始完全可以放在一个程序里。*

这个组合背后的分工是：

- **规则处理明确的情况**：明显卡住就升级，正常产出就省钱。便宜，也可解释。
- **Decision 模型处理拿不准的情况**：替代“再问一个 LLM 分类器”，返回概率，交给代码按区间处理。
- **会话层决定换不换**：先查硬约束，再权衡缓存与交接成本，避免来回切换。
- **Advisor 处理“这一步内部”的难点**：不值得换模型、但又确实需要一次高质量判断的时候，让 Executor 自己去问。
- **记账覆盖所有环节**：Executor、Advisor、Decision 调用和缓存分别计费，最后按整段任务核算。

**组合之前一定要核对功能冲突**：例如“整个会话固定模型”会挡住升级；Advisor 每次求助都会把完整记录发给贵模型，频繁求助会吃掉节省；Jev Router 没有回退，需要自己补。不要把所有开关一起打开。

---

## 七、如果自己实现，从哪里开始

### 先做一个能解释选择原因的小系统

只做一个业务（比如代码修改 Agent），只选两个都能处理该业务和工具格式的模型，只决定“便宜档还是强档”。最小策略可以是：

```text
1. 先排除处理不了当前工具、上下文长度或预算的模型。
2. 有明确的持续失败证据时，升级到更强的兼容模型。
3. 刚升级、仍在修复时，短暂保持，不要立刻降回去。
4. 剩余工作明确、近期结果正常时，回到便宜模型。
5. 信息不足时，不要假装判断准确，使用事先约定的默认策略。
```

刻意不写“错误恰好三次就升级”这种死规则，次数要根据你的工具和任务调整。在这个基础上，两种新方式最自然的接入点是：

- **第 5 步“信息不足”**  交给 Decision 模型：一个 Noul 问题就能把“拿不准”量化成概率。
- **第 2 步之前** 先给便宜档挂一个 Advisor：很多“需要升级”的情况，其实一次好的建议就能解决，不必换模型。

### 记清楚三个编号和两种结果

- **任务编号**串起整个任务；**模型调用编号**区分步骤；**尝试编号**区分网络重试。有并行子 Agent 时再加分支编号，否则一个分支的失败可能错误地触发另一个分支升级。
- 结果至少分两层：**模型请求是否成功返回**，以及**用户任务是否真正完成**。

接入 Advisor 后还要多记一层：每次求助发生在第几步、Advisor 用了多少 token、之后的工具调用数是否下降。接入 Decision 模型后，记录每次判断的问题名、概率、所用阈值和落入的区间，以后才能回头校准。

### 让切换服从明确条件

换模型之前要检查：新模型能接收当前的历史和工具格式吗？放得下这么长的历史吗？还有预算吗？是不是刚换过？有没有已经交给调用方、撤不回来的**流式**输出？

最后一点很关键：如果旧模型已经流式发出了一个完整的工具调用，客户端可能已经执行了它，此时在后台把整个请求重做一遍，可能会重复执行操作。Advisor 的流式暂停也要在客户端处理好，不要误判为超时。

### 什么时候再上学习算法

有了可信的任务记录之后，再去找简单规则做不好的部分，训练小分类器学习“在这个状态下，强模型比便宜模型多带来多少收益”。这比笼统地估计“任务难不难”更贴近花钱的决策：两个模型都做不好的任务，难度再高也不值得升级。只有当“这一步的选择怎样影响后面多步”的数据足够好时，才值得尝试 Router-R1 一类的强化学习方案。

---

## 八、怎样判断路由真的有用

### 对照组至少要有三个

对同一批任务，至少比较：**全程强模型、全程便宜模型、你的路由策略**。接入两种新方式时，再加上：

- **便宜模型 + Advisor**（Anthropic 官方推荐的三组对照就是：Sonnet 单独、Sonnet + Opus advisor、Opus 单独）；
- **用 Decision 模型替换原有分类器**的版本，单独验证它带来了多少差异。

任务起点、工具、候选模型、最大尝试次数和停止条件都要保持一致。看这些指标：

|指标|含义|为什么需要|
| --------------------------| -----------------------------------------| --------------------------------------|
|任务成功率|一百个任务里真正完成了多少|不能靠大量失败换来低账单|
|每个成功任务分摊的成本|所有任务的花费 ÷ 成功任务数|把失败尝试的成本也算进去|
|完成耗时|从开始到拿到可用结果|分类、重试、Advisor 暂停都会增加时间|
|升级 / 求助后的改善|换强模型或问过 Advisor 之后是否恢复进展|检验信号和求助时机是否有价值|
|切换与缓存费用|换模型带来的额外处理和写入成本|模型单价解释不了真实花费|
|Advisor 调用次数与 token|每个任务问了几次、花了多少|判断是否问得过勤或过少|
|Decision 区间分布|落在自动、复核、交人三段的比例|中间区间太多说明阈值或 ​`state` 有问题|
|系统错误|限流、网络、工具不可用各有多少|别把所有问题都算成模型能力不足|

举个例子：总花费 100、成功 50 个任务，每个成功任务的分摊成本是 2。不能只统计成功的 50 个，而把另外 50 个失败任务的账单丢掉。

### 重放有用，但证明不了另一条路会成功

**重放（replay）**  把已有的请求历史交给新路由器，看它会怎么选。它适合检查规则、阈值和 Decision 区间。但新模型会改不同的文件，后续测试结果也会不同，旧记录里没有这条新路径的结果。要比较最终能否完成任务，必须从同一个环境快照**真正跑一遍（rollout）** 。

```d2
vars: {d2-config: {sketch: true}}
direction: down
classes: {
  input: {style: {fill: "#EFF6FF"; stroke: "#2563EB"; border-radius: 8}}
  policy: {style: {fill: "#EEF2FF"; stroke: "#6366F1"; border-radius: 8}}
  good: {style: {fill: "#ECFDF5"; stroke: "#059669"; border-radius: 8}}
  warn: {style: {fill: "#FFF7ED"; stroke: "#EA580C"; border-radius: 8}}
  note: {style: {fill: "#F8FAFC"; stroke: "#94A3B8"; border-radius: 8}}
  new: {style: {fill: "#FDF4FF"; stroke: "#C026D3"; border-radius: 8; stroke-width: 3}}
}
*.style.font-size: 18
capture: "采集任务记录与环境快照\n记录当时的策略版本与概率" {class: input}
replay: "离线重放\n检查规则、阈值与决策分布" {class: policy}
rollout: "分支实跑\n同一起点运行不同策略，让轨迹自然分化" {class: policy}
measure: "任务级对照\n成功率 · 总成本 / 成功数 · 耗时\n切换与缓存 · advisor 调用次数" {class: good}
shadow_run: "Shadow\n新策略只给建议，不改变真实请求" {class: note}
canary: "Canary / A/B\n按完整任务分组，小流量试用" {class: warn}
capture -> replay -> rollout -> measure -> shadow_run -> canary
canary -> capture: "补充真实反馈"
```

*图 12：从检查规则，到比较真实任务结果。Shadow 只给建议、不改变真实请求；Canary 让少量真实任务先用新策略。*

Advisor 尤其需要实跑：它的价值体现在“后续少走了多少弯路”，这只有真实运行才看得出来。上线后的对照实验应当按**完整任务**分组，不要在同一个任务中途切换实验组。

---

## 九、结语

Agent 模型路由的本质，是在“现在就要选”和“最后才知道对不对”之间做取舍。这几年的演进大致是：

- **从看问题到看过程**：从 RouteLLM 只看最后一条消息，到 Switchyard、LiteLLM、vLLM 读取工具轨迹。
- **从单次价格到整段任务**：Not Diamond、vLLM 会话评分和 Jev Router 都把缓存与切换成本纳入目标。
- **从“换谁”到“问谁”** ：Advisor 说明，很多时候不必把整个任务交给强模型，只需在关键节点借用它的判断。
- **从生成文字到输出概率**：Decision 模型把路由判断从一段需要解析的文字，变成了可以设阈值、可以审计的数字。

但有一条始终不变：**任何方案都要在你自己的任务上，和“全程强模型”“全程便宜模型”放在一起比较，按每个成功任务分摊的总成本来算账。**  厂商公布的数字只能说明“值得一试”，证明不了“对你有效”。

---

## 参考资料

### 新增：Advisor

- Anthropic, [The advisor strategy: Give Sonnet an intelligence boost with Opus](https://claude.com/blog/the-advisor-strategy)（2026-04-09）
- Claude Platform Docs, [Advisor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)（参数、计费、缓存、流式、模型配对、建议提示）
- Claude Cookbook, [Advisor: let a working agent consult a stronger model mid-turn](https://platform.claude.com/cookbook/managed-agents-cma-consult-an-advisor)
- OpenRouter, [Advisor: Give Any Model a Lifeline to a Smarter One](https://openrouter.ai/blog/announcements/advisor-server-tool/)（2026-06-10）
- agentpatternscatalog, [Add advisor-consult and semantic-decision-node patterns (PR #78)](https://github.com/agentpatternscatalog/patterns/pull/78)

### 新增：Decision 模型

- OpenRouter, [Jev Documentation - TypeSafe Decision Model on OpenRouter](https://openrouter.ai/docs/guides/community/jev)
- OpenRouter, [What Is Jev? TypeSafe's Decision Model Explained for Developers](https://openrouter.ai/blog/insights/what-is-jev/)（2026-09-21）
- OpenRouter, [Jev 1.13 模型页](https://openrouter.ai/typesafe/jev-1.13)
- OpenRouter on X, [Jev Router 发布与基准说明](https://x.com/OpenRouter/status/2103610914503315515)、[每轮评估维度](https://x.com/OpenRouter/status/2103610953338409459)
- OpenRouter, [openrouter-decisions skill](https://openrouter.ai/skills/openrouter-decisions)
- Wei Sun, [Decision-Centric Design for LLM Systems](https://arxiv.org/abs/2604.00414)（arXiv 2604.00414）

### 原调研涉及的项目（源码版本见原报告）

- Switchyard：[README](https://github.com/NVIDIA-NeMo/Switchyard/blob/3a918cb949b102a600ae971fae9cf99b4d19a354/README.md)、[Stage 评分](https://github.com/NVIDIA-NeMo/Switchyard/blob/3a918cb949b102a600ae971fae9cf99b4d19a354/crates/libsy/src/algorithms/util/stage.rs)
- LiteLLM：[Complexity Router](https://github.com/BerriAI/litellm/blob/086bcd2a47ad3807f36abaf3e967b56e70d8948a/litellm/router_strategy/complexity_router/complexity_router.py)、[Stall 探测器](https://github.com/BerriAI/litellm/blob/086bcd2a47ad3807f36abaf3e967b56e70d8948a/litellm/router_strategy/complexity_router/stall_detector.py)、[缓存说明](https://docs.litellm.ai/docs/auto_router/prompt_caching)
- vLLM Semantic Router：[概览](https://github.com/vllm-project/semantic-router/blob/83b848c3b6a8a5cf17e488ca84975103a2855b46/website/docs/overview/semantic-router-overview.md)、[会话选择器](https://github.com/vllm-project/semantic-router/blob/83b848c3b6a8a5cf17e488ca84975103a2855b46/src/semantic-router/pkg/selection/session_aware.go)
- Not Diamond Code：[公开架构](https://code.notdiamond.ai/docs/)、[数据字典](https://code.notdiamond.ai/docs/data-privacy/data-dictionary/)
- LLMRouter：[benchmark 数据流程](https://github.com/ulab-uiuc/LLMRouter/blob/338335d24e29c26f66b0f11dc9a3b50fe3e742c1/benchmark_pipeline/README.md)
- Router-R1：[论文](https://arxiv.org/html/2506.09033v1)、[执行循环](https://github.com/ulab-uiuc/Router-R1/blob/801a240e37701577907c32de27a548af4e6c4430/router_r1/llm_agent/generation.py)
- RouteLLM：[Controller](https://github.com/lm-sys/RouteLLM/blob/0b64fdafe049e596a3f5657c219329f24af24198/routellm/controller.py)
- LangChain：[Model middleware](https://github.com/langchain-ai/langchain/blob/4db8c0e8359dc9789669af140e9c2728718566f8/libs/langchain_v1/langchain/agents/middleware/types.py)
- TensorZero：[自适应实验文档](https://www.tensorzero.com/docs/experimentation/run-adaptive-ab-tests)
- OpenRouter Auto：[新 Auto Router 说明](https://openrouter.ai/blog/announcements/introducing-the-new-auto-router/)
- Portkey：[Conditional Routing](https://docs1.portkey.ai/docs/product/ai-gateway/conditional-routing)、[请求参数路由更新](https://new.portkey.ai/announcements/conditional-router-now-supports-request-parameters)

‍
