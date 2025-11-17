---
title: Golang:无锁队列实现
slug: no-lock-queue-implementation-12u9ni
url: /post/no-lock-queue-implementation-12u9ni.html
date: '2024-03-15 20:27:33+08:00'
lastmod: '2025-11-17 22:55:59+08:00'
toc: true
isCJKLanguage: true
---



# Golang:无锁队列实现

# 无锁队列实现

> [参考论文](https://www.cs.rochester.edu/u/scott/papers/1996_PODC_queues.pdf "参考论文")

# 适用场景

并发条件下, 需要使用到队列的情况, 都可以使用无锁队列

# 技术要点

1. 使用atomic.loadpointer 来实现实时的指针相等判断
2. 使用CAS来替代同步状态下的 p = p.next
3. 额外判断tail是不是正确的tail, 并且不断地尝试推后他

# 示例代码

```go
package djj_worker_pool

import (
    "sync/atomic"
    "unsafe"
)

type QueueNode struct {
    value any
    next  unsafe.Pointer
}

func newNode(v any) *QueueNode {
    return &QueueNode{
        value: v,
        next:  nil,
    }
}

type Queue struct {
    head unsafe.Pointer
    tail unsafe.Pointer
}

func (q *Queue) Enqueue(v any) {
    node := newNode(v)
    for {
        tail := load(&q.tail)
        next := tail.next
        if tail == load(&q.tail) {
            if next == nil {
                // add to tail
                if atomic.CompareAndSwapPointer(&tail.next, next, unsafe.Pointer(node)) {
                    // switch tail to node
                    atomic.CompareAndSwapPointer(&q.tail, unsafe.Pointer(tail), unsafe.Pointer(node))
                    break
                }
            } else {
                // get wrong tail node
                // tail = tail.next
                // if can not , reload tail in next loop
                atomic.CompareAndSwapPointer(&q.tail, unsafe.Pointer(tail), next)
            }
        }
    }
}

func (q *Queue) Dequeue() (res any) {
    for {
        head := load(&q.head)
        tail := load(&q.tail)
        next := head.next

        if head == load(&q.head) {
            if head == tail {
                if next == nil {
                    return nil // has no value
                }
                atomic.CompareAndSwapPointer(&q.tail, unsafe.Pointer(tail), next)
            } else {
                v := load(&next).value
                if atomic.CompareAndSwapPointer(&q.head, unsafe.Pointer(head), next) {
                    return v
                }
            }
        }
    }
}

func NewQueue() *Queue {
    node := unsafe.Pointer(&QueueNode{})
    return &Queue{
        head: node,
        tail: node,
    }
}

func load(p *unsafe.Pointer) *QueueNode {
    return (*QueueNode)(atomic.LoadPointer(p))
}

```

# 参考文档

[   https://www.cs.rochester.edu/u/scott/papers/1996_PODC_queues.pdf](https://www.cs.rochester.edu/u/scott/papers/1996_PODC_queues.pdf "   https://www.cs.rochester.edu/u/scott/papers/1996_PODC_queues.pdf")

[   https://colobu.com/2020/08/14/lock-free-queue-in-go/](https://colobu.com/2020/08/14/lock-free-queue-in-go/ "   https://colobu.com/2020/08/14/lock-free-queue-in-go/")
