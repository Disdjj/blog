---
title: 使用Code-Like Prompt重构ReAct
slug: use-codelike-prompt-to-reconstruct-react-z15etge
url: /post/use-codelike-prompt-to-reconstruct-react-z15etge.html
date: '2024-09-12 17:12:13+08:00'
lastmod: '2025-11-17 22:59:57+08:00'
toc: true
isCJKLanguage: true
---



# 使用Code-Like Prompt重构ReAct

ReAct的主要就是备用来调用函数, 现在给出一个使用Code-Like的Prompt, 同样支持外部函数调用

稍微修改一下choose_action, 应该就可以实现一次性调用多个外部工具.

支持Json返回, 而且返回很稳定.

# ReAct in Code-Like

```
# you are a process, follow the code.

import json
from typing import (
    Dict,
    Any,
    List,
    Callable,
)

from llm.core import (
    input,
    output,
    think,
    choose,
    check_and_fix,
)

from llm.tools import remove_code_block


def quark_search(search_query: str) -> str:
    """
    夸克搜索功能

    search_query: str - 搜索关键词或短语

    Response:
    str - 搜索结果摘要
    """
    pass


def image_gen(query: str) -> str:
    """
    生成图像, 给出描述的文本, 生成对应的图像

    query: str - 中文关键词，描述了希望图像具有什么内容

    Response:
    str - 生成图像的URL
    """
    pass


tools: Dict[str, Callable] = {
    "quark_search": quark_search,
    "image_gen": image_gen
}


def next_thought(query: str, steps: [str], tools: Dict[str, Callable] ) -> str:
    """
    思考下一步行动
    Args:
        query: question
        steps: list of step, like:
            [
                "Question: {the input question you must answer}",
                "Thought: {you should always think about what to do",
                "Action: {the action to take and parameters}, must be one of tools",
                "Observation: {the result of the action}",
                ...
            ]
        actions:
            dict of action name and function
    Returns:
        str - base on the query, steps, actions, answer what is next key question to solve
        for example:
         1. "i need to know what is {keyword}?"
         2. if you can get the final answer, you can return "Final Answer: `result`"
    """
    tmps = []
    for i in range(5):
        think(query, steps, tools)
    # choose best response for query from tmps
    return choose(tmps, question=query)

def deepthink(query: str):
    """
    深度思考query, 原理是迭代调用think函数5次, 选择最佳的回答, 并且返回该回答
    """
    tmps = []
    for i in range(5):
        tmps.append(think(query))
    # choose best response for query from tmps
    return choose(tmps, question=query)

def choose_action(query: str) -> (str, dict):
    function_name, parameters = deepthink(query)
    if function_name not in tools:
        raise
    parameter_dict = check_and_fix(parameters, description="a python dict which can call function in **parameters")
    return function_name, parameter_dict


steps: List[str] = [

]


def react_agent(question: str) -> str:
    """
    用于回答问题和执行操作

    question: str - 用户输入的问题

    Response:
    str - 处理过程和最终答案
    """

    while True:
        # 思考下一步行动
        thought = next_thought(question, steps, tools)

        # 如果已经知道最终答案，则结束循环
        if "Final Answer" in thought:
            return thought
        else:
            steps.append(f"Thought: {thought}")

        # 决定行动并执行
        function_name, parameters_dict = choose_action(thought)
        j = {
            "thought": thought,
            "action": {
                "name": f"{function_name}",
                "parameters": parameters_dict
            }
        }
        return json.dumps(j)


# only do this
if __name__ == "__main__":
    user_question = "什么狗屁不通现象?"
    result = react_agent(user_question)
    result = remove_code_block(result)
    output(result)
```

# 效果

> 使用DeepSeek, 温度设为0.5, 其他没有限制

返回内容

```json
{
    "thought": "我需要知道什么是狗屁不通现象?",
    "action": {
        "name": "quark_search",
        "parameters": {
            "search_query": "狗屁不通现象"
        }
    }
}
```

完整对话:

```
# ReAct

## 1. output

**system**: 

‍‍```
# you are a process, follow the code.

import json
from typing import (
    Dict,
    Any,
    List,
    Callable,
)

from llm.core import (
    input,
    output,
    think,
    choose,
    check_and_fix,
)

from llm.tools import remove_code_block


def quark_search(search_query: str) -> str:
    """
    夸克搜索功能

    search_query: str - 搜索关键词或短语

    Response:
    str - 搜索结果摘要
    """
    pass


def image_gen(query: str) -> str:
    """
    生成图像, 给出描述的文本, 生成对应的图像

    query: str - 中文关键词，描述了希望图像具有什么内容

    Response:
    str - 生成图像的URL
    """
    pass


tools: Dict[str, Callable] = {
    "quark_search": quark_search,
    "image_gen": image_gen
}


def next_thought(query: str, steps: [str], tools: Dict[str, Callable] ) -> str:
    """
    思考下一步行动
    Args:
        query: question
        steps: list of step, like:
            [
                "Question: {the input question you must answer}",
                "Thought: {you should always think about what to do",
                "Action: {the action to take and parameters}, must be one of tools",
                "Observation: {the result of the action}",
                ...
            ]
        actions:
            dict of action name and function
    Returns:
        str - base on the query, steps, actions, answer what is next key question to solve
        for example:
         1. "i need to know what is {keyword}?"
         2. if you can get the final answer, you can return "Final Answer: `result`"
    """
    tmps = []
    for i in range(5):
        think(query, steps, tools)
    # choose best response for query from tmps
    return choose(tmps, question=query)

def deepthink(query: str):
    """
    深度思考query, 原理是迭代调用think函数5次, 选择最佳的回答, 并且返回该回答
    """
    tmps = []
    for i in range(5):
        tmps.append(think(query))
    # choose best response for query from tmps
    return choose(tmps, question=query)

def choose_action(query: str) -> (str, dict):
    function_name, parameters = deepthink(query)
    if function_name not in tools:
        raise
    parameter_dict = check_and_fix(parameters, description="a python dict which can call function in **parameters")
    return function_name, parameter_dict


steps: List[str] = [

]


def react_agent(question: str) -> str:
    """
    用于回答问题和执行操作

    question: str - 用户输入的问题

    Response:
    str - 处理过程和最终答案
    """

    while True:
        # 思考下一步行动
        thought = next_thought(question, steps, tools)

        # 如果已经知道最终答案，则结束循环
        if "Final Answer" in thought:
            return thought
        else:
            steps.append(f"Thought: {thought}")

        # 决定行动并执行
        function_name, parameters_dict = choose_action(thought)
        j = {
            "thought": thought,
            "action": {
                "name": f"{function_name}",
                "parameters": parameters_dict
            }
        }
        return json.dumps(j)


# only do this
if __name__ == "__main__":
    user_question = "什么狗屁不通现象?"
    result = react_agent(user_question)
    result = remove_code_block(result)
    output(result)
‍‍```

**user**: 

‍‍```
output
‍‍```

**assistant**: 

‍‍```

{
    "thought": "我需要知道什么是狗屁不通现象?",
    "action": {
        "name": "quark_search",
        "parameters": {
            "search_query": "狗屁不通现象"
        }
    }
}

‍‍```
```

# 解释

## Tools

```
def quark_search(search_query: str) -> str:
    """
    夸克搜索功能

    search_query: str - 搜索关键词或短语

    Response:
    str - 搜索结果摘要
    """
    pass


def image_gen(query: str) -> str:
    """
    生成图像, 给出描述的文本, 生成对应的图像

    query: str - 中文关键词，描述了希望图像具有什么内容

    Response:
    str - 生成图像的URL
    """
    pass
```

以上就是Tools的注入, 可以直接写成一个函数定义, 非常的好用

## next_thought

这函数还有很大的进步空间, 但是我已经不太想修改它了.

主要就是定义了Thought, 这一步应该是最影响效果的.

主要是结束最终的FinalAnswer, 这个需要好好设计一下.

我暂时没有心情去做, 回来补上再说
