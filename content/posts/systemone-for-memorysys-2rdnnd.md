---
title: SystemOne for MemorySys
slug: systemone-for-memorysys-2rdnnd
url: /post/systemone-for-memorysys-2rdnnd.html
date: '2026-10-03 01:25:23+08:00'
lastmod: '2026-10-03 01:25:25+08:00'
toc: true
isCJKLanguage: true
---



# SystemOne for MemorySys

> 用 Jev、Clef 和 DeepSeek 搭 memory 系统的三轮实验记录。代码、数据集和原始结果在 [Disdjj/devision-mem-bench](https://github.com/Disdjj/devision-mem-bench)，测试时间 2026-10-02。

## 结论

我们想给 chatbot 做一个简单的 memory 系统，每轮对话都要回答两个问题：这句话要不要记下来（记的话，是什么类型、打哪些 tag、优先级多高），以及现在要不要翻旧账（翻的话，翻哪几条）。

判断交给 System One 决策模型，试了 TypeSafe 的 Jev 和 Cloudflare 的 Clef、Clef-flash；DeepSeek Flash 既是纯 LLM 对照组，也负责生成记忆内容。前后跑了三轮 benchmark，四千多条用例，覆盖中英双语、边界样本和一个 286 条记忆的大库。跑完之后，我对两件事更有把握了。

第一，决策本质上是给一个可枚举的状态空间打分、排序，LLM 做这件事并不理想。让它输出 JSON，它只会说是或否，没法排序；想提高质量就得开推理，代价是慢、贵、尾延迟失控。可是生成状态空间是 LLM 的长项：把含糊的对话整理成候选项、写评分标准、补全上下文，它都做得很好。LLM 和 System One 搭配使用，能做的事比任何一方单独做都多。

第二，决策模型可以挂在 chatbot 外面，当一层快速的“工具体系”。Jev 一次请求回答 1 道题和 64 道题，延迟都在 425ms 左右，300 道题也只要 875ms。于是每轮对话都可以并行做一次全身检查：要不要召回记忆，要不要调工具、调哪个，要不要升级到推理模型，有没有安全风险。它像 chatbot 的反射神经，真要深思熟虑的事再交给 LLM。

下面是三轮实验的经过，包括踩过的坑。

## 一、为什么 memory 系统需要“判断”

最朴素的 memory 系统只有两条路径：

```d2
# 朴素 memory 系统的写入 / 召回两条路径
direction: right

classes: {
  lane: {style: {fill: "#fafafa"; stroke: "#dddddd"; border-radius: 8; font-size: 18}}
  input: {style: {fill: "#ffffff"; stroke: "#888888"; border-radius: 16}}
  decide: {style: {fill: "#eaf2fc"; stroke: "#4a90e2"; border-radius: 6}}
  act: {style: {fill: "#ffffff"; stroke: "#444444"; border-radius: 6}}
  flow: {style: {stroke: "#666666"}}
}

write: 写入 {
  class: lane
  grid-columns: 1
  vertical-gap: 40
  msg: 用户说了一句话 {class: input}
  worth: 值得记吗？ {class: decide}
  meta: 类型 / tag / 优先级？ {class: decide}
  gen: 生成记忆内容 {class: act}
  store: 存储 {class: act; shape: cylinder}
  msg -> worth: {class: flow}
  worth -> meta: {class: flow}
  meta -> gen: {class: flow}
  gen -> store: {class: flow}
}

recall: 召回 {
  class: lane
  grid-columns: 1
  vertical-gap: 40
  msg: 用户说了一句话 {class: input}
  need: 需要翻旧账吗？ {class: decide}
  kind: 哪类记忆？ {class: decide}
  which: 哪几条最相关？ {class: decide}
  inject: 注入上下文 {class: act}
  msg -> need: {class: flow}
  need -> kind: {class: flow}
  kind -> which: {class: flow}
  which -> inject: {class: flow}
}

legend: |md
  蓝色：每轮都要做的判断，输出都可枚举
| {near: bottom-center; style.font-size: 14}
```

路径上的判断每轮都要做，而且要赶在回复之前做完。召回挡在回复前面，它花多久，用户就多等多久。这些判断的输出也都能列举：“要不要”是 0 到 1 的概率，类型是 5 选 1，优先级是低、中、高，相关性是给每条候选打个分，没有一处需要自由生成文本。

用 LLM 做这些判断当然可以，但那相当于每轮先完整生成一段 JSON，然后才开始真正的回复。System One 模型就是冲着这个场景来的。

## 二、System One 模型是什么

TypeSafe 在 2026 年 9 月发布了 Jev，称它为第一个 “System One model”，名字取自 Kahneman 的系统 1 与系统 2。接口很简单：

```json
POST https://api.typesafe.ai/v1/systemone
{
  "model": "jev-latest",
  "state": "Help! My payouts have been failing for 3 days.",
  "questions": {
    "is_urgent":  {"type": "noul",   "instructions": "Does this convey urgency?"},
    "department": {"type": "choice", "instructions": "Which team should handle this?",
                   "criteria": {"billing": "...", "technical": "...", "sales": "..."}},
    "frustration":{"type": "score",  "instructions": "How frustrated is the customer?",
                   "criteria": ["Calm", "Frustrated", "Very angry"]}
  }
}
```

输入是一个 state（任意文本或 JSON）加一组有类型的问题。题型只有三种：Noul 是是非题，返回“是”的概率；Choice 在你给的选项里选一个，返回每个选项的概率和置信度；Score 在你定义的有序等级上打分，返回概率加权后的分数。它不生成文本，所以不会出格式错误，也不会答出选项之外的东西。所有问题针对同一个 state 并行求值，多加几道题几乎不增加延迟。

2026 年 10 月 1 日，Cloudflare 发布了 Clef 和 Clef-flash，声称与 Jev 的 API 完全兼容。按 Cloudflare 博客的说法，它们在冻结的 Qwen 骨干上训练了一个路由头，配合 LoRA 适配器，用一次 prefill 给 schema 里所有合法选项并行打分，不做自回归解码。

我习惯把这类模型理解成：给可枚举状态空间里的每个点打一个经过校准的分。Choice 是 N 个选项上的分布，Noul 是 {是, 否} 上的分布，N 个 Noul 并排放，就是对 N 个候选分别打分、再排序。后面的分析都从这个角度出发。

## 三、系统怎么搭

### 封闭的分类体系

Jev 不能生成文本，tag 就不能想到什么写什么，只能从预先定义好的集合里选。我们定了 5 种记忆类型（preference、profile、project、event、instruction）、11 个 tag（work、tech、health、food 等）和 3 档优先级。Jev 和 DeepSeek 判断器用同一套题目文案，对比才公平。

### 写入：一次调用回答所有问题

```python
questions = {
    "store":    Noul(instructions=STORE_INSTRUCTION, criteria=STORE_CRITERIA),
    "type":     Choice(instructions=TYPE_INSTRUCTION, criteria=MEMORY_TYPES),
    "priority": Score(instructions=PRIORITY_INSTRUCTION, criteria=PRIORITY_LEVELS),
}
for tag, desc in TAGS.items():  # 多标签：每个 tag 一道 Noul
    questions[f"tag_{tag}"] = Noul(instructions=f"Is the information related to {desc}?")
resp = await client.system_one(turn.state(), questions)  # 15 道题，一次请求
```

判定要存之后，DeepSeek Flash 生成一句话的 ​`description`​ 用于检索，再生成包含全部细节的 ​`content`。

### 召回：判断、过滤、打分

```d2
# 召回：两次 Jev 调用夹一步代码过滤
classes: {
  jev: {style: {fill: "#eaf2fc"; stroke: "#4a90e2"; border-radius: 6}}
  code: {style: {fill: "#f5f5f5"; stroke: "#888888"; border-radius: 6; font-size: 14}}
  flow: {style.stroke: "#666666"}
}

recall: 召回 {
  grid-columns: 1
  vertical-gap: 40
  style: {fill: "#fafafa"; stroke: "#dddddd"; border-radius: 8; font-size: 18}

  call1: "Jev 调用 1\n要不要召回（Noul）+ 每种类型、每个 tag 各一道 Noul" {class: jev}
  filter: "代码\n按“类型命中或 tag 命中”过滤候选" {class: code}
  call2: "Jev 调用 2\n每条候选一道 Noul：“这条记忆对回答当前消息有用吗？”" {class: jev}
  topk: "代码\n取概率 ≥ 0.5 的 Top-5" {class: code}

  call1 -> filter: {class: flow}
  filter -> call2: {class: flow}
  call2 -> topk: {class: flow}
}
```

第二步用的是 N 道 Noul，没有用一道 N 选 1 的 Choice。Choice 问的是“哪个最好”，总会挑出一个；Noul 问的是“这条有没有用”，可以对所有候选都说没用。召回要的是后一种。

我们还做了一个 fan-out 变体：跳过过滤，直接给全部记忆打分。TypeSafe 的文档管这种用法叫 speculative fan-out。

## 四、Benchmark 怎么做

数据集由 DeepSeek Pro 生成，一共三份：

|数据集|内容|gold label 怎么来|
| ----------| -------------------------------------------------------------------------| ----------------------------------------|
|原数据集|一个人设（里斯本的 UX 设计师）、36 条记忆、43 条写入用例、48 条召回用例|Pro 盲标注；与出题意图冲突的样本剔除|
|边界集|38 条写入、40 条召回，专门构造边界情况|Pro 独立盲标注两次，二元判断一致才保留|
|大记忆库|在原库上补充干扰记忆到 286 条，召回用例对着大库重新标注|Pro 盲标注|

每份数据都有中英两个版本。中文由 Pro 翻译，沿用英文的 gold label，这样中英文之间只差语言。

参与对比的有 Jev、Clef、Clef-flash（各自带 fan-out 变体），以及 DeepSeek Flash 的三档：关闭 thinking、​`reasoning_effort=low`​、​`reasoning_effort=high`。记忆内容一律由同一个 Flash(low) 生成。

写入看存储判断的 Acc、P、R、AUC，以及类型准确率、Tag F1、优先级准确率；召回看召回门准确率，记忆检索的 P、R、F1 和命中率。另外记录 p50、p95 延迟和每 1k 次调用的成本。

## 五、我们遇到的问题

每一轮的结论都被下一轮改过，下面按出现的先后讲。

### 问题 1：模型只回答你写下的问题

召回问题最初是这么写的：“要回答好这条消息，助手是否需要回忆关于这个用户的长期记忆？”反例的描述是“不了解这个用户也能完整回答”。

对“推荐一道今晚可以做的菜”，Jev 给的召回概率是 0.38，DeepSeek Flash 直接判了否，可库里明明存着“用户对花生严重过敏”。

毛病出在题目上。推荐菜谱确实“不了解用户也能答”，只是了解了能答得更安全。我们把问题改成“了解这个用户的记忆，能否让回复更个性化、更相关或更安全？”，Jev 给出 0.93，并召回了过敏那条。

Jev 的官方文档把这叫作 literal reading：模型照字面回答你写下的问题，不会去猜你心里想问什么。LLM 也一样。

### 问题 2：剔除歧义样本，把难题也一起删了

第一轮，三种方案的存储判断准确率都是 1.00。原因是生成数据时，我们把盲标注结论和出题意图冲突的 5 条样本当作歧义剔除了，而这 5 条恰好是最难的题。剩下的样本界线都很清楚，于是撞上了天花板。

第二轮我们专门构造了边界集，题目包括别人的事、假设句、临时状态、更正与撤回、反讽，以及只对当前任务有效的指令。标注改成 Pro 独立标两次，二元判断一致才保留。结果只剔掉 2 条，召回相关集合的两次标注一致度（Jaccard）是 0.87：题很难，但答案是确定的。

### 问题 3：对照组选错，会把差距放大 2 倍以上

第一轮的对照组是开着 thinking 的 Flash。和它比，Jev 快了 4 至 7 倍，召回 p95 更是快了 16 至 23 倍。可开着 thinking 的 Flash 本来就不是 LLM 里最快的选项。

第二轮加入了关闭 thinking 的 Flash，并测了两边的延迟地板，也就是连接预热之后、最简单请求的延迟：

||最简单请求的 p50|memory 写入判断的 p50|
| ---------------------| ------------------| -----------------------|
|Jev|433ms|421ms（15 道题）|
|Flash 关闭 thinking|1105ms|1121ms|

速度差距一下缩到约 2.7 倍。但 Flash 关掉 thinking 后质量明显下降：原数据集上，召回记忆的精确率从 0.76 掉到 0.55，F1 从 0.82 掉到 0.65；边界集上，写入的优先级准确率只有 0.59。反过来，把 effort 从 low 调到 high，质量没有提高，只是更慢。

我们没找到又快又准的 LLM 配置。在第一个观点里，这是最直接的证据：LLM 做评估，质量是靠推理一点点堆出来的。

### 问题 4：Jev 的延迟几乎全是固定开销

Jev 带 15 道题的写入判断（421ms）和只带 1 道题（433ms）差不多快。我们又加测了几组：

|单次请求的题数|1|15|64|150|300|
| ----------------| -------| -------| --------| --------| --------|
|Jev|428ms|424ms|425ms|710ms|875ms|
|Clef|709ms|879ms|1791ms|需分批|需分批|
|Clef-flash|494ms|779ms|965ms|需分批|需分批|

Jev 150 道和 300 道题的数据来自另一组指令更长的测试，那组测试里 64 道题是 629ms。

Jev 的延迟基本不随题数变化。从本机测，Clef 系的延迟随题数大致线性增长，而且一次请求最多只能放 64 道题。第八节要谈的全身检查，靠的正是前一种特性。

### 问题 5：Jev 的短板在依赖上下文的写入判断

边界集上，Jev 的存储判断准确率只有 0.83 至 0.84，Flash low 是 0.96。Jev 的精确率高达 0.98，几乎不会存错，但覆盖率只有 0.79 至 0.80，经常漏存。

我们先试着调阈值，从 0.5 一路降到 0.1，准确率始终在 0.80 到 0.84 之间，可见问题不在阈值。再看漏掉的样本：

|用户的最后一句话|Jev 给出的存储概率|
| -------------------------------------------------------------------------------------| --------------------|
|“Actually change that to November 12, and it's for two people.”|0.15|
|“For the next two weeks while I'm on vacation, don't suggest work-related tasks.”|0.24|
|“I have a dentist appointment tomorrow at 3pm, remind me if I mention it.”|0.32|
|“Scratch that, the trip moved to December.”|0.44|

漏掉的主要是两类。一类是要结合前文才能看懂的更正：“that” 指什么，得往前翻上下文，Jev 文档里承认的 indirection 弱点说的就是这种情况。另一类是短期但重要的事，比如明天的牙医预约、接下来两周的休假。

Jev 栽跟头的地方，都是状态本身还没整理清楚的时候，而整理状态正是 LLM 擅长的。第七节会回到这一点。

### 问题 6：只取 Top-5 和不限条数，结论相反

在 286 条的大库上，所有方案的检索覆盖率都掉到 0.5 左右。排查发现，gold 平均每题有 3.6 条相关记忆，有一题多达 32 条，应该是 Pro 标得太宽了。只返回 Top-5 时，覆盖率的理论上限只有 0.63。

更意外的是，只取 Top-5 和不限条数，得出的结论正好相反：

|大库召回 F1|只返回 Top-5（实际使用场景）|不限制条数|
| -------------| ------------------------------| ------------|
|Jev|**0.60**|0.61|
|Flash low|0.53|**0.67**|

Flash 对每条候选只能说相关或不相关，命中的条目之间分不出先后，排序只能靠优先级打平。Jev 给的是连续的相关性概率，能真正排序：Top-5 精确率 0.73，Flash low 是 0.65。只能取少数几条时，能不能排好序比单条判得准不准更要紧。

### 问题 7：换一个 System One 模型，阈值要重新校准

Clef-flash 在三个数据集上的召回门准确率只有 0.47 至 0.76，但 AUC 一直在 0.96 到 0.97，说明它排序没问题，问题出在概率的整体尺度：

|需要召回的样本，召回概率的中位数|原数据集|边界集|大库|
| ----------------------------------| ----------| --------| ------|
|Jev|0.90|0.89|0.89|
|Clef|0.80|0.75|0.79|
|Clef-flash|0.59|0.47|0.58|

我们在原数据集上把 Clef-flash 的阈值定为 0.2，再拿另外两个数据集验证。召回门准确率回到 0.89 至 0.94，fan-out 版的召回 F1 从 0.68、0.49、0.53 升到 0.74、0.69、0.57。

“概率经过校准”是相对于模型自己的训练分布而言的。两个模型的 API 一样，阈值却不能照搬，换模型甚至换版本都得重新标定。Jev 的文档也建议，针对某个版本调好阈值后，就把版本号固定下来。

### 问题 8：网络位置的影响剥离不掉

Cloudflare 公布的中位延迟是 Clef 209ms、Clef-flash 39ms、Jev 524ms。我们从这台机器测，Clef 系并不比 Jev 快。两家的 API 都经过本机代理，光 TLS 握手就要约 0.9s，网络开销没法单独拆出来。Cloudflare 的长处是在边缘节点就近部署，如果服务本身跑在 Workers 上，结果可能完全不同。所以文中延迟的绝对值，都只代表从这台机器访问时的情况。

### 两个工程小坑

zsh 不会按空格拆分变量，​`--configs $C` 被当成一个参数，4 个配置名粘成了一个，结果只跑了 Jev。后来给配置名加了校验，写错会直接报错。

成本计算最初用 ​`cfg == "jev"`​ 判断计费方式，​`jev-fanout` 被按 Flash 的价格计费，成本虚高约 15 倍，后来改成按前缀匹配。

两个坑都在发布前修好了。benchmark 代码本身也得有人 review。

## 六、结果汇总

||Jev|Clef|Clef-flash|Flash 关闭 thinking|Flash low|
| -----------------------------------| --------| --------------------| --------------------| ---------------------| ---------------------------|
|写入判断 p50 / p95|**0.4s / 0.5s**|1.0s / 1.6s|0.8s / 1.2s|1.1s / 1.4s|2.1 至 2.4s / 3.9 至 5.5s|
|召回 p50 / p95（36 条记忆）|**0.8s / 0.9s**|2.5s / 3.0s|1.6s / 3.3s|2.1s / 2.6s|5.3s / 18.8s|
|召回 p50 / p95（286 条记忆）|**0.9s / 1.2s**|3.4s / 4.6s|2.2s / 4.6s|2.6s / 3.4s|11.0s / 40.2s|
|写入判断成本 $/1k 次| **$.044**|undefined.15|undefined.50 至 0.65|
|边界写入：存储判断 Acc|0.83|0.88|0.87|0.88|**0.96**|
|召回记忆 F1：小库 / 边界集 / 大库|**0.80** / **0.75** / **0.59**|0.76 / 0.72 / 0.58|0.74 / 0.69 / 0.57|0.65 / 0.62 / 0.45|**0.82 / 0.77** / 0.53|

表中 System One 系的召回取 fan-out 版本，Clef-flash 的召回门阈值为 0.2。

其他几组数据：

- 中英文的召回质量，Jev 基本没差别；写入时的类型准确率，中文低约 0.07（0.89 对 0.96）。
- Jev 爱多打 tag（精确率 0.68，覆盖率 0.96）。它在优先级上的错误全是把 medium 判成 high，属于往保守方向错。
- Clef 在边界写入题上比 Jev 少漏存（覆盖率 0.91 对 0.79），tag 和优先级也略好，类型判断则更弱。它的成本约为 Jev 的 9 倍：单价更高，同样的请求统计出的 token 也更多（约 1.7k 对 1.05k）。

## 七、观点一：LLM 生成状态空间，System One 在上面打分

前面说过，决策就是给可枚举的状态空间打分、排序。三轮数据显示，LLM 干这件事有三个毛病。

1. 输出是离散的。LLM 吐出 JSON 时，给的是“是 / 否”或一个标签，没有概率分布。没有分数就排不了序，也没法按业务需要调阈值。大库 Top-5 的差距就是这么拉开的。
2. 质量靠推理堆。关掉 thinking，精确率大幅下滑；打开 thinking，召回延迟的 p50 变成原来的 2 至 5 倍，p95 变成 7 至 12 倍，大库上一路涨到 40 秒。评估质量和延迟绑在一起。
3. 成本随候选数线性增长。多一条候选就多读一段、多写一个 token，而且得出的结果彼此不能比较。

System One 模型一次前向就给出每个选项校准过的概率，题目之间互不干扰，延迟几乎是常数，这三个毛病它都没有。

它也有前提：状态空间得先摆在那里。它不会凭空想出选项，也不擅长解指代、补上下文。它表现最差的，正是 “Scratch that, the trip moved to December” 这种状态本身不完整的情形。

生成状态空间是 LLM 的拿手活。在这个项目里，被打分的东西几乎都出自 LLM：记忆的 ​`description`​ 和 ​`content` 由 Flash 写，再由 Jev 打相关性分；人设、记忆库、测试用例、评分标准和 gold label 都来自 Pro。

把这种分工推广开，就是这样一个模式：

```d2
# LLM 展开状态空间，System One 在上面打分

classes: {
  stage: {style: {border-radius: 8; font-size: 18}}
  flow: {style: {stroke: "#666666"; font-size: 14}}
}

input: 用户输入 {style: {fill: "#ffffff"; stroke: "#888888"; border-radius: 16}}

llm: LLM（慢、贵、会想） {
  class: stage
  style: {fill: "#fdf6ec"; stroke: "#d89a3d"}
  task: 展开状态：改写指代、补全上下文、列出候选、写评分标准 {style: {fill: "#ffffff"; stroke: "#d89a3d"; border-radius: 6}}
}

s1: System One（快、便宜、会判） {
  class: stage
  style: {fill: "#eaf2fc"; stroke: "#4a90e2"}
  task: 对每个候选打校准过的分：Noul / Choice / Score {style: {fill: "#ffffff"; stroke: "#4a90e2"; border-radius: 6}}
}

code: 代码：阈值、排序、路由 {style: {fill: "#f5f5f5"; stroke: "#888888"; border-radius: 6}}

input -> llm: {class: flow}
llm -> s1: 可枚举的状态空间 {class: flow}
s1 -> code: 概率 + 置信度 {class: flow}
```

能套用这个模式的地方不少：

- 检索重排：LLM 或 BM25 先出候选，System One 逐条打分。TypeSafe 的 cookbook 里有个法律检索的例子，top-1 准确率从 5% 提到 18%。
- 技能和工具选择：工具描述本身就是一个状态空间，TypeSafe 的 skill suggestion cookbook 从 182 个技能里挑一个。
- 结构化抽取：先用正则或 LLM 抽出候选片段，再让 System One 选对的那个。Jev 的文档也建议别让它生成，让它挑。
- 评分标准离线写、在线用：LLM 一次性写好 rubric 和 criteria，之后每次请求由 System One 套用。贵的步骤只做一次，便宜的步骤可以做无数次。

还有一个没验证过的猜想。针对 Jev 漏存依赖上下文的消息，可以先让一个小 LLM 把 “Scratch that, the trip moved to December” 改写成“用户的日本之行改到了 12 月”，再交给 Jev 判断，等于让 LLM 先把状态摊平。这会让写入路径多一次 LLM 调用。不过写入本来就能异步做，记忆内容本来也要 Flash 生成，把改写并进同一次调用，可能几乎不增加开销。这是我们接下来想验证的。

## 八、观点二：决策模型是 chatbot 的“反射神经”

问题 4 那张表里藏着一个更大的机会：Jev 一次请求回答 1 道题和 64 道题，花的时间几乎一样。

这意味着 chatbot 在每轮回复之前，可以用一次约 0.4s 的调用，给当前消息做一次全身检查：

```d2
# System One 作为 chatbot 的“反射神经”：回复前一次请求做完所有判断

classes: {
  q: {style: {fill: "#ffffff"; stroke: "#4a90e2"; border-radius: 6; font-size: 14}}
  verified: {style: {fill: "#ffffff"; stroke: "#4a90e2"; stroke-width: 3; border-radius: 6; font-size: 14}}
  flow: {style: {stroke: "#666666"; font-size: 14}}
}

msg: 用户消息 {style: {fill: "#ffffff"; stroke: "#888888"; border-radius: 16}}

s1: System One：一次请求，几十道题并行 {
  grid-columns: 2
  grid-gap: 16
  style: {fill: "#eaf2fc"; stroke: "#4a90e2"; border-radius: 8; font-size: 18}

  recall: 需要召回记忆吗？哪类？\n（本项目已验证） {class: verified}
  write: 这句话需要写入记忆吗？\n（本项目已验证） {class: verified}
  tool: 需要调用工具吗？哪一个？\n参数取哪个枚举值？ {class: q}
  search: 需要联网搜索吗？\n需要深度推理吗？ {class: q}
  risk: 有越狱 / 注入 / 敏感话题风险吗？ {class: q}
  mood: 用户情绪如何？要不要转人工？ {class: q}
}

route: 代码路由 {style: {fill: "#f5f5f5"; stroke: "#888888"; border-radius: 6}}
direct: 直接执行 {style: {fill: "#ffffff"; stroke: "#444444"; border-radius: 6}}
think: 交给 LLM 思考 {style: {fill: "#fdf6ec"; stroke: "#d89a3d"; border-radius: 6}}
reply: LLM 生成回复（系统 2） {style: {fill: "#fdf6ec"; stroke: "#d89a3d"; border-radius: 6}}

msg -> s1: {class: flow}
s1 -> route: 概率 + 置信度 {class: flow}
route -> direct: 高置信 {class: flow}
route -> think: 低置信 {class: flow}
direct -> reply: {class: flow}
think -> reply: {class: flow}
```

我说的“外挂的快速工具体系”就是这一层。它自己不生成任何内容，但决定这一轮带上哪些记忆和工具、交给哪个模型、要不要开 thinking，以及哪些风险要提前拦下。

和 LLM 的 function calling 比，这一层有几处明显的好处。路由、召回、风控都在主模型开始生成之前做完，彼此并行，不占用主模型的生成。每个判断都带置信度，有把握的直接执行，拿不准的才升级给 LLM，TypeSafe 管这个叫 confidence-gated routing，和 Kahneman 的系统 1、系统 2 正好对应。成本也低到可以不计：每 1k 次写入判断，Jev 只要 $0.044，比让 LLM 判断便宜一个数量级以上。

memory 系统只是其中一例。我们验证过的部分是召回，这是最典型的每轮必做的判断：Jev 的 p50 比开 thinking 的 Flash 快 7 至 15 倍，p95 快 20 至 30 倍，质量持平，大库上还更好。把工具选择、风控、情绪识别这些题目放进同一个请求后质量如何，我们还没测，得一类一类验证。

这一层也有局限：

- literal reading：题目怎么写它就怎么答，题目文案要像代码一样迭代和测试。
- 不擅长间接指代：state 最好先由代码或 LLM 整理清楚再交给它。
- 阈值随模型变化：换模型或换版本都要重新校准。
- 网络位置：几百毫秒的固定开销里，网络可能占了大头，部署在哪里直接决定这层反射有多快。

## 九、局限与下一步

这次测试只用了一个人设；gold label 来自 DeepSeek Pro，可能偏向 DeepSeek 系模型；大库的 gold 标得偏宽，有一题多达 32 条相关记忆；所有延迟都是在本机经代理测的。

接下来想做四件事：

1. 验证先让 LLM 改写状态、再交给 Jev 判断，能不能补上依赖上下文的写入短板。
2. 在 Cloudflare Workers 内部重测 Clef，排除网络位置的影响。
3. 把工具选择、风控等题目放进同一个请求，看这层反射在多任务下的质量。
4. 换多个人设，加上人工抽检的 gold，重做一遍评测。

## 附录：复现

```bash
git clone https://github.com/Disdjj/devision-mem-bench && cd devision-mem-bench
uv sync
# 在 .env 中配置 jev_api_key、deepseek_api_key，使用 Clef 时还需 CLOUDFLARE_ACCOUNT_ID
uv run python -m bench.run_bench --no-generate --dataset bench/data/dataset_hard.json \
    --configs jev jev-fanout clef-fanout 'clef-flash-fanout@0.2' flash-nothink flash-low
```

完整数据见仓库里的 [bench/RESULTS.md](../bench/RESULTS.md)。
