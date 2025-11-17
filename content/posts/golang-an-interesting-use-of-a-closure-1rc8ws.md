---
title: 'golang: 一个闭包的有趣使用'
slug: golang-an-interesting-use-of-a-closure-1rc8ws
url: /post/golang-an-interesting-use-of-a-closure-1rc8ws.html
date: '2024-05-30 01:31:35+08:00'
lastmod: '2025-11-17 22:58:10+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "闭包", "编程技巧"]
---



# golang: 一个闭包的有趣使用

# 来源

https://colobu.com/gotips/001.html

# 示例

```go
package main

import "time"

func TimeTrack() func() {
	pre := time.Now()

	return func() {
		println(time.Since(pre).Milliseconds())
	}
}
func main() {
	defer TimeTrack()()
	time.Sleep(1024 * time.Millisecond)
}

```

# 原理解释

其实就是关于闭包的使用

通过两次闭包来实现变量的传递使用.

1. ​`TimeTrack`: 初始化时, 闭包内pre 初始化
2. ​`defer TimeTrack()()`: 在函数执行完毕后, 调用闭包, 获得时间差.
