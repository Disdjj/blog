---
title: 我们真的需要Langchain吗?
slug: do-we-really-need-langchain-1nl8jf
url: /post/do-we-really-need-langchain-1nl8jf.html
date: '2024-08-31 16:22:10+08:00'
lastmod: '2025-11-17 22:59:27+08:00'
toc: true
isCJKLanguage: true
---



# 我们真的需要Langchain吗?

> 最近在思考一个问题, 在真正的产品应用中, 真的需要Langchain吗?

# 工业应用

## 请求量级

笔者之前在某家ChatBot工作, 可以提供的数据量级大概是这样的

QPS基本在5000左右, 目前看来这是业界中比较高的量级

如果考虑到需要额外的搭配的其他组件, 存储, MQ, Cache等等, 会有一些更大的扩散

## 请求特点

一个需要特别注意的事情是, 在业务比较稳定的情况下, 实际上Prompt是比较稳定的, 在实际应用中主要有以下:

1. RolePlay(单体角色扮演)
2. Group RolePlay(群聊)
3. Translate(翻译)
4. Summarize(记忆总结)

可以看到的是, 用到的Prompt的特点是比较少的, 而且通常来说格式是固定的, 而且改动频率较低

# Prompt

以RolePlay作为例子, Prompt的结构类似于

```markdown
{Role Play 角色扮演指令}

{Character Profile 角色信息}

{Context Messages 上下文消息}

{Jail Break 越狱指令}

{Language Instruction 语言指令}
```

其中只有角色信息以及, 上下文消息是需要动态拼接

而且由于请求量级非常大, 所以会单独的拆分一个包含存储/缓存的模块服务来提供Prompt的组织

# Langchain

很好, 如果是想要构建一个Demo来进行测试或者是进行演示, 那么毫无疑问, Langchain是非常好用的.

搭配上非常丰富的生态, 构建的速度确实非常快速, 而且现在Langchain hub是有很丰富的Prompt资源.

大部分情况下, 可以在30行的量级上就构建出一个Demo

一切看起来都很美好, 但是有这么几个问题

1. LLM Client的负载能力没法拓展, 实际上在业务量级较大的情况下, 必须进行功能的拆分
2. 如果只把Langchain作为组装Prompt的组件, 似乎这个组件又太重了
3. 如果作为Prompt的来源, 一些业务又存在定制的问题

甚至我认为在必要的情况下, 如果你的业务不太复杂, 你完全不需要引入任何所谓的LLM框架

# LLM 框架

现在的LLM框架想要做太多的事情, 想要做LLM API Client, 想要做Prompt, 想好做memory, 想做index, RAG ....

太贪心了, 真的太贪心了

在产品实践之后, 我认为最重要的事情从来都不是把所有的事情都结合到一起, 最重要的事情是知道自己需要什么东西

就现在看来, 我完全不觉得现在这些LLM 框架有真正的生产价值, 依然需要工程师进行大量的适配工作

而这些适配的工作量可能要比使用LLM框架的成本更高

## 反例

但是实际上还是有反例的, 如果我们还是以传统的轻客户端来看, 那么以上的批评是没有问题的, 如果是重客户端的话, 我认为是完全没有问题的

但是用python做客户端吗?NO,NO,NO

不过这倒是引入了另一个问题, 会有多少人原因用python来构建客户端呢?

# 总结

好好学习构建Prompt要比学习使用这些LLM框架更有用

抛开这些名不副实的LLM框架吧, 用他们来做原型而不是做产品应用
