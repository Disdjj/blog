---
title: 'Golang: 解引用 赋值 时发生了什么'
slug: golang-what-happened-when-solving-the-assignment-of-the-reference-1dogdn
url: >-
  /post/golang-what-happened-when-solving-the-assignment-of-the-reference-1dogdn.html
date: '2024-07-05 14:35:14+08:00'
lastmod: '2025-11-17 22:58:51+08:00'
toc: true
isCJKLanguage: true
---



# Golang: 解引用 赋值 时发生了什么

# 示例代码

```go
package main

import "fmt"

type ComplexStruct struct {
	A int
	B string
	C float64
	D bool
	E []int
	F map[string]string
	G *ComplexStruct
}

func main() {
	com1 := ComplexStruct{
		A: 1,
		B: "com1",
		C: 3.0,
		D: true,
		E: []int{4, 5, 6},
		F: map[string]string{"7": "8", "9": "10"},
		G: nil,
	}
	a := &com1

	com2 := ComplexStruct{
		A: 1,
		B: "com2",
		C: 3.0,
		D: true,
		E: []int{4, 5, 6},
		F: map[string]string{"7": "8", "9": "10"},
		G: nil,
	}
	*a = com2
	aCopy := a

	(*a).A = 4
	// aCopy.A = 9

	b := *a
	b.A = 5

	fmt.Println(com1)
	fmt.Println(a)
	fmt.Println(b)
	fmt.Println(aCopy)
}

```

简单来说, 这段代码构建了一个复杂结构体.

# 探究目的

1. 解引用时发生了什么?
2. 修改字段时发生了什么?

# 汇编分析

![image](/images/image-20240705144751-q1yhsqh.png)

红框中使我们最需要注意的事情.

# 分析

## 解引用时`(*a  = com2`)发生了什么事情?

简单来说, 分为两步.

1. 获取源变量/目标变量的地址, 分别存入BI, DI,(这两个寄存器可以认为是用来临时寄存器使用)
2. CALL 复制函数, 函数的具体实现不太好找, 简单描述就是会将源结构体的每一个字段全部复制到目标字段. 直到完成

**需要注意, 取址复制并不是一个原子操作.**

## 修改变量时发生了什么?

这里分为两种情况讨论

### 引用修改

​`(*a).A = 5`​ 在这种情况下, 从源码里看, 并没有做取址复制. 为什么? 因为没有目标变量, 所以此时的修改是对`a`​的有效修改.可以认为操作同 `a.A = 5`

操作有两步:

1. 把堆栈指针寄存器(SP)偏移的值加载到SI寄存器中
2. 把立即数存储到SI寄存器指向的内存地址

### 值修改:

如`b.A = 5`

观察可知, 此时只有一步操作.

因为此时不需要在经历一步额外的寻址操作.

# 建议

1. 如果要返回一个指针, 那么建议的方式是初始化时使用 `s := Struct{}`​, 返回时使用 `&s`, 如果是复杂的变量赋值时, 能节省一个寻址的操作.
2. 慎用解指针, 注意自己是否是真的需要. 当解指针时, 一般会带有复制的操作, 如果结构体本身字段较多/长度较大时, 这个消耗不容小觑.
