---
title: llmdoc v3
slug: llmdoc-v3-z1bqdqk
url: /post/llmdoc-v3-z1bqdqk.html
date: '2026-08-31 16:04:29+08:00'
lastmod: '2026-08-31 17:10:42+08:00'
toc: true
isCJKLanguage: true
---



# llmdoc v3

> 官网: [https://llmdoc.tokenroll.ai/](https://llmdoc.tokenroll.ai/)
>
> Github: [https://github.com/TokenRollAI/llmdoc](https://github.com/TokenRollAI/llmdoc)

llmdoc的诞生非常无厘头: AI 写的代码太多了, 我完全 review 不过来

尤其在10W 行以上的代码库里, 组织 context 的时候总是不稳定, 需要我不断的说明应该看 xx 代码, 于是我就想在代码层之上做一层抽象

可是问题来了: 代码的可读抽象应该是什么? 想了两分钟: 文档啊

这就是最开始 llmdoc 的设计思路: 让 AI 自维护文档, 让文档帮助 AI 更好的组织 context

# 适合 AI 的文档结构?

可是什么才是适合 AI 的文档结构呢?

我实在是没有找到好的解决思路, 在 25 年这个时间点, 有 rules, 有 claude.md/agents.md 但是坦白说他们承载的信息量都不是很大, 很难具体描述到某个模块的架构设计和注意事项, 到 V2 我也没有解决掉这个问题

最后实在没招儿了, 我觉得适合人类阅读的方式, 至少对于 AI 来说是"可理解"的, 于是就用了最经典的文档组织形式: [Diátaxis](https://diataxis.fr/)

![image](/images/image-20260124033626-85hggq2.png)

细节大家可以自己去看, 我就不做过多解释

这个结构支撑了相当长的时间, 在实际的生产业务中, 也确实帮助AI Coding 解决了许多问题

可是随着文档的维护和迭代, 一些问题又出现了:

1. 如果PR没有更新文档, 文档和代码不一致该怎么办?
2. 文档的内容太多, 甚至超过代码数量, 内容不够精简
3. 不合理的文档结构, 导致每次 PR 都要解决大量的文档冲突
4. 太过于依赖 Agent 的判断, 有些操作是完全可以交给固定的程序来做的

# 信息密度 和 Context稀释

我有一个简单的思路: 高层的抽象应该有更加简洁表达和更加高密度的信息

当高层抽象向底层实现物化时, 一定"稀释"密度, 换来更好的"可执行性"

可惜我没有什么实际的或者客观的数据能够证明这件事情, 这些都是来自我对 Agent 运行的观察以及一些直觉 😭

# About V3

所以回到正题, 如果要继续改进 V3 需要怎么做呢?

我和我的好朋友(不愿意透露姓名的zzb) 提了这样一个方案: https://github.com/TokenRollAI/llmdoc/issues/32

简单来说:

1. 不改变 llmdoc 的核心定位: 一个跟随代码做版本控制的外置 context provider
2. doc 中保留最关键的信息: 决策/架构/设计
3. 用稳定的 cli 替代掉 hook sh
4. 更好的支持 diff code 和 doc 的 gap
5. 文档增加 meta info 用来承担 description 和 related code file
6. 更适合 AI 的文档组织形式: 按照 topic 和 domain 划分, 适合快速阅读和

### Design

详细的设计请看: **[v3-design](https://github.com/TokenRollAI/llmdoc/tree/main/docs/v3-design)**
