---
title: 'Golang: 通过chan来实现并发访问控制'
slug: implementation-of-concurrent-access-control-through-channel-z2wehwd
url: /post/implementation-of-concurrent-access-control-through-channel-z2wehwd.html
date: '2024-03-15 20:27:44+08:00'
lastmod: '2025-11-17 22:56:09+08:00'
toc: true
isCJKLanguage: true
---



# Golang: 通过chan来实现并发访问控制

# 通过chan来实现并发访问控制

# 背景介绍

这是在阅读grom的源码时, 他的schema的初始化方式, 给我留下来很深刻的印象, 本文将通过channel的一些使用来实现实例的并发访问

# 技术要点

如果chan为空时, 尝试读可以成功, 获得的结果为空

# 示例代码

```go
package main

import (
  "sync"
  "time"
)

type Demo struct {
  inited chan struct{}
  a      int
}

func (i *Demo) Init() {
  defer close(i.inited)

  i.a = 100
  time.Sleep(time.Second * 2)
}

func (i *Demo) GetInstance() int {
  <-i.inited

  return i.a
}

func main() {
  demo := &Demo{inited: make(chan struct{})}
  waitGroup := sync.WaitGroup{}
  waitGroup.Add(6)
  go func() { defer waitGroup.Done(); demo.Init() }()
  go func() { defer waitGroup.Done(); println(demo.GetInstance()) }()
  go func() { defer waitGroup.Done(); println(demo.GetInstance()) }()
  go func() { defer waitGroup.Done(); println(demo.GetInstance()) }()
  go func() { defer waitGroup.Done(); println(demo.GetInstance()) }()
  go func() { defer waitGroup.Done(); println(demo.GetInstance()) }()
  waitGroup.Wait()
}

```
