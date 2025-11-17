---
title: 'Golang: 探究sync.map的实现'
slug: golang-explore-the-implementation-of-syncmap-9otwu
url: /post/golang-explore-the-implementation-of-syncmap-9otwu.html
date: '2024-03-29 12:10:11+08:00'
lastmod: '2025-11-17 22:57:16+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "并发", "sync.Map", "源码"]
---



# Golang: 探究sync.map的实现

# 背景

探究下载并发模式下, sync.map 的实现, 以及该实现方式可能引入的问题

# 链接

[Github](https://github.com/golang/go/blob/master/src/sync/map.go)

# 基本使用

```go
package main

import "sync"

func main() {
	m := sync.Map{}
	m.Load("key")
	m.Store("key", "value")
	m.LoadOrStore("key", "value")
	m.Delete("key")
}

```

以上就是主要的增删改查的能力.

# 数据结构

## entry

```go
type entry struct {
	p atomic.Pointer[any]
}
```

### 分析

在 `sync` ​包的 `Map` ​类型中，`entry` ​是一个结构体，它代表了 `Map` ​中的一个槽位，对应于一个特定的键。

​`entry` ​的主要作用是存储 `Map` ​中的键值对。它包含一个 `p` ​字段，这是一个原子指针，指向存储在条目中的值。`p` ​字段的状态（是否为 `nil` ​或 `expunged`）决定了条目的状态（是否已被删除或有效）。

此外，`entry` ​还提供了一些方法，如 `load`​、`tryCompareAndSwap`​、`unexpungeLocked`​、`swapLocked`​、`tryLoadOrStore` ​和 `delete`​，这些方法用于操作存储在条目中的值，包括加载值、比较并交换值、取消标记删除、交换值、尝试加载或存储值以及删除值。这些操作都是并发安全的，因为它们使用了原子操作来处理 `p` ​字段。

### Why atomic.Pointer?

​`atomic.Pointer` ​在 Go 语言中被用于实现并发安全的指针操作。

在多线程或者并发编程中，对共享数据的读写操作可能会发生在不同的 goroutine 中，这就可能导致数据的不一致性。为了解决这个问题，我们需要一种机制来保证在任何时刻，对共享数据的访问都只能有一个 goroutine 进行。

​`atomic.Pointer` 提供了这样的机制。它提供了一组函数，可以对指针进行原子性的加载（Load）、存储（Store）和比较并交换（CompareAndSwap）操作。这些操作是并发安全的，也就是说，在多个 goroutine 同时进行这些操作时，不需要额外的锁机制就可以保证数据的一致性。(BTW, )

在你提供的代码中，`p atomic.Pointer[any]`​ 是 `entry`​ 结构体的一个字段，它存储了对应的键值对的值。通过使用 `atomic.Pointer`​，`entry`​ 可以在多个 goroutine 中安全地读写这个值，而不需要额外的锁。这对于 `sync.Map` 这样的并发数据结构来说是非常重要的，因为它需要在多个 goroutine 中高效地读写数据。

## readOnly

```go
type readOnly struct {
	m       map[any]*entry
	amended bool // true if the dirty map contains some key not in m.
}
```

### 分析

​`readOnly` 结构体有两个字段：

- ​`m`​：这是一个存储 `entry` ​指针的 map，其中 `entry` ​是 `Map` ​中的一个槽位，对应于一个特定的键。
- ​`amended`​：这是一个布尔值，如果 `dirty`​ map 包含 `m` ​中没有的键，则为 `true`。

​`readOnly` ​的主要作用是存储 `Map` ​的一部分内容，这部分内容是可以安全进行并发访问的，无论是否持有 `mu` ​锁。`readOnly` ​结构体的实例存储在 `Map` ​的 `read` ​字段中，可以通过原子操作进行加载和存储。

当 `Map` ​的 `dirty`​ map 中存在 `read`​ map 中没有的键时，`amended` ​字段会被设置为 `true`​。这表示 `read`​ map 不再是最新的，需要通过复制 `dirty`​ map 来更新。这种设计可以帮助 `Map` ​在并发环境中高效地进行读写操作，减少锁的争用。

## Map

```go
type Map struct {
	mu sync.Mutex
	read atomic.Pointer[readOnly]
	dirty map[any]*entry
	misses int
}
```

### 分析

主要优化了两种常见的使用场景：(1) 键值对只写入一次但读取多次，如只增长的缓存；(2) 多个 goroutine 读写和覆盖不同键的条目。

​`sync.Map` ​的主要组成部分包括：

1. ​`mu`​：一个互斥锁，用于保护对 `dirty` map 的访问。
2. ​`read`​：一个原子指针，指向 `readOnly` ​结构体的实例。`readOnly` ​结构体包含一个 `entry` ​指针的 map 和一个 `amended` ​布尔值。`read` ​字段中的内容可以在不持有 `mu` ​锁的情况下并发访问。
3. ​`dirty`​：一个存储 `entry` ​指针的 map，需要持有 `mu` ​锁才能访问。`dirty`​ map 包含了所有需要更新的键值对，以及 `read` map 中的所有非删除条目。
4. ​`misses`​：一个计数器，记录自上次更新 `read`​ map 以来需要锁定 `mu` ​来确定键是否存在的加载操作的次数。

# 方法分析

## Load

```go
func (m *Map) Load(key any) (value any, ok bool) {
	read := m.loadReadOnly()
	e, ok := read.m[key]
	if !ok && read.amended {
		m.mu.Lock()
		read = m.loadReadOnly()
		e, ok = read.m[key]
		if !ok && read.amended {
			e, ok = m.dirty[key]
			m.missLocked()
		}
		m.mu.Unlock()
	}
	if !ok {
		return nil, false
	}
	return e.load()
}
```

### 代码分析

1. 获取 read map
2. 如果 read 中存在, 则返回
3. 如果 read 中不存在, 且 read 已经过时, 则尝试从 dirty 中获取, 同时 miss + 1

## Store

```go
func (m *Map) Swap(key, value any) (previous any, loaded bool) {
	read := m.loadReadOnly()
	if e, ok := read.m[key]; ok {
		if v, ok := e.trySwap(&value); ok {
			if v == nil {
				return nil, false
			}
			return *v, true
		}
	}

	m.mu.Lock()
	read = m.loadReadOnly()
	if e, ok := read.m[key]; ok {
		if e.unexpungeLocked() {
			// The entry was previously expunged, which implies that there is a
			// non-nil dirty map and this entry is not in it.
			m.dirty[key] = e
		}
		if v := e.swapLocked(&value); v != nil {
			loaded = true
			previous = *v
		}
	} else if e, ok := m.dirty[key]; ok {
		if v := e.swapLocked(&value); v != nil {
			loaded = true
			previous = *v
		}
	} else {
		if !read.amended {
			// We're adding the first new key to the dirty map.
			// Make sure it is allocated and mark the read-only map as incomplete.
			m.dirtyLocked()
			m.read.Store(&readOnly{m: read.m, amended: true})
		}
		m.dirty[key] = newEntry(value)
	}
	m.mu.Unlock()
	return previous, loaded
}
```

### 分析

​`Swap` ​方法是 `sync.Map` ​中的一个方法，它用于交换键对应的值，并返回之前的值（如果存在）。如果键在 `Map` ​中存在，那么 `loaded` ​返回值为 `true`​，否则为 `false`。

​`Swap` ​方法的实现主要分为两个步骤：

1. 首先，它会尝试在只读的 `read` map 中查找键对应的条目。如果找到了，并且可以成功地交换值，那么就直接返回。这是一种优化，可以避免在大多数情况下都需要获取锁。
2. 如果在 `read`​ map 中没有找到键，或者无法交换值，那么就需要获取 `mu`​ ​锁，并在 `dirty`​ map 中查找和操作键对应的条目。在这个过程中，可能需要将 `dirty`​ map 提升为 `read`​ map，或者在 `dirty` map 中添加新的条目。

这个方法首先尝试在 `read`​ map 中查找键对应的条目，并尝试交换值。如果成功，就直接返回。如果在 `read`​ map 中没有找到键，或者无法交换值，那么就需要获取 `mu` ​锁.

并在 `dirty`​ map 中查找和操作键对应的条目。在这个过程中，可能需要将 `dirty`​ map 提升为 `read`​ map，或者在 `dirty` map 中添加新的条目。

# 注意

## expunged 与 nil

### 区别

1. 如果一个 entry 的 p 为 expunged, 表示一定发生了一次 dirty 的初始化, 此时 entry 的 key 一定不在 dirty 中

2. 如果一个 entry 的 p 为 nil, 依然表示清除, 但是此时 dirty 中必然有同样的 key

### 作用

所以, 对于已删除的 key 来说, 不能在 `expunged` ​的状态下进行更新操作, 因为这会导致在 dirty 提升为 read 时, 出现数据不一致的问题.

这就是, `trySwap` ​的设计:

```go
func (e *entry) trySwap(i *any) (*any, bool) {
	for {
		p := e.p.Load()
		if p == expunged {
			// 返回nil, false
			return nil, false
		}
		// 如果entry不为nil
		if e.p.CompareAndSwap(p, i) {
			// 返回entry的值, true
			return p, true
		}
	}
}
```

### unexpungeLocked

```go
func (e *entry) unexpungeLocked() (wasExpunged bool) {
	return e.p.CompareAndSwap(expunged, nil)
}
```

为什么要使用 `unexpungeLocked` ​我们可以考虑如果不使用 `unexpungeLocked` ​将 expunged 转为 nil, 会发生什么?

那么我们在此时的使用就会变成

```go
		if e.p.Load() == expunged {
			m.dirty[key] = e
		}
```

即虽然我们保证了 read 和 dirty 中都存在同一个 key, 但是此时的 `e.p` ​都为 `unexpungeLocked`​, 无法调用封装的函数进行修改, 而只能直接使用 `e.p.Store(&i)` ​进行修改了,

这样会有什么问题?

1. **原子操作的预期行为**：`sync.Map`​ 中的原子操作依赖于 `expunged`​ 和 `nil`​ 状态来决定条目是否可以被更新。如果一个条目是 `expunged`​ 状态，它不能直接被更新，因为这意味着该条目已经从 `dirty`​ 映射中删除了。如果不先将其置为 `nil`，那么原子操作的预期行为就会被破坏。
2. **状态一致性**：`sync.Map`​ 维护了 `read`​ 和 `dirty`​ 映射之间的一致性。条目从 `expunged`​ 状态恢复为 `nil`​ 是一个信号，表明该条目现在可以安全地更新，并且这个更新应该反映在 `dirty` 映射中。
3. **并发安全**：在并发环境中，其他 goroutines 可能会尝试读取或更新同一个键的条目。如果一个条目从 `expunged`​ 状态直接更新为一个新值，其他 goroutines 可能会遇到一个不一致的状态，因为它们预期要么是 `expunged`​ 要么是 `nil`，然后才是一个有效的值。

因此，正确地处理 `expunged`​ 状态是保证 `sync.Map`​ 正确行为的关键。在更新一个条目之前，如果它被标记为 `expunged`​，应当首先通过 `unexpungeLocked`​ 方法将其状态置为 `nil`​，然后才能安全地进行更新。这样可以确保 `sync.Map` 的并发安全性和性能优化得到保持。

# 总结

1. sync.Map 目前的实现, 非常适合 读多写少的操作.  尤其是有大量非覆盖写的调用, 性能会直接回退到 `map`​+ `mutex`(在覆盖写的情况下, read 和 dirty 可以共享 entry, 实现乐观锁的更新, 性能会好一些)
2. 在研究其代码时, 需要非常注意 `nil`​ 以及 `expunged` ​两种状态的区别.
