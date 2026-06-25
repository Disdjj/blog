---
title: 'CPAT: Context Patch as Tool'
slug: cpat-context-patch-as-tool-z13xpki
url: /post/cpat-context-patch-as-tool-z13xpki.html
date: '2026-06-25 18:59:16+08:00'
lastmod: '2026-06-25 19:46:40+08:00'
toc: true
isCJKLanguage: true
---



# CPAT: Context Patch as Tool

> *[github.com/TokenRollAI/CPAT](https://github.com/TokenRollAI/CPAT)*

Context 是 harness 的重要部分, 过去我们一直讲 context 看做是一个 Queue, 为了前缀的稳定性,  我们要持续的Append message, 这没有什么问题.

可是长上下文下, 存在 [Context Rot](https://github.com/chroma-core/context-rot): 也就是随着上下文接近阈值, 模型的能力会极速下降. 为了让模型总是在甜点区工作, 控制 context 是一个重要的命题.

# Context Compact

是的, 这是一个巨大的命题, Context Compact, 但是过去这些全都是由 harness 层实现的.

有一些经典的解决方案:

1. compact
2. limit tool result
3. payload-off & retrieve
4. summerize
5. goal + clear

这很合理, agent 持续的 loop, harness 保证 agent 能够持续工作

但是要注意, 只是持续工作, 不代表能出色不漂移的持续工作

为什么? 因为只要 context 被压缩/丢弃, 那么就一定出现轻微的漂移, 这种漂移会随着loop turns 的增加而不断累积.

为了解决这种问题, 有一些力大砖飞的解决方案: subagent, agent teams, agent workflow

把任务拆解成能够被并发执行的单元, 这样 master agent 只需要黑盒的控制输入, 获取输出就好

这是一个有效的解决方案, 但是我认为这样的解决不够优雅, 你不能通过逃避问题来解决问题, 单个 Agent 在长程任务下的的 context 处理依旧由巨大的价值. claude code 这样 给 subagent 增加 subagent 能力的方式太过于丑陋

# Context as Tool

> [https://arxiv.org/abs/2512.22087](https://arxiv.org/abs/2512.22087)

一个非常有意思的方案, 让 agent 自行管理 context

形式化为 `C(t) = (Q, M(t), I⁽ᵏ⁾(t))`:

|段|含义|是否可压缩|
| ---------------| ------------------------------------------------------------------------------| ------------|
|**Q** 任务语义段|system prompt + 用户核心意图,作为稳定语义锚点|不可压缩|
|**M(t)**  长期记忆段|历史轨迹的高保真浓缩摘要(中间目标、采用的策略及结果、关键环境反馈、持久约束)|演进式|
|**I⁽ᵏ⁾(t)**  短期工作记忆|最近 k 轮 ReAct 交互的**逐字完整记录**|保留原样|

## `context` tool 的主要能力

关键点:**它本质上只有一个核心操作——结构化折叠/压缩(context folding)** ,而不是一组离散命令。调用时它做三件事:

1. **划分**当前可见上下文:固定段 Q / 最近 k 轮 I⁽ᵏ⁾ / 可压缩的历史段
2. **保留** Q 和最近交互的原文
3. **压缩**历史段 → 生成一个高保真、可执行的长期记忆块 M,作为这次工具调用的 **Observation** 写回长期记忆段

# Context Patch as Tool

我觉得 CAT做的不够, 核心是: 在过去的实践中一些非常有效的 context 管理策略没有被充分的使用.

如果让 Agent 能够完整的管理 User Message 的全部信息, 会怎样? 如果让agent 能够自动选择策略处理context 会不会是一个更有效的方案?

### context block

让我们把 context 拆的更细一些, 尤其是在一个loop turn 中:

1. user messge: 用户指令
2. tool call & tool result (总是成对出现)
3. agent output

好, 让我们将一个 user message , 一个 tool pair , 一个 agent output 都当做是 block

这些就是 agent 能够控制的最小单元

### atomic op

如果我们有最小的控制单元, 那么能够怎么控制他们呢?

|op|作用|可逆性|
| --------------| --------------------------------------------------------------| ---------------|
|​`set_visibility`|archive（留 manifest 可恢复）/ hidden（移出）/ model（恢复）|高|
|​`payload_offload`|大 tool_result → 短摘要 + artifact 引用（零拷贝）|高（restore）|
|​`restore`|把已 offload 的全文回填（offload 的逆操作）|—|
|​`compact`|一组完成的探索 → 一个 dense summary|中|
|​`fold`|一段**连续**子任务轨迹 → 一个 scoped summary|中|
|​`merge`|2+ 重叠/重复块 → 一个 canonical 块|中|
|​`replace` (gated)|改写非 protected 块内容|低|
|​`redact` (gated)|删 inline JSON tool_result 字段|低|

好,以上是 AI 写的, 最开始我的设计要更加简单:

1. offload-restore: 把大的 result 直接转为artifact 引用, 必要时做 retrieve
2. compact: 一个 turn 如果价值较低, 只保留摘要
3. merge: 多个重复的操作, 直接 merge 为一个 block
4. hide: 某些判断为低价值的 block 直接隐藏掉

现在看到的这些 op 全都是 agent 自己添加的, ☺️, 我也不知道他干了些什么!

# 验证

shit, 这是最难顶的部分.

最开始做所有的测试, 几乎都打不过裸着使用 ReAct.

直到在一些真正长程的任务中运行, 但是我要说的是, 这里的验证非常不充分, 最后的实际的 bench 是一个自己造的场景😂:

> 现在用的 bench 是 `bench/deepresearch.ts`​:它自建一批合成的"项目档案"语料,每篇种入精确可匹配的事实(项目代号、负责人、准确率数值、以及一个**埋在深处**的事故码),并用大量 filler 把语料总量撑到**远超上下文窗口**。跑的时候**只给 list\_dir + read\_file、禁用 grep**,逼 agent 真去整篇读;问题分聚合类(“哪个项目准确率最高”——必须读遍全部)、跨文档类和回访类(回到很早读过的某篇问它的埋深事故码),用 `followups`​ 把十几个问题串在同一 runtime 上**强制上下文累积**;答案用 exact-match 判分以避开 F1 噪声。最后在 **ReAct / threshold / CPAT 三臂 × 32K/200K 受限窗口**下对照,看谁在上下文耗尽时还能答对、各花多少 token。

所以, 直到现在它的真实性还是没有被特别好的验证, 我计划这两天基于 [reasonix](https://github.com/esengine/deepseek-reasonix) 改造一个支持CPAT 的版本, 看看是否有效.

后续也会放在 [Watt](https://github.com/TokenRollAI/Watt/tree/feat/runtime-planscript-research-team) 上作为标准的agent tool 来看看效果.

# 总结

总的来说: 感觉做了一个没屌用, 但是很有意思的事情.

另外一点: agent 的能力确实强悍, 自管理的方案还是非常有意思的, 漂移程度比 Summerize 低一些, 感觉不错. 希望能够启发一些新的 context 处理方案

---

以下为 Agent 生成:

---

> 这是一篇研究复盘。记录 CPAT（Context Patch as Tool）从一个想法——受 "Context as a Tool" 论文启发——  
> 到 block 抽象、工具设计、五组失败实验、一次根本性的方向修正、再到最终在受限窗口下证明价值的全过程。  
> 包含所有走过的弯路。失败路径本身是研究产出。

---

## 0. 起点：一个被反复验证的痛点

长程 agent 都会撞上同一堵墙：**上下文窗口**。一个 ReAct agent 把每次工具调用的输出 append 进上下文，  
读得越多，上下文越满，直到某一刻——窗口耗尽，对话被迫终止，或者关键信息被淹没在噪声里（lost in the middle）。

主流做法是**被动压缩**：框架在上下文超过某个阈值时，自动把最旧的内容摘要掉。但这有个根本缺陷——  
**框架不知道哪些信息后面还要用**。它只能机械地按"最旧"或"最大"来砍，可能恰好砍掉了 agent 三步之后需要的那个事实。

CAT 论文（[arXiv:2512.22087](https://arxiv.org/abs/2512.22087)，"Context as a Tool: Context Management  
for Long-Horizon SWE-Agents"）提出了一个优雅的反转：**把上下文管理做成 agent 可以调用的工具**。  
让 agent 自己决定什么时候、把什么压缩成长期记忆。论文用 SFT 训练让模型学会这件事，在 SWE-Bench Verified 上  
达到 57.6% 解决率，超过 ReAct（49.8）和被动阈值压缩（53.8）。

CPAT 是这个想法的一个**独立实现与实验平台**，但带着两个自己的主张：

1. **可校验**：agent 会犯错——它可能破坏 API 协议、压掉关键信息。所以工具必须是事务式的、被严格校验的。
2. **可逆**："先放下、后又需要"是长程任务的常态。所以压缩必须可恢复——这是 CPAT 区别于 CAT（单向有损压缩）的地方。

命题一句话：**上下文管理从被动阈值压缩，变成 agent 的主动、可逆决策。**

---

## 1. 设计 block：让上下文可寻址、可修补

要让 agent "编辑自己的上下文"，第一步是把上下文从一条只增不改的消息流，变成**一组可寻址的单元**。  
这就是 `ContextBlock`：

```ts
interface ContextBlock {
  id: string;                       // 寻址键——patch 用它指定目标
  kind: BlockKind;                  // 这个块"是什么"（user_message / tool_result / summary ...）
  content: string | ArtifactRef;    // inline 文本，或 offload 后的引用
  visibility: Visibility;           // model（渲染）/ archived（可恢复）/ hidden（移出）
  version: number;
  api?: { tool_call_id?, tool_calls?, reasoning_content? };  // API 协议字段，agent 永不可碰
}
```

每条进入系统的消息成为一个 block。下一轮发给 LLM 的消息列表 = 按 block 顺序、按可见性过滤渲染的结果  
（`ContextView`）。Agent 不再编辑消息，而是给 block 提交 patch。

### 一个关键的早期设计决策：单份存储 + 零拷贝

最初的设计稿里，同一份 payload 会存三份：原始日志全文、block 内容、offload 后的 artifact 拷贝。  
讨论后我们改成**单份内容存储 + 事件日志**（[decision 0001](https://github.com/TokenRollAI/CPAT/blob/main/llmdoc/memory/decisions/0001-single-copy-content-store.md)）：

```
ContentStore  每个 payload 进系统只写一次，键 <blockId>@v<version>。
              artifact://<key> 是唯一恢复通道。
Journal       append-only 事件日志，只记元数据与内容键，从不复制全文。
```

这个决策带来一个漂亮的推论：**​`payload_offload`​**​ **退化成零拷贝的视图翻转**。payload 已经在 ContentStore 里了，  
offload 只是把 block 的 `content`​ 从 inline 字符串换成一个指向同一个键的 `ArtifactRef`​——瞬间完成，不复制任何字节。  
而 `restore` 就是它的逆操作：把全文从那个键读回来。这对"可逆"主张是天然契合的。

### 一次真实的 API 400 回归

还有个看似小、实则关键的决策（[decision 0002](https://github.com/TokenRollAI/CPAT/blob/main/llmdoc/memory/decisions/0002-offload-keeps-kind.md)）：  
**offload 不改变 block 的 kind**。

早期版本里，offload 后把 `tool_result`​ 的 kind 改了。结果按 kind 判断 tool-call 链时漏掉了已 offload 的成员，  
patch 把链拆散，下一轮 API 收到一个孤立的 `role:"tool"`​ 消息——DeepSeek 真实返回 400。  
修复后，链归属由 `api.tool_call_id`​ 决定，**不看 kind**。这条教训后来固化成了一个核心护栏（见 §3）。

---

## 2. 设计工具：8 个原子操作

​`context_update` 是 CPAT 唯一的核心工具。它的 schema 就是 agent 看到的契约——所以每个字段都要明确说明  
"哪个 op 用、效果是什么"。经过几轮迭代，最终是 8 个原子操作，按可逆性/代价从轻到重排列：

|op|作用|可逆性|
| --------------| --------------------------------------------------------------| ---------------|
|​`set_visibility`|archive（留 manifest 可恢复）/ hidden（移出）/ model（恢复）|高|
|​`payload_offload`|大 tool_result → 短摘要 + artifact 引用（零拷贝）|高（restore）|
|​`restore`|把已 offload 的全文回填（offload 的逆操作）|—|
|​`compact`|一组完成的探索 → 一个 dense summary|中|
|​`fold`|一段**连续**子任务轨迹 → 一个 scoped summary|中|
|​`merge`|2+ 重叠/重复块 → 一个 canonical 块|中|
|​`replace` (gated)|改写非 protected 块内容|低|
|​`redact` (gated)|删 inline JSON tool_result 字段|低|

​`restore`​ / `merge`​ / `fold`​ 是研究中途补的（[decision 0003](https://github.com/TokenRollAI/CPAT/blob/main/llmdoc/memory/decisions/0003-restore-merge-fold-ops.md)）——  
当时调研了 Manus、MemGPT/Letta、Mem0、Generative Agents 等一批记忆系统的操作分类学，最后只采纳了三个  
能复用现有数据模型、不碰 `ContextBlock`​ schema 的：`restore`​（offload 必要的逆操作）、`merge`​（语义去重）、  
​`fold`​（连续子轨迹折叠）。其余如 supersede（需新增 resource_key 字段）则搁置——**触及数据模型的扩展先讨论再实现**。

### 事务引擎：怎么实现"agent 会犯错"这个前提

​`applyContextUpdate`​（`src/runtime/patch.ts`​）的核心是**事务语义**：对 block store 的克隆副本逐 op 校验，  
**任一 op 被拒则整体不提交**，所有 rejection 返回给 agent 让它修正重试。一共 27 条校验规则。其中两条是命门：

- ​**​`chain_atomicity`​**：tool-call 链（assistant 头 + 它全部的 tool_result，含已 offload 的）必须整体 patch。  
  否则下一轮 API 出现孤立 tool 消息 → 400。这正是 §1 那次回归的制度化防御。
- **语义漂移护栏**（这条是后来被实验逼出来的，见 §5）：`compact`​/`fold`​/`merge`​ 不能吞掉 `task_state`​ 和  
  **当前问题**（最近的 user_message）。

---

## 3. 第一轮实验：五组，全部"失败"

机制实现完、18 个离线测试全过。接下来要回答的问题是：**这套主动治理，真的比 ReAct 更好吗？**

我用 DeepSeek V4 Pro 跑了五组实验：通读整个仓库做审计、LongBench 单文档 QA、多文档检索、长程连环多问……  
判分用程序化的 F1 或精确匹配。结果令人沮丧：

|实验|关键结果|
| --------------------------------| ----------------------------------------------------------------------|
|通读仓库审计|ReAct prompt 累积 ~6.4 万，CPAT 压到 ~3.3 万（省 token，但没测质量）|
|LongBench 单文档 QA|F1 方向随预算翻转、全在噪声内；CPAT 的 prompt **反而更高**|
|多文档检索|聪明的 ReAct 用 grep 选择性读取，反而更省|
|longloop 连环多问（25 万语料）|CPAT 省 35% token 但 F1 没赢（3.44 vs 4.01）；连 `restore` 都从没被触发过|

结论很硬：**在所有可程序化判分的任务上，CPAT 都没能证明任务质量优于 ReAct，只稳定省 token。**   
我一度据此把 CPAT 重定位为"纯成本优化策略，而非质量提升"（[decision 0006](https://github.com/TokenRollAI/CPAT/blob/main/llmdoc/memory/decisions/0006-reposition-cpat-as-cost-optimization.md)）。

这是个诚实的负面结果。但它是错的——错不在 CPAT，错在我。

---

## 4. 方向修正：诊断出实验范式的根本错误

转折点来自一个尖锐的提醒：**CPAT 是为受限窗口下的超长程 agent 设计的。**

我一直在用 V4 Pro 的**百万真实窗口**。这意味着 ReAct **永远不会因为窗口耗尽而崩**——它把所有东西都塞进去，  
百万窗口照样装得下。而 CPAT 的全部价值，恰恰是"**在受限窗口下，ReAct 做不到、CPAT 能做到**"。  
把窗口开到百万，等于提前拿走了 ReAct 的死穴，CPAT 自然显不出优势。

**这是范式错误，不是 CPAT 没用。**

回头看 CAT 论文，证据一直就在那里：它的窗口**硬卡在 32K–65K**，ReAct 的关键失效是"一旦上下文窗口耗尽，  
对话提前终止"。论文用 **step 数 × 窗口上限**控制实验长度，而不是语料大小。我之前完全读漏了这个前提。

修正后的假设（可证伪）：

> **在受限窗口（32K / 200K）下的长程研究任务中，ReAct 会因上下文耗尽而提前终止或退化；被动阈值压缩居中；CPAT 主动可逆治理维持最高任务完成度。**

---

## 5. 重做实验：硬窗口、三对照臂、自建数据集

重做需要三个新东西：

 **(1) 硬窗口机制。**  给 `runAgent`​ 加 `hardWindowTokens`​：当渲染的上下文超过这个固定预算，**ReAct 臂被强制终止**  
（复现论文的"对话提前终止"），并记录 `terminated_early`。这是让 ReAct 会"崩"的关键。

 **(2) 第三对照臂。**  之前只有 ReAct 和 CPAT。补上 **threshold（被动压缩）** ：有 runtime 安全网会自动 offload，  
但**不给 agent** **​`context_update`​**​ **工具**。这就干净地隔离出"主动治理 vs 被动压缩"——正好对应论文的 53.8 vs 57.6。

 **(3) 自建数据集，不用现成 benchmark。**  合成一个"项目档案"语料库：每篇 dossier 有唯一的代号、负责人、  
一个精确数值、一个埋在深处的事故码；问题是聚合类（"哪个项目准确率最高"——必须读遍全部）、跨文档类、  
和回访类（回到很早读过的某篇）。答案精确可匹配，避免了 LongBench 短答案 F1 失真的问题。

### 一连串 smoke 测试，每次都在拦截设计缺陷

这是先跑小规模 smoke 的价值——它一次次拦下了昂贵的无效实验：

- **smoke v1**：三臂全 100%，peak token 远低于窗口。诊断：任务**可以 grep 跳过** → 不累积 → 治理无价值。  
  这是我**第六次**踩同一个坑。修复：去掉 grep 工具，加聚合问题强制读遍全部。
- **smoke v2**：**突破**——`react 0%（提前终止）/ threshold 100% / cpat 100%`。受限窗口第一次真正咬住了 ReAct。  
  "治理 > 不治理"成立了。
- **smoke v3**：埋深事实回访。结果 CPAT **输给了** threshold（90% vs 100%，还贵 3 倍）。看失败的那条回复：  
  CPAT 答的是  **"No new question received"** ——它把当前问题自己 compact 掉了，**语义漂移**，忘了自己在答什么。

v3 的失败直接催生了那条语义漂移护栏（§2）：禁止 compact/fold/merge 吞掉当前问题和 task_state。  
加上护栏后重跑，CPAT 从 90% → **100%** ，compact 次数从 9 → 0。

### 提示工程：教 agent 正确地治理

护栏只是"防止 agent 自伤"。要让主动治理真正好，还得**教会它怎么压**。我重写了三层提示  
（system prompt / 工具描述 / harness 边界提示），核心是几条之前缺失的策略：

- **里程碑式"读完即 offload"** ：读完一篇用不上的文档，立刻 offload 原文，只留一行关键事实笔记——  
  而不是等到"边界"才整理（深度研究里一个问题内部就要读 20 篇文档，等不到边界就溢出了）。
- **处置陈旧块**：摘要里已经有了关键事实，就把冗余的原始块 hidden 掉——不要让摘要和陈旧源并存。
- **preserve 精确事实**：preserve 列里放逐字的名/数/ID，drop 列里放 filler 散文。

但这里有个比"提示没调好"更深的发现：新提示后 CPAT 准确率稳 100%、compact 归零，**可 token 反而更高了**。  
原因是——每次 `context_update`​ 都是一次额外的 LLM 往返，prompt 再好也省不掉这个架构开销。  
**这恰好印证了 CAT 论文为什么要用 SFT 训练**：让治理零往返地融入推理，而不是当作一个独立的工具调用。

---

## 6. 最终结果：受限窗口下的全量双扫

把已经成立的结论做成统计稳健的完整证据：**32K + 200K 两个窗口 × 三对照臂**，自建深度研究任务（12 问，  
语料远超窗口）。

|窗口|臂|提前终止|准确率|总 prompt tokens|
| ------| -----------| :--------: | :------: | -----------------: |
|32K|ReAct|✗ 是|**0%**|31,740|
|32K|threshold|否|100%|305,434|
|32K|CPAT|否|100%|464,041|
|200K|ReAct|✗ 是|**8.3%**|714,175|
|200K|threshold|否|100%|**2,819,420**|
|**200K**|**CPAT**|否|**100%**|**488,333**|

两个决定性结论：

**① 治理 ≫ 不治理（两个窗口都成立）。**  ReAct 在受限窗口下因上下文耗尽**提前终止**，准确率 0% / 8.3%；  
任何治理都能 100% 完成。这是 CPAT 价值的无歧义证据——而它在前五组（百万窗口）里根本测不出来。

**② 大窗口下，主动 CPAT 在效率上碾压被动压缩。**  200K 时，CPAT 和 threshold 都是 100% 准确率，  
但 CPAT 只花了 **49 万** token，threshold 花了 **282 万**——**省 83%（5.8 倍）** 。

为什么会这样？这是整个研究最漂亮的机制洞察：

- **threshold 是被动的**：它等上下文涨满到接近窗口（峰值 172K）才压缩，所以**每一轮 LLM 调用都背着接近满窗口的上下文**。
- **CPAT 是主动的**：它读完一篇就 offload，上下文始终压在 25K，**每一轮调用都很轻**。
- **窗口越大，被动压缩的浪费越严重，CPAT 主动压低上下文的优势越明显。**

这正是为什么 CPAT 是为"有限但较大的窗口（如 200K）"设计的。

---

## 7. 诚实的边界

研究的价值一半在于知道什么成立，一半在于知道什么还没成立：

- **32K 小窗口下，CPAT 反而比 threshold 贵。**  主动治理的 LLM 往返开销，只有在大窗口才回得了本。
- ​**​`restore`​**​ **的独立价值始终没被验证。**  在所有实验里 restore 调用都是 0——因为任务的信息源是静态文件，  
  可以重读，agent 永远选择 re-read 而非 restore。restore 真正的价值场景是**信息源不可重得**  
  （一次性工具输出、推理中间态），这还没测。
- **prompt-only 主动治理有架构瓶颈。**  每次治理一次 LLM 往返，这印证了 CAT 用训练把治理融入推理的必要性。

---

## 8. 回顾：这个研究教会了什么

抛开 CPAT 本身，这次研究有几条方法论教训值得记下来：

1. **实验范式比实现更容易错。**  我花了五组实验、一次完整的"重定位"才意识到：问题不在 CPAT，  
   在"我没给 ReAct 一个会失败的环境"。一个测不出差异的实验，往往是因为你抹掉了被测对象的价值场景。
2. **先跑 smoke。**  六次"任务可以 grep 跳过"的坑，全是 smoke 在花几分钟、几毛钱的时候拦下来的——  
   而不是在全量实验烧掉几百万 token 之后。
3. **诚实记录失败路径。**  这篇 blog 里一半是弯路。但正是"为什么之前测不出"这个诊断，  
   比最终那张漂亮的对照表更有价值——它是可复用的认知。
4. **让失败自己说话。**  那条 "No new question received" 的回复，比任何抽象的"语义漂移风险"都更早、  
   更准地指出了护栏该加在哪。

CPAT 现在证明了它该证明的：在受限窗口的长程任务上，**让 agent 主动、可逆地治理自己的上下文是有价值的**——  
而且窗口越大，价值越明显。剩下的开放问题（restore、训练融合）是下一步。

---

*代码、完整研究档案与可复现实验：*​*[github.com/TokenRollAI/CPAT](https://github.com/TokenRollAI/CPAT)*​ *。工具设计详解见* *[`ARCHITECTURE.md`](https://github.com/TokenRollAI/CPAT/blob/main/ARCHITECTURE.md)*​ *，逐阶段研究日志见* *[`research/`](https://github.com/TokenRollAI/CPAT/tree/main/research)* ​ *。*

‍
