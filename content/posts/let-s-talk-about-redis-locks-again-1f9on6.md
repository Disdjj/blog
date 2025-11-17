---
title: 再谈Redis的锁
slug: let-s-talk-about-redis-locks-again-1f9on6
url: /post/let-s-talk-about-redis-locks-again-1f9on6.html
date: '2024-03-29 12:10:11+08:00'
lastmod: '2025-11-17 22:56:58+08:00'
toc: true
isCJKLanguage: true
---



# 再谈Redis的锁

# 单机悲观锁

[参考实现](https://github.com/bsm/redislock)

## 流程

1. 加锁, 如果失败, 则放弃或重试
2. 占用, 业务逻辑
3. 释放

## 实现

1. ​`INCR`: 通过返回结果是不是 0
2. ​`SETNX`: 通过判断结果是否为 0
3. ​`MSETNX`​: 一次性获取多个key的占用 Redis: msetnx[^1]

# 乐观锁

## 定义

乐观锁并不会直接对临界数据加锁，而是在对临界数据进行操作前，通过某种机制来检查数据是否存在冲突，如果存在冲突，则不更新数据，不存在冲突才操作临界数据。乐观锁总是快到操作数据前才做冲突检查，而不像悲观锁那样第一时间先上锁，这或许是称它为“乐观锁”的原因。乐观锁适合读多写少的场景。

## 实现

Redis事务 + Watch 命令

[Redis事务](https://redis.io/docs/interact/transactions/)

[Redis Watch](https://redis.io/commands/watch/)

## 讨论

1. Redis的`事务`是具有迷惑性的

    - 不具备原子性 原子性: 不可分割, 要么都完成, 要么都不完成[^2]
2. 如果真的对事务操作有着非常强的需求, 使用lua脚本会是一个更好的方式

    更好的逻辑控制能力, 例如失败后的回滚, 等等

[^1]: # Redis: msetnx

    当且仅当给定的所有键都不存在时, 为所有的键设定值

    只要有一个键存在, 则拒绝所有操作, 并返回 0

    即: 要么全部设置, 要么全部不设置

    即: 要么全部设置, 要么全部不设置


[^2]: - 原子性: 不可分割, 要么都完成, 要么都不完成
