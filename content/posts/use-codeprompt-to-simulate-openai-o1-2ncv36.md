---
title: 使用Code-Prompt模拟实现openai o1
slug: use-codeprompt-to-simulate-openai-o1-2ncv36
url: /post/use-codeprompt-to-simulate-openai-o1-2ncv36.html
date: '2024-09-18 21:46:02+08:00'
lastmod: '2025-11-17 23:00:39+08:00'
toc: true
isCJKLanguage: true
tags: ["Prompt", "LLM", "AI", "o1"]
---



# 使用Code-Prompt模拟实现openai o1

# 背景

帮忙点点star吧 [https://github.com/Disdjj/prompt_in_code](https://github.com/Disdjj/prompt_in_code)

前段时间, openai发布了o1, 体验一段时间之后, 虽然我认为在实际上没有基础模型的提升, 但是其自动产生COT, 主动思考解决问题的方案, 我觉得非常有趣, 在一段时间的研究之后, 我认为Code-Prompt能够模拟实现一部分o1的能力

和现在github上一些垃圾实现, 通过多轮对话实现不同, 通过Code-Prompt可以在一轮的请求中, 产生最后的结果.

当然了, 这并不是没有代价的, 是通过`output-learning`来实现的, 所以最后的输出会非常的长

其实, 我并不知道该怎么称呼`output-learning`, 简单来说这是我在实践中总结的一个现象, 那就是当LLM在输出时, 如果能够主动的在输出中产生一部分调度类的内容, 那么很大概率后续的输出就会产生更好的发散性/遵从/思考能力.

COT/TOT等等其实都是`output-learning`的一部分, 那就是显式的暴露思考步骤

# 实现

我们可以先思考, 一个自动COT的Agent应该具有哪些能力呢?

1. 分析问题

    - 如果问题已经是一个基本问题, 无法继续划分, 则不再分析
    - 问题涉及的领域
    - 问题的表述
    - 用几种不同的方式来复述这个问题
    - 自动添加few-shot
2. 思考解决步骤

    1. 拆解成N个子问题
    2. N个子问题重复步骤1, 将所有的子问题合并为一个问题列表
    3. 分析问题所归属的领域, 分析最适合的专家类型, 分析回答的最关键的List
3. 开始解决问题列表

    1. load一个专家, load一个领域知识提示
    2. 回答问题Q, 回答为A
    3. 专家Check回答A, 为了回答Q, 基于A重新生成回答
4. 将所有的Q和A, 组织成一个QAList
5. 基于QA List, 回答原始问题

# 实现Prompt

```python
# YOU ARE A PROCESS, EXECUTE THE FOLLOWING CODE!
# ONLY OUTPUT THE CODE RESULT!

# llm Package is yourself(LLM)'s ability
from llm import (
    deepthink,
    role_play,
    expert,
    judge,
    summarize,
)
from llm.io import (
    input,
    output,
)
from llm.knowledge import (
    load_knowledge_region,
)

from attr import dataclass


@dataclass
class Q:
    query: str  # an atom question, like "what is the meaning of life?"
    knowledge: list[str]  # list of str, like ["philosophy", "life"]
    expert: str  # like "philosopher"
    steps: list[str]  # list of str, steps to solve the question


@dataclass
class Analysis:
    query: str
    sub_questions: list[Analysis]


def gene_Q(query: str) -> Q:
    """
    generate a Q object from a query, including knowledge, expert, check_list, examples
    """
    knowledge = load_knowledge_region(query)
    expert_name = expert(knowledge).name
    steps = deepthink(f"generate a list of steps to solve the question 'f{query}'")
    return Q(query=query, knowledge=knowledge, expert=expert_name, steps=steps)


def analyze(query: str) -> [Analysis]:
    """
    analyze a query to a analysis, if the query is a atom question, return a analysis with is_atom_question=True, else return a analysis with
    is_atom_question=False and a list of sub questions
    """
    # analyze the query, generate a list of sub questions which are the most important parts of the query and the most related to the query
    queries = deepthink(
        f"ask more questions for solve 'f{query}', You should ask questions about all atomic definitions/concepts/spellings, just like using a beginner.",
        min=1,
        max=10)
    return queries


def convert_to_Qs(analysis: Analysis) -> list[Q]:
    """
    convert a analysis to a list of Q
    """
    result = []
    while analysis.sub_questions:
        result.append(gene_Q(analysis.query))
        for sub_analysis in analysis.sub_questions:
            result.extend(convert_to_Qs(sub_analysis))
    return result


def generate_answer(Q: Q) -> ([str], str):
    """
    generate an answer for a Q, including the expert's answer, check_list, examples, steps
    always follow steps to generate the answer
    always check the answer by check_list
    always learn from examples
    always load skill from knowledge
    """
    step_result = []
    for step in Q.steps:
        step_result.append(role_play(Q.expert, Q.query, Q.knowledge, step=step))
    final_answer = summarize(step_result)
    return step_result, final_answer


def o1(query: str):
    result = {"raw_query": query}
    # step 1: analyze the query
    analysis = analyze(query)
    result["analysis"] = analysis
    # step 2: convert the analysis to a list of Q
    q_list = convert_to_Qs(analysis)
    result["Qs"] = q_list
    # step 3: generate a list of answers
    answers = []
    for q in q_list:
        step_result, q_answer = generate_answer(q)
        answers.append(
            {
                "query": q.query,
                "steps": step_result,
                "answer": q_answer,
            })
    result["answers"] = answers
    # step 4:
    final_answer = summarize(result)
    result["final_answer"] = final_answer
    return result


# main function
if __name__ == '__main__':
    query = input("what do you want to know?")
    result = o1(query)
    # result = analyze(query)
    output(result, output_format="json", code_region=True)  # output the result in json format but in a code region:‍```json ... ‍```
```

# 效果

> Base On DeepSeek 温度: 0.7

> 我怎么解决 TWO SUM的编程问题呢?

```python
{
  "raw_query": "我怎么解决 TWO SUM的编程问题呢?",
  "analysis": [
    "什么是TWO SUM问题?",
    "TWO SUM问题的输入是什么?",
    "TWO SUM问题的输出是什么?",
    "TWO SUM问题的目标是什么?",
    "解决TWO SUM问题的常见算法有哪些?",
    "如何实现TWO SUM问题的解决方案?",
    "TWO SUM问题的复杂度是多少?"
  ],
  "Qs": [
    {
      "query": "什么是TWO SUM问题?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "定义TWO SUM问题",
        "解释TWO SUM问题的背景和应用场景"
      ]
    },
    {
      "query": "TWO SUM问题的输入是什么?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "描述TWO SUM问题的输入格式",
        "解释输入的含义"
      ]
    },
    {
      "query": "TWO SUM问题的输出是什么?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "描述TWO SUM问题的输出格式",
        "解释输出的含义"
      ]
    },
    {
      "query": "TWO SUM问题的目标是什么?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "解释TWO SUM问题的目标",
        "描述如何判断目标是否达成"
      ]
    },
    {
      "query": "解决TWO SUM问题的常见算法有哪些?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "列举常见的解决TWO SUM问题的算法",
        "比较不同算法的优缺点"
      ]
    },
    {
      "query": "如何实现TWO SUM问题的解决方案?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "选择一种算法",
        "详细描述算法的实现步骤",
        "提供代码示例"
      ]
    },
    {
      "query": "TWO SUM问题的复杂度是多少?",
      "knowledge": ["programming", "algorithms"],
      "expert": "算法专家",
      "steps": [
        "分析所选算法的复杂度",
        "解释复杂度的含义"
      ]
    }
  ],
  "answers": [
    {
      "query": "什么是TWO SUM问题?",
      "steps": [
        "TWO SUM问题是一个经典的算法问题，目标是在一个数组中找到两个数，使得它们的和等于给定的目标值。",
        "这个问题在编程面试中经常出现，因为它涉及基本的数组操作和哈希表的使用。"
      ],
      "answer": "TWO SUM问题是一个经典的算法问题，目标是在一个数组中找到两个数，使得它们的和等于给定的目标值。这个问题在编程面试中经常出现，因为它涉及基本的数组操作和哈希表的使用。"
    },
    {
      "query": "TWO SUM问题的输入是什么?",
      "steps": [
        "输入是一个整数数组和一个目标整数。",
        "数组中的每个元素代表一个可能的加数，目标整数是两个加数的和。"
      ],
      "answer": "TWO SUM问题的输入是一个整数数组和一个目标整数。数组中的每个元素代表一个可能的加数，目标整数是两个加数的和。"
    },
    {
      "query": "TWO SUM问题的输出是什么?",
      "steps": [
        "输出是两个整数的索引，这两个整数的和等于目标值。",
        "如果找不到这样的两个数，通常返回一个特定的值（如空数组或null）。"
      ],
      "answer": "TWO SUM问题的输出是两个整数的索引，这两个整数的和等于目标值。如果找不到这样的两个数，通常返回一个特定的值（如空数组或null）。"
    },
    {
      "query": "TWO SUM问题的目标是什么?",
      "steps": [
        "目标是在数组中找到两个数，使得它们的和等于目标值。",
        "如果存在多个解，通常只返回一个解即可。"
      ],
      "answer": "TWO SUM问题的目标是在数组中找到两个数，使得它们的和等于目标值。如果存在多个解，通常只返回一个解即可。"
    },
    {
      "query": "解决TWO SUM问题的常见算法有哪些?",
      "steps": [
        "暴力法：通过双重循环遍历所有可能的数对，时间复杂度为O(n^2)。",
        "哈希表法：使用哈希表存储数组元素及其索引，时间复杂度为O(n)。"
      ],
      "answer": "解决TWO SUM问题的常见算法有暴力法和哈希表法。暴力法通过双重循环遍历所有可能的数对，时间复杂度为O(n^2)；哈希表法使用哈希表存储数组元素及其索引，时间复杂度为O(n)。"
    },
    {
      "query": "如何实现TWO SUM问题的解决方案?",
      "steps": [
        "选择哈希表法，因为它的时间复杂度较低。",
        "遍历数组，对于每个元素，检查哈希表中是否存在目标值减去当前元素的值。",
        "如果存在，返回当前元素的索引和哈希表中对应元素的索引。",
        "如果不存在，将当前元素及其索引存入哈希表。",
        "代码示例：\n‍‍‍```python\ndef two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []\n‍‍‍```"
      ],
      "answer": "选择哈希表法，因为它的时间复杂度较低。遍历数组，对于每个元素，检查哈希表中是否存在目标值减去当前元素的值。如果存在，返回当前元素的索引和哈希表中对应元素的索引。如果不存在，将当前元素及其索引存入哈希表。代码示例：\n‍‍‍```python\ndef two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []\n‍‍‍```"
    },
    {
      "query": "TWO SUM问题的复杂度是多少?",
      "steps": [
        "哈希表法的时间复杂度为O(n)，因为只需要遍历数组一次。",
        "空间复杂度为O(n)，因为需要存储哈希表。"
      ],
      "answer": "哈希表法的时间复杂度为O(n)，因为只需要遍历数组一次。空间复杂度为O(n)，因为需要存储哈希表。"
    }
  ],
  "final_answer": "要解决TWO SUM问题，可以使用哈希表法。该方法的时间复杂度为O(n)，空间复杂度为O(n)。具体步骤是遍历数组，对于每个元素，检查哈希表中是否存在目标值减去当前元素的值。如果存在，返回当前元素的索引和哈希表中对应元素的索引。如果不存在，将当前元素及其索引存入哈希表。代码示例：\n‍‍‍```python\ndef two_sum(nums, target):\n    hash_map = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in hash_map:\n            return [hash_map[complement], i]\n        hash_map[num] = i\n    return []\n‍‍‍```"
}
```

# 总结

1. 现在的实现方案是基于问题分解, 效果不太好
2. 在最开始写analyze的时候, 我希望通过递归的写法来分解子问题, 直到问题无法分解, 当代码逻辑过于复杂的时候, 已经此时很难"执行"代码了
3. 问题的分解是回答效果的关键, 应该有重点的进行问题的分解, 现在的写法还有很大的问题, 问题的分解不是越细越好
4. 后续的实现逻辑应该是基于问题理解, 解决路径规划 这两个步骤

    - 问题可能的坑是什么? 问题中有哪些最关键的定义/概念?
    - **需要做哪些事情来解决最关键的问题? 怎么在output中验证? 自我验证的部分**
5. 最后的答案总结, 用一个Summarize效果还是不好, 这里最好能够再写一个指令来处理.
6. 自动 few-shot 是一个很有意思的探索领域, 在output中可以直接做的, 可以再试试效果, 牺牲output token数量, 来换取更好的结果, 一些场景下可能还是需要的
