---
title: 'Tager: ReAct'
slug: tager-react-1vylcn
url: /post/tager-react-1vylcn.html
date: '2026-07-07 14:31:48+08:00'
lastmod: '2026-07-07 15:07:07+08:00'
toc: true
isCJKLanguage: true
---



# Tager: ReAct

## ReAct：从“会推理”到“会行动”的方法论前身

在 Tools 之前，LLM 研究里已经出现了 ReAct 这条思路。ReAct 的全称是 Reasoning and Acting，它的核心是让模型交替生成推理和动作。

经典模式可以表示为：

```Plain
Thought: Thinking
Action: Tool calls

Observation: thinking + tool call ​+ tool result

Thought
Action
Observation
...
Final Answer
```

ReAct 的意义在于：它不再把模型看成一次性回答器，而是让模型在环境反馈中不断修正判断。

例如：

```Plain
Thought:
  我需要知道当前天气，模型自身知识可能过时。

Action:
  search_weather("Paris")

Observation:
  Paris today is 25°C.

Thought:
  已经获得最新天气，可以回答用户。

Final Answer:
  Paris is 25°C today.
```

现代 Tools 可以视为 ReAct 的产品化、类型化版本：

```Plain
Thought:
  通常不直接暴露，或只暴露 summary。

Action:
  tool call。

Observation:
  tool result。

Final Answer:
  模型最终回答。
```

ReAct 论文强调，推理轨迹可以帮助模型更新计划、处理异常，而动作可以让模型连接外部知识源或环境。Toolformer 论文则进一步从训练角度说明，模型可以学习何时调用 API、传什么参数、如何把返回结果纳入后续预测。

因此，Tools 不是凭空出现的 API 设计，它和 ReAct / Toolformer 这类研究一脉相承。区别在于：早期研究用自然语言文本模拟 action，现代 API 把 action 变成了结构化 tool call。

参考来源：[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)、[Toolformer: Language Models Can Teach Themselves to Use Tools](https://arxiv.org/abs/2302.04761)、[Chain-of-Thought Prompting](https://arxiv.org/abs/2201.11903)

---

**Agent 是一个模型驱动的执行系统：它接收一个目标，用模型决定下一步行动，并通过工具或外部环境交互来完成目标。**

# Diff With Workflow

**不是所有** **LLM**​  **+ tool 都是强 Agent。**

如果工具调用路径是代码写死的，例如“永远先搜索，再总结，再输出”，它更像 workflow。

 如果模型能根据目标和中间结果动态决定“是否搜索、搜索什么、是否写文件、是否调用代码、是否交给子 Agent、何时停止”，它才是更严格意义上的 Agent。

# AGI -\> ASI

AGI  **(Artificial General Intelligence) and** ASI​  **(Artificial Superintelligence) represent two distinct, hypothetical stages of AI development**. AGI matches human cognitive abilities across all domains, while ASI surpasses human intelligence and capability in every conceivable way.

> **通用人工智能（AGI） 和超级人工智能（ASI） 代表了人工智能发展中两个不同且假设性的阶段** ​。AGI 在所有领域都与人类的认知能力相当，而 ASI 则在每一个可想象的方面都超越人类的智能与能力。
