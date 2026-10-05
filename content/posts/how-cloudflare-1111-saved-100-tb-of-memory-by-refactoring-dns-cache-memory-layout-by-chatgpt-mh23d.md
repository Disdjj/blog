---
title: Cloudflare 1.1.1.1 如何通过重构 DNS Cache 内存布局节省 100 TB 内存 by ChatGPT
slug: >-
  how-cloudflare-1111-saved-100-tb-of-memory-by-refactoring-dns-cache-memory-layout-by-chatgpt-mh23d
url: >-
  /post/how-cloudflare-1111-saved-100-tb-of-memory-by-refactoring-dns-cache-memory-layout-by-chatgpt-mh23d.html
date: '2026-10-05 12:49:25+08:00'
lastmod: '2026-10-05 12:50:35+08:00'
toc: true
isCJKLanguage: true
---



# Cloudflare 1.1.1.1 如何通过重构 DNS Cache 内存布局节省 100 TB 内存 by ChatGPT

> 从 ​`Vec<Record>`、Rust enum、heap allocation，一路优化到连续 DNS wire-format buffer：这是一个非常典型的“大规模系统中，数据表示本身就是性能”的案例。

2026 年 8 月，Cloudflare 公开了其 DNS 平台 Big Pineapple 的一次缓存优化。

Big Pineapple 是 Cloudflare ​`1.1.1.1`​、Gateway DNS、DNS Firewall 等 DNS 服务背后的基础平台。在任意时刻，它的整个 fleet 中会保存超过 ​**2500 亿条 DNS cache entry**。

这意味着一个非常夸张的放大效应：

```
250,000,000,000 entries × 1 byte
≈ 250 GB
```

**每条记录哪怕浪费 1 byte，全网就是 250 GB。**

Cloudflare 最终通过连续 5 轮内存表示优化，将 benchmark 中单条 cache entry 的净内存占用：

```
953 bytes
   ↓
420 bytes
```

下降约 ​**56%** 。

与此同时：

|指标|优化前|优化后|变化|
| ----------------------| --------| --------| ------|
|Per-entry footprint|953 B|420 B|-56%|
|Per-entry allocation|1.1 KB|461 B|-58%|
|Insert throughput|625K/s|893K/s|+43%|
|Lookup latency|828 ns|670 ns|-19%|

实际生产环境中，整个 fleet 的 working-set memory 最终下降了约 ​**100 TB**。

这次优化最值得研究的地方，不是某一个 Rust 技巧，而是 Cloudflare 最终得到的几个设计结论：

```
Mutable Object
      ↓
Immutable Object
      ↓
Compact Object
      ↓
Flat Object
      ↓
Byte-oriented Representation
```

换句话说：

> 当一个对象被写入缓存以后几乎不会再发生修改时，最适合它的内存表示，往往不再是业务代码中最好操作的对象模型。

# 1. Big Pineapple 的 Cache 在什么位置？

首先需要理解这不是一个普通的：

```
HashMap<String, DNSResponse>
```

Big Pineapple 是完整的 recursive DNS resolver。

一个查询大致经过：

```d2
direction: right

client: "DNS Client\nBrowser / OS / Router"

bp: "Big Pineapple" {
  server: "Server Module\nUDP / TCP / DoH / DoT"

  worker: "Worker\nQuery processing"

  cache: "Local DNS Cache\nARC replacement policy" {
    shape: cylinder
  }

  recursor: "Recursive Resolver\nDNS resolution logic"

  conductor: "I/O Conductor\nUpstream selection\nRetry / QoS / RTT"

  sandbox: "Wasm Sandbox\nOptional DNS extensions"
}

peer: "Peer Big Pineapple Nodes\nsame datacenter"

auth: "Authoritative DNS\nRoot / TLD / Zone"

client -> bp.server: "DNS Query"

bp.server -> bp.worker: "normalized request"

bp.worker -> bp.cache: "lookup(CacheKey)"

bp.cache -> bp.worker: "CACHE HIT\ncached records"

bp.cache -> peer: "local miss\nconsistent-hash / peer lookup"

peer -> bp.worker: "peer cache result"

bp.worker -> bp.recursor: "CACHE MISS"

bp.recursor -> bp.conductor: "recursive subquery"

bp.conductor -> auth: "upstream DNS query"

auth -> bp.conductor: "DNS response"

bp.conductor -> bp.recursor: "resolved records"

bp.recursor -> bp.cache: "insert result"

bp.worker -> bp.sandbox: "optional policy / plugin"

bp.worker -> bp.server: "DNS response"

bp.server -> client: "wire-format DNS packet"
```

Big Pineapple 的缓存使用 ARC 一类 cache replacement 结构，而不是简单 KV；同一数据中心中的节点还会通过 consistent hashing 协同，提高整体 cache hit ratio。

对于 recursive DNS 来说，这非常重要。

Cache hit 可能在亚毫秒范围完成，而真正进行 recursive lookup 则可能涉及：

```
root
 ↓
TLD
 ↓
authoritative NS
 ↓
possibly CNAME
 ↓
another authoritative NS
 ↓
最终答案
```

因此：

```
更多 cache capacity
        ↓
更高 cache hit ratio
        ↓
更少 upstream DNS query
        ↓
更低 latency
        ↓
更低网络与 CPU 成本
```

所以对于 DNS resolver：

> **Memory efficiency 本身就是 performance optimization。**

# 2. 原来的 CacheEntry 长什么样？

Cloudflare 给出的简化结构大致是：

```rust
pub struct CacheKey {
    qname: Name,
    qtype: Rtype,
    authenticated: bool,
    tag: Vec<u8>,
}

pub struct CacheEntry {
    timestamp: UnixTimeStamp,
    inception: Instant,
    ttl: Ttl,
    hits: u32,

    answers: Vec<Record>,
    authority: Vec<Record>,
    additional: Vec<Record>,

    errors: Vec<ExtendedError>,
    ...
}
```

从业务建模角度，这非常自然。

DNS Response 原本就包含：

```
Answer
Authority
Additional
```

三个 section。

因此程序员很容易写成：

```
CacheEntry
├── Vec<Record> answers
├── Vec<Record> authority
├── Vec<Record> additional
└── Vec<ExtendedError> errors
```

问题在于：

>  **“符合业务对象模型”并不等于“符合缓存存储模型”。**

它最终形成的是一个 object graph：

```d2
direction: right

entry: "CacheEntry" {
  timestamp: "timestamp"
  ttl: "ttl"
  hits: "hits"

  answer_vec: "Vec<Record>\nptr + len + capacity"
  authority_vec: "Vec<Record>\nptr + len + capacity"
  additional_vec: "Vec<Record>\nptr + len + capacity"
}

answers: "Heap allocation #1" {
  a1: "Record"
  a2: "Record"
  a3: "Record"
}

authority: "Heap allocation #2" {
  au1: "Record"
  au2: "Record"
}

additional: "Heap allocation #3" {
  ad1: "Record"
}

record_data_1: "Heap allocation\nRecordData / Name / String"
record_data_2: "Heap allocation\nRecordData / Name / String"
record_data_3: "Heap allocation\nRecordData / Name / String"

entry.answer_vec -> answers: "pointer"
entry.authority_vec -> authority: "pointer"
entry.additional_vec -> additional: "pointer"

answers.a1 -> record_data_1: "possible pointer"
answers.a2 -> record_data_2: "possible pointer"
answers.a3 -> record_data_3: "possible pointer"
```

这里会同时出现四种浪费：

1. container metadata；
2. unused capacity；
3. struct alignment / padding；
4. 多次 heap allocation 带来的 allocator overhead 和 pointer chasing。

Cloudflare 的五轮优化，本质就是逐层消灭这四类成本。

# 3. 第一刀：​`Vec<T>`​ → ​`Box<[T]>`

这是最直接的一步。

一个 ​`Vec<T>` 必须支持：

```
vec.push(...)
```

因此它不能只知道“数据在哪里”和“现在有几个元素”。

还必须知道：

```
capacity
```

典型 64-bit 环境中可以把它概念化为：

```
Vec<T>

┌─────────────────┐
│ ptr        8 B   │
├─────────────────┤
│ len        8 B   │
├─────────────────┤
│ capacity   8 B   │
└─────────────────┘

        24 B
```

而缓存中的 DNS response 有一个关键性质：

> **写入完成后不会再 append record。**

也就是说：

```
Vec 的动态增长能力

在构建阶段：有价值
进入 cache 后：完全没有价值
```

所以 Cloudflare 将它冻结成：

```
Box<[Record]>
```

概念上：

```d2
direction: right

before: "Before: Vec<Record>" {
  meta: "Stack / struct metadata" {
    ptr: "ptr\n8 bytes"
    len: "len\n8 bytes"
    cap: "capacity\n8 bytes"
  }

  heap: "Heap allocation" {
    r1: "Record 1"
    r2: "Record 2"
    r3: "Record 3"
    unused: "Reserved capacity\nunused memory"
  }

  meta.ptr -> heap.r1
}

arrow: "freeze after construction"

after: "After: Box<[Record]>" {
  metadata: "Slice metadata" {
    ptr2: "ptr"
    len2: "len"
  }

  heap2: "Exact-size heap allocation" {
    rr1: "Record 1"
    rr2: "Record 2"
    rr3: "Record 3"
  }

  metadata.ptr2 -> heap2.rr1
}

before -> arrow -> after
```

Cloudflare 的 cache entry 中一共有多个 ​`Vec`​ / ​`String` 类型字段。

将 8 个此类字段改为对应的：

```
Box<[T]>
Box<str>
```

仅 container metadata 就能减少：

```
8 fields × 8 bytes capacity
= 64 bytes / cache entry
```

2500 亿条 entry 放大以后，仅这一类优化就达到 ​**15 TB 以上**。

但这里更重要的是一个设计原则：

## Build Mutable, Store Immutable

业务对象的生命周期其实可以拆成两个阶段：

```
Construction Phase             Serving Phase
──────────────────             ─────────────
需要 push                       只读
需要 resize                     immutable
需要 temporary buffer           hot lookup
需要方便
```
