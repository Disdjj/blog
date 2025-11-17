---
title: etcd:基本使用
slug: basic-use-1kc9ft
url: /post/basic-use-1kc9ft.html
date: '2024-03-15 20:59:43+08:00'
lastmod: '2025-11-17 22:56:19+08:00'
toc: true
isCJKLanguage: true
tags: ["etcd", "Go", "分布式", "入门"]
---



# etcd:基本使用

# 基本使用

# 建立连接

```go
// init etcd client
  client, err := clientv3.New(
    clientv3.Config{
      Endpoints:   []string{"http://localhost:2379"},
      DialTimeout: 5 * time.Second,
    },
  )
```

这里需要注意Endpoints, 传入的是一个list

这样做的原因很简单, 出于容灾的考虑, 当其中的一个连接失效后, 可以切换到连接其他server上

# Get/Set

这是其作为一个KV存储的基本能力

```go
  put, _ := client.Put(context.Background(), "djj", "DJJDJJ")
  println(put.Header.String())

  get, _ := client.Get(context.Background(), "secret")
  println(string(get.Kvs[0].Value))
```

# Lease

lease的翻译应该为 租约, 我认为这个命名还是相当准确的描述出了它的作用

1. 控制TTL
2. 管理资产, 这里的资产指的可能是多个

```go
  grant, err := client.Grant(ctx, 100)

  put, _ := client.Put(context.Background(), "djj", "DJJDJJ", clientv3.WithLease(grant.ID))
  println(put.Header.String())
```

但是应当注意, lease的创建和key的绑定是分开的.

一个租约可以对应多个key

# Watch

Watch提供的能力是观测Key的变化

```go
  bgCtx := context.Background()
  watchChan := client.Watch(bgCtx, "djj", clientv3.WithPrefix(), clientv3.WithRev(0), clientv3.WithKeysOnly())
  for {
    select {
    case <-bgCtx.Done():
      return
    case resp := <-watchChan:
      for _, event := range resp.Events {
        fmt.Printf("type: %s, key: %s, value: %s\n", event.Type, event.Kv.Key, event.Kv.Value)
      }
    }
  }
```

以上就是一个简单的Watch的使用

在V3版本的etcd中, 使用stream模式来实现推送, 而不是v2的轮询方式, 较好的节省了资源.

在创建了watch之后, 可以通过监听channel来实时的获取新更改的返回.
