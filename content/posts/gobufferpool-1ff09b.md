---
title: go-buffer-pool
slug: gobufferpool-1ff09b
url: /post/gobufferpool-1ff09b.html
date: '2024-03-15 20:27:41+08:00'
lastmod: '2025-11-17 22:56:14+08:00'
toc: true
isCJKLanguage: true
---



# go-buffer-pool

# go-buffer-pool

```go
package pool

import (
  "math"
  "math/bits"
  "sync"
)

// GlobalPool is a static Pool for reusing byteslices of various sizes.
var GlobalPool = new(BufferPool)

// MaxLength is the maximum length of an element that can be added to the Pool.
const MaxLength = math.MaxInt32

// BufferPool is a pool to handle cases of reusing elements of varying sizes. It
// maintains 32 internal pools, for each power of 2 in 0-32.
//
// You should generally just call the package level Get and Put methods or use
// the GlobalPool BufferPool instead of constructing your own.
//
// You MUST NOT copy Pool after using.
type BufferPool struct {
  pools [32]sync.Pool // a list of singlePools
  ptrs  sync.Pool
}

type bufp struct {
  buf []byte
}

// Get retrieves a buffer of the appropriate length from the buffer pool or
// allocates a new one. Get may choose to ignore the pool and treat it as empty.
// Callers should not assume any relation between values passed to Put and the
// values returned by Get.
//
// If no suitable buffer exists in the pool, Get creates one.
func (p *BufferPool) Get(length int) []byte {
  if length == 0 {
    return nil
  }
  // Calling this function with a negative length is invalid.
  // make will panic if length is negative, so we don't have to.
  if length > MaxLength || length < 0 {
    return make([]byte, length)
  }
  idx := nextLogBase2(uint32(length))
  if ptr := p.pools[idx].Get(); ptr != nil {
    bp := ptr.(*bufp)
    buf := bp.buf[:uint32(length)]
    bp.buf = nil
    p.ptrs.Put(ptr)
    return buf
  }
  return make([]byte, 1<<idx)[:uint32(length)]
}

// Put adds x to the pool.
func (p *BufferPool) Put(buf []byte) {
  capacity := cap(buf)
  if capacity == 0 || capacity > MaxLength {
    return // drop it
  }
  idx := prevLogBase2(uint32(capacity))
  var bp *bufp
  if ptr := p.ptrs.Get(); ptr != nil {
    bp = ptr.(*bufp)
  } else {
    bp = new(bufp)
  }
  bp.buf = buf
  p.pools[idx].Put(bp)
}

// Get retrieves a buffer of the appropriate length from the global buffer pool
// (or allocates a new one).
func Get(length int) []byte {
  return GlobalPool.Get(length)
}

// Put returns a buffer to the global buffer pool.
func Put(slice []byte) {
  GlobalPool.Put(slice)
}

// Log of base two, round up (for v > 0).
func nextLogBase2(v uint32) uint32 {
  return uint32(bits.Len32(v - 1))
}

// Log of base two, round down (for v > 0)
func prevLogBase2(num uint32) uint32 {
  next := nextLogBase2(num)
  if num == (1 << uint32(next)) {
    return next
  }
  return next - 1
}

```

# README

这段代码写的真的非常的漂亮

主要有这么几个地方

1. 使用指数位数的点位进行处理
2. 封装bufp , 与使用 \*\[]byte的方式相比, 减少了一次解引用时切片头的复制, 这个是很容易忽略的
