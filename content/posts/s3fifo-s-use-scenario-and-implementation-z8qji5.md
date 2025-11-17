---
title: S3-FIFO的使用场景以及实现
slug: s3fifo-s-use-scenario-and-implementation-z8qji5
url: /post/s3fifo-s-use-scenario-and-implementation-z8qji5.html
date: '2024-05-02 01:03:55+08:00'
lastmod: '2025-11-17 23:00:54+08:00'
toc: true
isCJKLanguage: true
---



# S3-FIFO的使用场景以及实现

> 本文介绍一种缓存淘汰策略, s3-fifo
>
> 这里的s3和对象存储s3没有关系, 实际指代的是: **S**imple and **S**calable caching with **three** **S**tatic **FIFO** queues
>
> [参考gif](https://s3fifo.com/assets/images/illustrations/s3fifo_diagram.gif)
>
> ![](https://s3fifo.com/assets/images/illustrations/s3fifo_diagram.gif "运行逻辑示意图")

# 参考

先把[参考](https://s3fifo.com/blog/2023/08/01/fifo-queues-are-all-you-need-for-cache-eviction/#dataset-information)放在最前面

# 出现原因

1. ​`one-hit-wonder`我暂时不知道该怎么翻译, 在缓存领域可以认为是有且仅有一次的场景, 而这种场景并不少见.

# 实现

![image](/images/image-20240502234021-g78o5m2.png)

S3-FIFO 使用三个 FIFO 队列：

1. 小型 FIFO 队列 (S)
2. 主 FIFO 队列 (M)
3. 幽灵 FIFO 队列 (G)。
4. 我们选择 S 使用 10% 的缓存空间，发现 10% 的泛化效果很好。 M则使用90%的缓存空间。幽灵队列 G 存储与 M 相同数量的幽灵条目。

## S

S的主要作用:

1. 高频快速的读写支持
2. Serve one-hit

## M

被认定为长期的存储

1. 谨慎淘汰
2. 快速回流

## G

一个工具Q, 可以认为在此Q中的元素是曾经访问过, 但是不太**热门**, 但是如果再次访问到了, 这意味着这绝对是一个热门元素.

同时承担元素回收的作用.

# 实现思路

## entry

1. Key
2. Value
3. freq

## G

1. Key Only
2. FIFO Cache

## S / M / G

普通的FIFO Cache

# 实现参考

这个应该是最简单的一个实现, 主要用来大概了解下思路[https://github.com/Disdjj/go-s3-fifo](https://github.com/Disdjj/go-s3-fifo)

‍
