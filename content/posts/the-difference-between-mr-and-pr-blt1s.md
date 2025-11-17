---
title: MR以及PR的区别
slug: the-difference-between-mr-and-pr-blt1s
url: /post/the-difference-between-mr-and-pr-blt1s.html
date: '2024-03-15 20:27:22+08:00'
lastmod: '2025-11-17 22:33:50+08:00'
toc: true
isCJKLanguage: true
tags: ["Git", "MR", "PR", "版本控制"]
---



# MR以及PR的区别

# MR以及PR的区别

# 背景介绍

我一直是管自己的开发分支合并到master这个请求叫做PR(pull request), 但是360的同事们称之为MR(Merge Request), 我觉得非常的奇怪, 本文就对两者的区别进行探究, 到底什么才是一个合理的叫法

# 技术要点

## PR

源自于github的叫法

有两个使用场景

1. 给自己没有权限的项目的repo提交合并请求

   ![](/images/1456655-20220202101733148-955020430_ybHBXXaI-5-20240315202752-z0k44lz.png)
2. 给自己有权限的repo提交合并请求

   ![](/images/1456655-20220202101749431-29641442_86qD6I-lCL-20240315202752-0wx19a5.png)

## MR

源自于gitlab的叫法

虽然也有上述的两种场景, 但是在其提交界面中可以指定src repo, src branch, dst repo, dst branch

所以融合了上述的功能

![](/images/1456655-20220202101809176-136197835_QmQO4J035P-20240315202752-vyw5196.png)

# 总结

1. 如果是在参与开源, 那就直接使用PR
2. 如果是在公司内部, 且使用的git平台是gitlab 那么可以直接使用MR来称呼
3. 通常来说MR可以更加直观的指代合并两个分支的需求.

# 参考资料

[https://www.cnblogs.com/hi3254014978/p/15860103.html](https://www.cnblogs.com/hi3254014978/p/15860103.html "https://www.cnblogs.com/hi3254014978/p/15860103.html")
