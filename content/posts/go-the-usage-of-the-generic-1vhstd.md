---
title: 'Go: 泛型中`~`的用法'
slug: go-the-usage-of-the-generic-1vhstd
url: /post/go-the-usage-of-the-generic-1vhstd.html
date: '2024-05-19 11:00:08+08:00'
lastmod: '2025-11-17 22:58:23+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "泛型", "编程"]
---



# Go: 泛型中`~`的用法

在Go语言的泛型中，`~` 符号用于类型约束中的类型推断。它允许你指定一个基础类型，并且约束类型参数必须是该基础类型或其别名。

# 基础类型约束

在Go泛型中，类型约束可以使用 `~`​ 符号来表示   基础类型。例如，如果你想要约束一个类型参数必须是 `int`​ 或者是 `int` 的别名类型，可以这样定义：

```go
package main

import "fmt"

// 定义一个别名类型
type MyInt int

// 定义一个泛型函数，T 必须是 int 或 int 的别名类型
func PrintNumber[T ~int](n T) {
    fmt.Println(n)
}

func main() {
    var a int = 10
    var b MyInt = 20

    PrintNumber(a) // 输出: 10
    PrintNumber(b) // 输出: 20
}
```

在这个例子中，`PrintNumber`​ 函数使用了 `~int`​ 作为类型约束，这意味着类型参数 `T`​ 可以是 `int`​ 或者是 `int`​ 的别名类型 `MyInt`。

# 结合类型约束

你可以将 `~`​ 符号与其他类型约束结合使用，以创建更复杂的约束。例如，约束一个类型参数必须是 `int`​ 或 `float64` 的基础类型或其别名：

```go
package main

import (
    "fmt"
    "golang.org/x/exp/constraints"
)

// 定义一个别名类型
type MyFloat float64

// 定义一个泛型函数，T 必须是 int 或 float64 的基础类型或其别名
func PrintNumber[T ~int | ~float64](n T) {
    fmt.Println(n)
}

func main() {
    var a int = 10
    var b MyFloat = 20.5

    PrintNumber(a) // 输出: 10
    PrintNumber(b) // 输出: 20.5
}
```

在这个例子中，`PrintNumber`​ 函数使用了 `~int | ~float64`​ 作为类型约束，这意味着类型参数 `T`​ 可以是 `int`​ 或 `float64`​ 的基础类型或其别名类型 `MyFloat`。

# 注意

​`~`​符号用于表示一个类型或者其底层类型的别名类型，但接口类型没有底层类型的概念，因此不能使用`~`符号来约束一个接口类型。

如果你需要使用接口类型，可以直接使用接口类型的约束，而不是使用`~`符号。

感谢读者: [十三灬](https://juejin.cn/user/4186592339044615) 的勘误.
