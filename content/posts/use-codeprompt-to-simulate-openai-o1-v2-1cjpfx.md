---
title: '使用Code-Prompt模拟实现openai o1: V2'
slug: use-codeprompt-to-simulate-openai-o1-v2-1cjpfx
url: /post/use-codeprompt-to-simulate-openai-o1-v2-1cjpfx.html
date: '2024-09-20 15:01:41+08:00'
lastmod: '2025-11-17 23:00:47+08:00'
toc: true
isCJKLanguage: true
tags: ["Prompt", "LLM", "AI", "o1"]
---



# 使用Code-Prompt模拟实现openai o1: V2

在之前的一个版本中, 展现出来一定的思考能力, 但是这只是一种表演型的思考能力, 为什么?

根据实际的观察, 我认为是因为规划的部分, 这部分实际上是有问题的, 将后续的Step限制的太严重了.

# 改进思路

其实在上一期已经提过了, 那就是怎么思考, 思考不是能够在一开始就就能够规划好的

那么问题来了, 怎么做呢?

1. 在最开始的时候, 分析: 领域/问题/限制条件
2. Act Expert: 扮演专家重新分析问题
3. Loop: Step, 从分析触发, 每一步的输入参数包括

    - 原始问题
    - 已经采取的步骤
    - 上一个步骤后得到的结果

    输出参数应该包括:

    - 本步骤要做的事情, 很小的一步
    - 概括本步骤做的事情
    - 本步骤所解决的问题
    - 本步骤得到的结果
4. 最后的总结

# Prompt

```python
# YOU ARE A PROCESS, EXECUTE THE FOLLOWING CODE!
# ONLY OUTPUT THE CODE RESULT!

# llm Package is yourself(LLM)'s ability
from llm import (
    deepthink,
    expert,
    infer,
    judge,
)
from llm.io import (
    input,
    output,
)


def analyze_query(query: str):
    res = {}
    # 1. understand the query
    understandings = deepthink(f"what is the most important definition or concept of '{query}'?", list_length=(2, 10))
    res["key_word"] = understandings

    # 2. knowledge regions
    knowledge_region = deepthink(f"what knowledge regions does query: '{query}' belong to?", list_length=(3, 20))
    res["knowledge_region"] = knowledge_region

    return res


def get_expert(regions, key_words):
    # target: get an expert based on the knowledge region
    expt = expert(regions=regions, key_words=key_words)
    return expt


def expert_analyze(q: str, expert):
    # target: analyze the query in the expert's view
    # e.g. "what is the most important part of the query?"
    # e.g. "what is the most important concept/definition/theorem/formula in the query?"
    # e.g. "what should i take care of when solve the query?"
    # DO NOT take action, just analyze the query
    res = expert.analyze(q, structure_output=True)
    return res


def get_final_result(result: dict):
    # target: give the final result of the query
    final_result = infer(
        raw_query=result["raw_query"],
        analysis=result["expert_analysis"],
        actions=result["actions"])  # infer the final result from the raw query, query analysis and actions
    return final_result


def step(q: str, expert, prev_steps):
    # target: do the next little step

    # 0. check if the query is solved
    if judge(query=q, judge_by="is the query solved?"):
        return None

    # 1. what to do, just a slow, clear and simple action
    todo = expert.plan(f"if i want to solve the query: '{q}', what should i do? i have done the following steps: {prev_steps}")

    # do the action
    # e.g. if in math, do a simple math calculation or formula or theorem or definition or concept
    # e.g. if in programming, do analysis/design/coding/testing/debugging
    # e.g. if in language, do translation/grammar/word meaning/word usage
    # e.g. if in history, do analysis of historical events or historical figures
    action = expert.do(todo)
    # 2. check the result
    # check the action result in the expert's view, like
    #   "is the result correct?"
    #   "is the result reasonable?"
    #   "is the result acceptable?"
    #   "is the result good enough?"
    # give the detailed reason why the result is correct or not
    check = expert.check(action).result
    # 3. Periodic summary of current result of the query
    # summary = expert.summary(q, action, check, prev_steps)

    step_result = {
        "action": action,
        "check": check,
        # "summary": summary
    }
    return step_result


def o1(query: str):

    result = {"raw_query": query}
    # step 1: analyze the query
    analysis = analyze_query(query)
    result["analysis"] = analysis

    # step 2: sub-questions
    expt = get_expert(analysis["knowledge_region"], analysis["key_word"])
    result["expert"] = {
        "name": expt.name,
        "description": expt.description  # expert's description. e.g. "I am an expert in ..."
    }
    expt_query = deepthink(f"Rephrase the question: {query} using professional language.", expert=expt)
    result["expert_query"] = expt_query
    # step 3: schedule a plan to solve the query
    result["expert_analysis"] = expert_analyze(expt_query, expt)
    # step 4: action steps
    steps = []
    q = query
    while True:
        step_result = step(q, expt, steps)
        if step_result is None:
            break
        steps.append(step_result)
    result["actions"] = steps

    # step 5: give the result
    final_answer = get_final_result(result)
    result["final_answer"] = final_answer

    return result


# main function
if __name__ == '__main__':
    query = input("Ask me any question, i will tell you the answer:")
    result = o1(query)
    # result = analyze(query)
    output(result, output_format="json", code_region=True)  # output the result in json format but in a code region:‍```json ... ‍```

```

# 结论

有一点效果, 但是效果还是很垃圾

1. 自动的CoT是不行的, 起码自动生成还是不好的, 可能还是需要一个CoT模板
2. 需要一个`反省`的逻辑来处理, 可能会好一些
