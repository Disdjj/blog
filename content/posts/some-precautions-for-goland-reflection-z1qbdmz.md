---
title: Goland 反射的一些注意事项
slug: some-precautions-for-goland-reflection-z1qbdmz
url: /post/some-precautions-for-goland-reflection-z1qbdmz.html
date: '2024-03-15 20:27:14+08:00'
lastmod: '2025-11-17 22:33:44+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "反射", "编程技巧"]
---



# Goland 反射的一些注意事项

# Goland 反射的一些注意事项

```go
reflected := reflect.ValueOf(obj).Elem()
```

```go
  if reflected.CanInterface() {
    // try in struct receiver
    if c, ok := reflected.Interface().(Parse); ok {
      gormRes.Merge(c.AsGormSQL())
      return
    }
    // try in struct pointer receiver
    if reflected.Kind() == reflect.Struct && reflected.CanAddr() {
      ref := reflected.Addr()
      if c, ok := ref.Interface().(Parse); ok {
        gormRes.Merge(c.AsGormSQL())
        return
      }
    }
  }
```

# 注意

在Go语言中，通过反射或直接调用方法时，确实存在一些规则关于结构体和它的指针调用方法的差异。这些规则反映了Go的方法集的概念：

- **值类型（结构体实例）的方法集**包含所有接收者为值类型的方法。
- **指针类型（指向结构体的指针）的方法集**包括所有接收者为值类型或指针类型的方法。

这意味着：

- 如果你有一个结构体的值，你只能调用那些定义为值接收者的方法。
- 如果你有一个结构体的指针，你可以调用那些定义为指针接收者的方法，以及那些定义为值接收者的方法。

在反射中，`reflect.Value` 提供了 `Method` 方法来调用相关的方法。当你通过反射来调用方法时，调用规则和非反射时的规则保持一致，但是使用的方式略有不同：

- 当你拥有一个类型的值（非指针）并且想通过反射调用它的方法时，你只能调用值接收者的方法。
- 当你拥有一个类型的指针并想通过反射调用它的方法时，你可以调用任何方法，不论其接收者是值类型还是指针类型。

这就是为什么传入一个指针对象

第二个需要注意的是

如果使用

```go
type StructDemo struct{
    Name
    Age
}
```

这种内嵌的方式, 如果`Name`和`age`都实现了某个接口, 在通过反射进行`interface`判断时, 那么StructDemo 也实现了这个接口, 这时候会直接略掉, 这部分需要额外注意下对StructDemo 的接口实现.

# 为什么要使用指针而不是实例?

1. 可修改性（Mutability）：当你通过反射修改一个对象时，如果你传入了该对象的副本（即结构体的值），任何修改都将只作用于这个副本上，而不会影响原始的对象。如果你想修改原始对象，你需要传入一个指针，这样通过指针反射出的值才能实现对原始对象的修改。
2. 性能考虑（Performance）：当你使用结构体的指针而不是结构体本身时，可以避免复制整个结构体的成本。结构体可能会非常大，如果使用值传递（也就是复制结构体），会有额外的内存和CPU的消耗。使用指针传递可以提高效率。
3. 接口实现（Interface implementation）：在Go中，结构体类型只有在以指针形式接收者（receiver）的方法被定义时，才能实现接口的指针类型方法。当使用反射来检测一个对象是否实现了某个接口时，传入指针使得所有接口方法都可被检测到，而不仅仅是值接收者的方法。

# 反射中的指针是无法修改值的

```go
package main

import "reflect"

type A struct {
  A1 string
  A2 int
}

type B struct {
  B1 string
  B2 int
}

type Mix struct {
  A
  B
}

func ref(ptr any) {
  ref := reflect.ValueOf(ptr).Elem() //可以试试将.Elm() 去掉
  ref.Field(0).Field(0).SetString("A~")
  println(ref.Kind().String())
}

func main() {
  m := &Mix{
    A: A{
      A1: "A1",
      A2: 1,
    },
    B: B{
      B1: "B1",
      B2: 2,
    },
  }
  ref(m)
  println(m.A.A1)
}

```
