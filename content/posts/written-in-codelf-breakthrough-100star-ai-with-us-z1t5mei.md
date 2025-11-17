---
title: 写在Codelf突破100Star:AI与我们
slug: written-in-codelf-breakthrough-100star-ai-with-us-z1t5mei
url: /post/written-in-codelf-breakthrough-100star-ai-with-us-z1t5mei.html
date: '2025-04-21 23:08:56+08:00'
lastmod: '2025-11-17 23:03:19+08:00'
toc: true
isCJKLanguage: true
tags: ["AI", "开源", "Codelf", "GitHub"]
---



# 写在Codelf突破100Star:AI与我们

我和朋友一起写的项目[codelf](https://github.com/Disdjj/codelf)已经突破了100 star

从构思到实现只用了一天的时间, 然后过了一周去了论坛上发了个帖子, 推广了下项目. 项目从0 - 100, 时间只过了一周.

# 感想

我之前是开源世界的旁观者, 看到了许多开源项目, 偶尔会提几个pr, 但是从来没有想过做一个开源项目.

codelf 的产生其实相当巧合, 朋友和我在家里, 我们在讨论cursor在大型项目中的无能为力, 我们都认为在上下文里, 输入有价值的内容, 才能产生有价值的结果.

那么, 什么是有价值的? 你想要修改的部分, 与此相关的代码文件, 类型定义, 接口定义是最有价值的.

但是用户的输入是自然语言, 除非用户显式引入相关代码, 否则其实很难分析出应该关联出相关的代码.

这时朋友的一句话点醒了我: 真正的高手看一眼目录都知道怎么改.

对! 那就让AI看一眼目录, 然后自己去找相关的文件, 本质上是完成了auto-read的功能.

这就是 codelf 的起源.

而且现在可以确认: 目录结构是非常有价值的上下文! [请看cursor](https://www.cursor.com/changelog#:~:text=from%20model%20settings.-,Project%20structure%20in%20context,-Beta)在0.49中推出的改动.

这也让我相信, codelf 还有相当大可以继续挖掘的潜力!

codelf的下一步是为任意AI IDE提供最有价值的上下文, 帮助提升代码生成质量.

# AI与我们

AI的进步速度很快, 但是到现在为止, 关于 `记忆`这件事情, 还是差得远.

上下文本身是一件非常不优美的实现.

为什么? 上下文总是有极限的, 而且组织合理的上下文对于大部分人其实是有相当的难度的.

我相信在不久的将来一定会有一套新的标准: 这套标准定义了AI的记忆, 或者目前来说, 组织上下文的能力.

这件事情会变得非常重要, 而且是越来越重要.

codelf仅仅是这种记忆的一种表现形式而已.

‍
