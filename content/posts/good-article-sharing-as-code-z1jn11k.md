---
title: '好文分享: As Code'
slug: good-article-sharing-as-code-z1jn11k
url: /post/good-article-sharing-as-code-z1jn11k.html
date: '2025-08-04 17:39:58+08:00'
lastmod: '2025-11-17 23:05:42+08:00'
toc: true
isCJKLanguage: true
tags: ["AsCode", "思考", "软件工程"]
---



# 好文分享: As Code

[原文地址](https://mitchellh.com/writing/as-code)

hashicorp的大名早就听说过了, 今天正好看到了其联合创始人的一篇文章: As Code

文章很短. 只有一页不到, 其中的观点让我觉得很受教. 分享出来一起学习.

as code 是一个非常值得深究的话题, K8S 可以称之为 Deployment as code, Terraform可以称之为 Infra as code.

当一种技术能够被as code的时候, 证明了两件事情:

1. 成体系
2. 能够复用/分享/传播

引用原文中的一段:

> My intent with "X as Code"<sup>[3](https://mitchellh.com/writing/as-code#user-content-fn-3)</sup> was always to get knowledge out of people's heads and into a more inscribed system. Once inscribed, knowledge and process can be shared, versioned, iterated upon, etc.
>
> The relation to programming is that codified knowledge tends to also be computer-readable and comes with the full benefits of that (e.g. automation, validation, etc). However, I don't believe that implies that all the requirements of modern programming should be applied to "as code" systems.

其中最好的一句话是: 一旦具象化, 知识和流程就能够被分享, 版本管理, 迭代优化.

---

在recorder的开发中也是秉持着同样的思路: 一个高质量的代码提交, 结果非常重要, 但是得出结果的过程同样重要.

于是recorder的核心就变成了: 过程 as code. 将构建代码的过程定义成代码.

听起来有点傻逼, 核心是: 只看结果是不够的, 要给AI看过程, 过程是重要的.

‍
