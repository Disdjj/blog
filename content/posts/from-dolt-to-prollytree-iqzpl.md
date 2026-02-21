---
title: 从dolt到Prolly-Tree
slug: from-dolt-to-prollytree-iqzpl
url: /post/from-dolt-to-prollytree-iqzpl.html
date: '2026-02-21 15:19:47+08:00'
lastmod: '2026-02-21 15:47:07+08:00'
tags:
  - 数据库
  - 版本管理
  - 数据结构
  - 存储引擎
  - dolt
keywords: 数据库,版本管理,数据结构,存储引擎,dolt
description: >-
  本文源于对 Dolt 数据库仓库的观察，其核心特性是支持像 Git 一样对数据库进行版本管理和 Diff。文章重点解析了实现快速 Diff
  的关键技术——Prolly Tree。


  传统 B-Tree 因结构依赖插入顺序，导致相同数据在不同写入序列下树形不同，无法高效 Diff；而单纯 Merkle Tree
  难以兼顾数据库高频随机读写与自平衡需求。Prolly Tree 作为概率 B 树，结合了 B-Tree 的高效有序读写与 Merkle Tree
  的内容寻址特性。


  其核心机制在于概率性分块：通过滚动哈希确定节点边界，使树结构仅取决于数据内容而非写入历史，实现了历史无关性。因此，相同数据集合必然生成完全一致的树结构与哈希值。在进行
  Diff 时，只需比对哈希值并沿差异分支下行，未修改数据块因结构共享而被跳过。这使得 Diff 速度仅与修改量成正比，即便在 TB
  级数据下也能毫秒级完成。文末提供了可视化学习资源供深入理解。
toc: true
isCJKLanguage: true
---



# 从dolt到Prolly-Tree

起因是看到了一个 repo: [https://github.com/dolthub/dolt](https://github.com/dolthub/dolt)

非常有意思的一个特点是: 能够像使用git一样, 对数据库做版本管理/Diff

单就版本管理倒不是什么新鲜的事情, 一个让我很好奇的地方是: 是怎么做到快速的 Diff 呢?

# Merkle Tree

[https://yeasy.gitbook.io/blockchain_guide/05_crypto/merkle_trie](https://yeasy.gitbook.io/blockchain_guide/05_crypto/merkle_trie)

# Prolly Tree (by Gemini)

[Prolly Tree](https://docs.dolthub.com/architecture/storage-engine/prolly-tree)

**Prolly Tree**

Prolly Tree（Probabilistic B-Tree 的缩写）是一种混合数据结构，它完美结合了 ​**B-Tree**​（适合数据库的高效有序读写与自平衡）和 ​**Merkle Tree**（基于内容寻址、支持快速校验）的特性。

想要理解它为什么能做到快速 Diff，需要对比来看：

1. **为什么传统的 B-Tree 做不到快速 Diff？**   
   B-Tree 的节点分裂和树的最终形态高度依赖于​**数据的插入顺序**。即使两个数据库包含完全一模一样的数据，只要写入顺序不同，它们底层的 B-Tree 结构就会截然不同。如果两棵树形状不一样，Diff 时就只能做全量扫描，效率极低。
2. **为什么单纯的 Merkle Tree 也不够？**   
   传统的 Merkle Tree 虽然能通过哈希快速比对，但在应对数据库高频的随机插入和删除时，很难像 B-Tree 那样维持动态的自平衡和高效的区间查询。

**Prolly Tree：**

- ​**概率性分块 (Probabilistic Chunking)** ​：  
  Prolly Tree 放弃了 B-Tree 那种“节点写满就分裂”的固定规则，而是对写入的数据应用​**滚动哈希（Rolling Hash）** 。当某条数据的哈希值满足特定概率条件（例如二进制末尾连续出现 N 个 0）时，就在这里强行划定一个节点边界（Chunk Boundary）。
- ​**历史无关性 / 结构确定性 (History Independence)** ​：  
  因为节点的边界完全是由**数据内容本身**计算出来的，与插入的时间和顺序毫无关系。这就带来了一个极为震撼的特性：​**只要两个数据库里的数据集合相同，无论它们是怎么一步步修改成现在的样子的，最终生成的 Prolly Tree 结构和所有节点的哈希值都完全一模一样**。
- ​**O(差异量) 的极速 Diff**：  
  由于具备了“历史无关性”，Diff 操作变得极其简单。比较两个版本的数据库时，只需要自顶向下比对树的哈希值：

  1. 根节点哈希相同？说明数据完全一致，Diff 瞬间结束。
  2. 根节点不同？继续比对子节点，​**只顺着哈希值不同的分支往下找**。
  3. 那些没有被修改的数据块，它们的哈希和物理结构在两个版本间是**完全共享**的（Structural Sharing），直接跳过。

这就使得数据库的 Diff 速度只与**被修改的数据量**成正比，哪怕在 TB 级别的数据量下，只要只改了几行数据，也能在毫秒级内完成比对！

# 可视化学习(by Claude Code)

Repo: [https://github.com/Disdjj/prolly-tree-learn](https://github.com/Disdjj/prolly-tree-learn)

在线查看: [https://disdjj.github.io/prolly-tree-learn/](https://disdjj.github.io/prolly-tree-learn/)
