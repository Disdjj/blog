---
title: Go数组的扩容规则
slug: go-array-expansion-rules-z1b6qdk
url: /post/go-array-expansion-rules-z1b6qdk.html
date: '2024-03-15 20:27:26+08:00'
lastmod: '2025-11-17 22:34:02+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "切片", "扩容", "源码"]
---



# Go数组的扩容规则

# Go数组的扩容规则

# 技术要点

先是双倍扩容, 然后是一定的比例扩容, 逐渐向1.25进行靠近

![](/images/ccaef6d83ee44ad9b19ec1133924817b~tplv-k3u1fbpfcp-z-20240315202752-s8cs0sh.webp)

在目前的实现里面, 在小于256的时候会进行double, 在大于256的时候, 会根据一定的生长因子进行扩容, 但是总体来说还是会逐渐的靠近到1.25

```go
func growslice(et *_type, old slice, cap int) slice {
  if raceenabled {
    callerpc := getcallerpc()
    racereadrangepc(old.array, uintptr(old.len*int(et.size)), callerpc, abi.FuncPCABIInternal(growslice))
  }
  if msanenabled {
    msanread(old.array, uintptr(old.len*int(et.size)))
  }

  if cap < old.cap {
    panic(errorString("growslice: cap out of range"))
  }

  if et.size == 0 {
    // append should not create a slice with nil pointer but non-zero len.
    // We assume that append doesn't need to preserve old.array in this case.
    return slice{unsafe.Pointer(&zerobase), old.len, cap}
  }

  newcap := old.cap
  doublecap := newcap + newcap
  if cap > doublecap {
    newcap = cap
  } else {
    const threshold = 256
    if old.cap < threshold {
      newcap = doublecap
    } else {
      // Check 0 < newcap to detect overflow
      // and prevent an infinite loop.
      for 0 < newcap && newcap < cap {
        // Transition from growing 2x for small slices
        // to growing 1.25x for large slices. This formula
        // gives a smooth-ish transition between the two.
        newcap += (newcap + 3*threshold) / 4
      }
      // Set newcap to the requested cap when
      // the newcap calculation overflowed.
      if newcap <= 0 {
        newcap = cap
      }
    }
  }

  var overflow bool
  var lenmem, newlenmem, capmem uintptr
  // Specialize for common values of et.size.
  // For 1 we don't need any division/multiplication.
  // For sys.PtrSize, compiler will optimize division/multiplication into a shift by a constant.
  // For powers of 2, use a variable shift.
  switch {
  case et.size == 1:
    lenmem = uintptr(old.len)
    newlenmem = uintptr(cap)
    capmem = roundupsize(uintptr(newcap))
    overflow = uintptr(newcap) > maxAlloc
    newcap = int(capmem)
  case et.size == goarch.PtrSize:
    lenmem = uintptr(old.len) * goarch.PtrSize
    newlenmem = uintptr(cap) * goarch.PtrSize
    capmem = roundupsize(uintptr(newcap) * goarch.PtrSize)
    overflow = uintptr(newcap) > maxAlloc/goarch.PtrSize
    newcap = int(capmem / goarch.PtrSize)
  case isPowerOfTwo(et.size):
    var shift uintptr
    if goarch.PtrSize == 8 {
      // Mask shift for better code generation.
      shift = uintptr(sys.Ctz64(uint64(et.size))) & 63
    } else {
      shift = uintptr(sys.Ctz32(uint32(et.size))) & 31
    }
    lenmem = uintptr(old.len) << shift
    newlenmem = uintptr(cap) << shift
    capmem = roundupsize(uintptr(newcap) << shift)
    overflow = uintptr(newcap) > (maxAlloc >> shift)
    newcap = int(capmem >> shift)
  default:
    lenmem = uintptr(old.len) * et.size
    newlenmem = uintptr(cap) * et.size
    capmem, overflow = math.MulUintptr(et.size, uintptr(newcap))
    capmem = roundupsize(capmem)
    newcap = int(capmem / et.size)
  }

  // The check of overflow in addition to capmem > maxAlloc is needed
  // to prevent an overflow which can be used to trigger a segfault
  // on 32bit architectures with this example program:
  //
  // type T [1<<27 + 1]int64
  //
  // var d T
  // var s []T
  //
  // func main() {
  //   s = append(s, d, d, d, d)
  //   print(len(s), "\n")
  // }
  if overflow || capmem > maxAlloc {
    panic(errorString("growslice: cap out of range"))
  }

  var p unsafe.Pointer
  if et.ptrdata == 0 {
    p = mallocgc(capmem, nil, false)
    // The append() that calls growslice is going to overwrite from old.len to cap (which will be the new length).
    // Only clear the part that will not be overwritten.
    memclrNoHeapPointers(add(p, newlenmem), capmem-newlenmem)
  } else {
    // Note: can't use rawmem (which avoids zeroing of memory), because then GC can scan uninitialized memory.
    p = mallocgc(capmem, et, true)
    if lenmem > 0 && writeBarrier.enabled {
      // Only shade the pointers in old.array since we know the destination slice p
      // only contains nil pointers because it has been cleared during alloc.
      bulkBarrierPreWriteSrcOnly(uintptr(p), uintptr(old.array), lenmem-et.size+et.ptrdata)
    }
  }
  memmove(p, old.array, lenmem)

  return slice{p, old.len, newcap}
}
```

代码解释

1. 首先，代码根据是否启用 race 和 msan 进行一些检查。
2. 接下来，代码检查新容量是否小于旧容量，如果是，则抛出错误。
3. 如果元素大小为 0，则返回一个具有指向全局变量 zerobase 的指针、长度为旧长度、容量为新容量的 slice，表示 append 操作不应该创建一个指向 nil 指针但长度不为 0 的 slice。
4. 如果新容量大于旧容量的两倍，则将新容量设置为请求的容量，否则根据旧容量和请求的容量计算新容量。此时，代码使用一个循环来计算新容量，从而平滑地从扩大 2 倍转换为扩大 1.25 倍，以避免出现骤增或骤降的情况。
5. 接下来，代码根据元素大小的不同采用不同的方法来计算旧 slice 的长度、新 slice 的长度和新 slice 的容量。对于大小为 1 的元素，不需要进行除法或乘法运算；对于大小为指针大小的元素，编译器会将除法或乘法运算优化为常量移位操作；对于大小为 2 的幂的元素，使用变量移位操作；对于其他大小的元素，使用 math 包中的 MulUintptr 函数进行计算。
6. 然后，代码检查新容量是否超出最大分配大小，如果是，则抛出错误。这里还需要注意一个细节，即不仅要检查新容量是否超出最大分配大小，还要检查 capmem 是否大于 maxAlloc，以避免在某些 32 位架构上出现整数溢出的问题。
7. 最后，代码根据旧 slice 的长度和新 slice 的容量分配一块新的内存，并将旧 slice 的元素复制到新内存中。如果元素大小为 0，则只需清除新内存中未覆盖的部分；否则需要使用 memmove 函数将旧 slice 的元素复制到新内存中。如果元素具有指针数据，则需要使用 writeBarrier（写屏障）将指针标记为已写入状态，以支持垃圾回收。最后，代码返回一个新的 slice，其中包含指向新内存的指针、旧长度和新容量。

# 参考文档

[ golang slice扩容机制  http://lifegoeson.cn/2022/01/22/golang%20slice%E6%89%A9%E5%AE%B9%E6%9C%BA%E5%88%B6/](http://lifegoeson.cn/2022/01/22/golang%20slice%E6%89%A9%E5%AE%B9%E6%9C%BA%E5%88%B6/ " golang slice扩容机制  http://lifegoeson.cn/2022/01/22/golang%20slice%E6%89%A9%E5%AE%B9%E6%9C%BA%E5%88%B6/")

[   https://github.com/golang/go/blob/2dda92ff6f9f07eeb110ecbf0fc2d7a0ddd27f9d/src/runtime/slice.go#L164](https://github.com/golang/go/blob/2dda92ff6f9f07eeb110ecbf0fc2d7a0ddd27f9d/src/runtime/slice.go#L164 "   https://github.com/golang/go/blob/2dda92ff6f9f07eeb110ecbf0fc2d7a0ddd27f9d/src/runtime/slice.go#L164")
