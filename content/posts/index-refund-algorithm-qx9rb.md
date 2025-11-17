---
title: 指数退避算法
slug: index-refund-algorithm-qx9rb
url: /post/index-refund-algorithm-qx9rb.html
date: '2024-03-15 20:27:33+08:00'
lastmod: '2025-11-17 22:57:10+08:00'
toc: true
isCJKLanguage: true
tags: ["算法", "并发", "指数退避"]
---



# 指数退避算法

# 指数退避算法

> 在查看Ants的源码时, 发现了一个关于自旋锁 spinlock的一个操作, 就此引入指数退避算法以及相关的实现.
> 互斥锁/自旋锁

# 示例代码

```go
func (sl *spinLock) Lock() {
  backoff := 1
  for !atomic.CompareAndSwapUint32((*uint32)(sl), 0, 1) {
    // Leverage the exponential backoff algorithm, see https://en.wikipedia.org/wiki/Exponential_backoff.
    for i := 0; i < backoff; i++ {
      runtime.Gosched()
    }
    if backoff < maxBackoff {
      backoff <<= 1
    }
  }
}
```

# 解释

1. 第3行, 尝试CAS获得锁, 如果获取成功, 直接返回
2. 如果获取失败, 尝试等待 n 个时间片
3. backOff << 1 , 重新尝试获取

# 重点

需要重点关注的是backOff的值, 会指数递增, 从 1 > 2 > 4 > 8 > 16 > ... 

随着尝试次数的增加, 等待时间也会增长, 这就是指数递增.

# 参考文档

[   https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn](https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn "   https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn")
