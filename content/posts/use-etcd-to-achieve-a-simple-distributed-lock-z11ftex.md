---
title: 使用etcd来实现一个简单的分布式锁
slug: use-etcd-to-achieve-a-simple-distributed-lock-z11ftex
url: /post/use-etcd-to-achieve-a-simple-distributed-lock-z11ftex.html
date: '2024-03-15 20:59:43+08:00'
lastmod: '2025-11-17 22:56:24+08:00'
toc: true
isCJKLanguage: true
---



# 使用etcd来实现一个简单的分布式锁

# 使用etcd来实现一个简单的分布式锁

分布式锁有着极为广泛的使用, 在多节点服务部署中是必不可少的一环.

在本文中, 我们尝试以etcd为基础来实现一个简单的分布式锁.

# 基本能力

1. Lock 上锁
2. Unlock 解锁
3. 一些额外的设置, 比如Watch-Dog模式/ 设置最长运行时间等等

# 设计方案

## 如果获取当前的锁的状态?

我们都知道, 在redis中可以通过`SetNx` `Incr`来实现这个方式

归根到底, 判断加锁是否成功只需要确认一点, 那就是锁的首次且唯一性, 我们使用SetNx是通过保证只有第一个操作能得到1来保证的. Incr是通过保证1是首次出现且之后不会在出现来保证的.

那么在etcd这个kv存储中, 有什么是首次唯一的呢?

答案是 key的revision.

我们可以通过键值对的revision来判断这个某个锁是否被创建以及被释放.

一个使用到的知识是: 未被创建的key的revision是 0

被创建到的key的revision, 必不为0

```go
// 代码表述为
if revision != 0{
    // 拿锁失败
    return false
}else{
    // set key
    try:
        lock = 1
        return true
    expect:
        return false
}
```

# 实现

一个十分粗糙的实现版本, 仅供参考

```go
package main

import (
  "context"
  "time"

  clientv3 "go.etcd.io/etcd/client/v3"
)

const commonPrefix = "/_locks/"

type EtcdLock struct {
  client  *clientv3.Client
  key     string
  leaseId clientv3.LeaseID
  ctx     context.Context

  innerCtx       context.Context
  innerCtxCancel context.CancelFunc
}

func NewEtcdLock(c *clientv3.Client) *EtcdLock {
  return &EtcdLock{
    client: c,
  }
}

func (e *EtcdLock) WithContext(ctx context.Context) *EtcdLock {
  e.ctx = ctx
  return e
}

func (e *EtcdLock) WithKey(key string) *EtcdLock {
  e.key = key
  return e
}

func (e *EtcdLock) WatchDog() {
  // 定时器
  t := time.NewTimer(4 * time.Second)
  defer t.Stop()

  for {
    select {
    case <-e.innerCtx.Done():
      return
    case <-t.C:
      // 5s refresh lease
      _, err := e.client.KeepAliveOnce(e.ctx, e.leaseId)
      if err != nil {
        return
      }
    }
  }
}

func (e *EtcdLock) Lock() bool {
  grant, err := e.client.Grant(e.ctx, 5)
  if err != nil {
    return false
  }

  e.leaseId = grant.ID
  // 1. get key revision
  cmp := clientv3.Compare(clientv3.CreateRevision(commonPrefix+e.key), "=", 0)
  // 2. create key
  put := clientv3.OpPut(commonPrefix+e.key, "locked", clientv3.WithLease(e.leaseId))
  // 3. transaction
  resp, err := e.client.Txn(e.ctx).If(cmp).Then(put).Commit()
  if err != nil {
    return false
  }
  if !resp.Succeeded {
    return false
  }

  e.innerCtx, e.innerCtxCancel = context.WithCancel(e.ctx)
  go e.WatchDog()

  return true
}

func (e *EtcdLock) Unlock() error {
  // just delete lease
  _, err := e.client.Revoke(e.ctx, e.leaseId)
  e.innerCtxCancel()
  if err != nil {
    return err
  }
  return nil
}

```
