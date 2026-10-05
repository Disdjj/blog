---
title: Cloudflare 1.1.1.1 如何通过重构 DNS Cache 内存布局节省 100 TB 内存 by ChatGPT
slug: >-
  how-cloudflare-1111-saved-100-tb-of-memory-by-refactoring-dns-cache-memory-layout-by-chatgpt-mh23d
url: >-
  /post/how-cloudflare-1111-saved-100-tb-of-memory-by-refactoring-dns-cache-memory-layout-by-chatgpt-mh23d.html
date: '2026-10-05 12:49:25+08:00'
lastmod: '2026-10-05 13:10:22+08:00'
toc: true
isCJKLanguage: true
---



# Cloudflare 1.1.1.1 如何通过重构 DNS Cache 内存布局节省 100 TB 内存 by ChatGPT

> 从 ​`Vec<Record>`、Rust enum、heap allocation，一路优化到连续 DNS wire-format buffer：这是一个非常典型的“大规模系统中，数据表示本身就是性能”的案例。

2026 年 8 月，Cloudflare 公开了其 DNS 平台 Big Pineapple 的一次缓存优化。

Big Pineapple 是 Cloudflare ​`1.1.1.1`​、Gateway DNS、DNS Firewall 等 DNS 服务背后的基础平台。在任意时刻，它的整个 fleet 中会保存超过 **2500 亿条 DNS cache entry**。

这意味着一个非常夸张的放大效应：

```text
250,000,000,000 entries × 1 byte
≈ 250 GB
```

**每条记录哪怕浪费 1 byte，全网就是 250 GB。**

Cloudflare 最终通过连续 5 轮内存表示优化，将 benchmark 中单条 cache entry 的净内存占用：

```text
953 bytes
   ↓
420 bytes
```

下降约 **56%** 。

与此同时：

|指标|{: style="text-align: right;"}优化前|{: style="text-align: right;"}优化后|{: style="text-align: right;"}变化|
| ----------------------| -------------------------------------: | -------------------------------------: | -----------------------------------: |
|Per-entry footprint|{: style="text-align: right;"}953 B|{: style="text-align: right;"}420 B|{: style="text-align: right;"}-56%|
|Per-entry allocation|{: style="text-align: right;"}1.1 KB|{: style="text-align: right;"}461 B|{: style="text-align: right;"}-58%|
|Insert throughput|{: style="text-align: right;"}625K/s|{: style="text-align: right;"}893K/s|{: style="text-align: right;"}+43%|
|Lookup latency|{: style="text-align: right;"}828 ns|{: style="text-align: right;"}670 ns|{: style="text-align: right;"}-19%|

实际生产环境中，整个 fleet 的 working-set memory 最终下降了约 **100 TB**。

这次优化最值得研究的地方，不是某一个 Rust 技巧，而是 Cloudflare 最终得到的几个设计结论：

```text
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

---

# 1. Big Pineapple 的 Cache 在什么位置？

首先需要理解这不是一个普通的：

```text
HashMap<String, DNSResponse>
```

Big Pineapple 是完整的 recursive DNS resolver。

一个查询大致经过：

```d2
direction: right

client: "DNS 客户端\n浏览器 / 操作系统 / 路由器"

bp: "Big Pineapple" {
  server: "Server 模块\nUDP / TCP / DoH / DoT"

  worker: "Worker\n查询处理"

  cache: "本地 DNS Cache\nARC 淘汰策略" {
    shape: cylinder
  }

  recursor: "递归解析器\nDNS 解析逻辑"

  conductor: "I/O 调度器\n上游选择\n重试 / QoS / RTT"

  sandbox: "Wasm 沙箱\n可选 DNS 扩展"
}

peer: "对等 Big Pineapple 节点\n同一数据中心"

auth: "权威 DNS\nRoot / TLD / Zone"

client -> bp.server: "DNS 查询"

bp.server -> bp.worker: "规范化后的请求"

bp.worker -> bp.cache: "lookup(CacheKey)"

bp.cache -> bp.worker: "CACHE HIT\n缓存记录"

bp.cache -> peer: "本地未命中\n一致性哈希 / 对等节点查询"

peer -> bp.worker: "对等节点缓存结果"

bp.worker -> bp.recursor: "CACHE MISS"

bp.recursor -> bp.conductor: "递归子查询"

bp.conductor -> auth: "上游 DNS 查询"

auth -> bp.conductor: "DNS 响应"

bp.conductor -> bp.recursor: "解析得到的记录"

bp.recursor -> bp.cache: "写入结果"

bp.worker -> bp.sandbox: "可选策略 / 插件"

bp.worker -> bp.server: "DNS 响应"

bp.server -> client: "wire-format DNS 报文"
```

Big Pineapple 的缓存使用 ARC 一类 cache replacement 结构，而不是简单 KV；同一数据中心中的节点还会通过 consistent hashing 协同，提高整体 cache hit ratio。

对于 recursive DNS 来说，这非常重要。

Cache hit 可能在亚毫秒范围完成，而真正进行 recursive lookup 则可能涉及：

```text
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

```text
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

---

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

```text
Answer
Authority
Additional
```

三个 section。

因此程序员很容易写成：

```text
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

answers: "堆分配 #1" {
  a1: "Record"
  a2: "Record"
  a3: "Record"
}

authority: "堆分配 #2" {
  au1: "Record"
  au2: "Record"
}

additional: "堆分配 #3" {
  ad1: "Record"
}

record_data_1: "堆分配\nRecordData / Name / String"
record_data_2: "堆分配\nRecordData / Name / String"
record_data_3: "堆分配\nRecordData / Name / String"

entry.answer_vec -> answers: "指针"
entry.authority_vec -> authority: "指针"
entry.additional_vec -> additional: "指针"

answers.a1 -> record_data_1: "可能的指针"
answers.a2 -> record_data_2: "可能的指针"
answers.a3 -> record_data_3: "可能的指针"
```

这里会同时出现四种浪费：

1. container metadata；
2. unused capacity；
3. struct alignment / padding；
4. 多次 heap allocation 带来的 allocator overhead 和 pointer chasing。

Cloudflare 的五轮优化，本质就是逐层消灭这四类成本。

---

# 3. 第一刀：​`Vec<T>`​ → ​`Box<[T]>`

这是最直接的一步。

一个 ​`Vec<T>` 必须支持：

```rust
vec.push(...)
```

因此它不能只知道“数据在哪里”和“现在有几个元素”。

还必须知道：

```text
capacity
```

典型 64-bit 环境中可以把它概念化为：

```text
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

```text
Vec 的动态增长能力

在构建阶段：有价值
进入 cache 后：完全没有价值
```

所以 Cloudflare 将它冻结成：

```rust
Box<[Record]>
```

概念上：

```d2
direction: right

before: "之前：Vec<Record>" {
  meta: "栈 / 结构体元数据" {
    ptr: "ptr\n8 bytes"
    len: "len\n8 bytes"
    cap: "capacity\n8 bytes"
  }

  heap: "堆分配" {
    r1: "Record 1"
    r2: "Record 2"
    r3: "Record 3"
    unused: "预留容量\n未使用的内存"
  }

  meta.ptr -> heap.r1
}

arrow: "构建完成后冻结"

after: "之后：Box<[Record]>" {
  metadata: "切片元数据" {
    ptr2: "ptr"
    len2: "len"
  }

  heap2: "精确大小的堆分配" {
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

```rust
Box<[T]>
Box<str>
```

仅 container metadata 就能减少：

```text
8 fields × 8 bytes capacity
= 64 bytes / cache entry
```

2500 亿条 entry 放大以后，仅这一类优化就达到 **15 TB 以上**。

但这里更重要的是一个设计原则：

## Build Mutable, Store Immutable

业务对象的生命周期其实可以拆成两个阶段：

```text
Construction Phase             Serving Phase
──────────────────             ─────────────
需要 push                       只读
需要 resize                     immutable
需要 temporary buffer           hot lookup
需要方便修改                    高密度存储
```

没有必要要求两个阶段使用同一种 representation。

完全可以：

```rust
Vec<Record>
    ↓
build
    ↓
Box<[Record]>
    ↓
cache
```

这也是数据库、搜索引擎、编译器和高性能缓存里非常常见的设计。

---

# 4. 第二刀：三个 List 其实可以只有一个

现在还有：

```rust
answers: Box<[Record]>
authority: Box<[Record]>
additional: Box<[Record]>
```

问题是：

```text
为什么一定需要三块 heap allocation？
```

DNS 的这三个 section 本质上只是：

```text
一串 Record 的逻辑分区
```

于是可以改成：

```text
records

0                                  N
│                                  │
▼                                  ▼

[ Answer ][ Answer ][ Authority ][ Additional ][ Additional ]
│                  │             │
0                  authority     additional
                   offset        offset
```

于是数据结构从：

```text
pointer + len
pointer + len
pointer + len
```

变成：

```text
one pointer + one len
+
authority_offset
+
additional_offset
```

D2 表示如下：

```d2
direction: down

before: "之前" {
  direction: right

  answer: "answers\nBox<[Record]>\nptr + len"
  authority: "authority\nBox<[Record]>\nptr + len"
  additional: "additional\nBox<[Record]>\nptr + len"

  heap1: "堆 #1\nA A A"
  heap2: "堆 #2\nNS SOA"
  heap3: "堆 #3\nA AAAA"

  answer -> heap1
  authority -> heap2
  additional -> heap3
}

transform: "展平各个 section"

after: "之后" {
  records: "records\nBox<[Record]>\nptr + len"

  offsets: "Section 元数据" {
    authority_offset: "authority offset\nu16"
    additional_offset: "additional offset\nu16"
  }

  heap: "一整块连续分配\n\nA | A | A | NS | SOA | A | AAAA"

  records -> heap

  offsets.authority_offset -> heap: "Authority 起点"
  offsets.additional_offset -> heap: "Additional 起点"
}

before -> transform -> after
```

因为一个 DNS response 中 record 数量足够小，section offset 可以使用 ​`u16`。

Cloudflare 算下来，这一步每个 entry 又减少了约 **28 bytes**。

这里还出现了一个 C/C++/Rust 底层优化中特别容易忽略的问题：

# Padding

假设：

```rust
struct Foo {
    a: u64,
    b: bool,
    c: u64,
}
```

它未必是：

```text
8 + 1 + 8 = 17 bytes
```

CPU alignment 可能让它实际变成：

```text
24 bytes
```

Rust 默认布局同样需要满足字段 alignment，因此一个字段被删除以后，减少的不一定只有这个字段本身的大小，还可能顺便消灭 padding。

Cloudflare 也顺手把多个 bool 收进 bitflags。

例如：

```text
Before

authenticated: bool
dnssec: bool
stale: bool
...

After

flags: u8

bit 0 authenticated
bit 1 dnssec
bit 2 stale
...
```

所以：

> 优化 struct 时，应该观察 ​`size_of::<T>()`，而不是简单把字段尺寸相加。

---

# 5. 第三刀：不要重复保存 Record Owner

DNS record 一般长这样：

```text
example.com.   300   IN   A   198.51.100.1
```

其中：

```text
example.com.
```

就是 record owner。

如果查询本身就是：

```text
QNAME = example.com
QTYPE = A
```

那么很多 response 实际是：

```text
CacheKey:
    example.com

Record #1:
    owner = example.com

Record #2:
    owner = example.com

Record #3:
    owner = example.com
```

显然出现了重复。

而更复杂的 CNAME 情况则可能是：

```text
example.com
    ↓ CNAME
cdn.example.com
    ↓ A
198.51.100.1
```

所以不能永远删除 owner。

Cloudflare 使用的思路是：

```rust
struct Record {
    owner: Option<Box<Name>>,
    ...
}
```

含义发生变化：

```text
None
    =
owner == CacheKey.qname

Some(name)
    =
owner != CacheKey.qname
```

于是：

```d2
direction: right

key: "CacheKey" {
  qname: "qname\nexample.com"
}

records: "缓存的 Record" {
  r1: "A Record\nowner = None\n198.51.100.1"
  r2: "A Record\nowner = None\n198.51.100.2"

  cname: "CNAME\nowner = None\ncdn.example.com"

  target: "A Record\nowner = Some(...)\n198.51.100.3"
}

heap: "堆" {
  cname_owner: "cdn.example.com"
}

lookup: "响应构建器"

key.qname -> lookup: "默认 owner"

records.r1 -> lookup
records.r2 -> lookup
records.cname -> lookup
records.target -> lookup

records.target -> heap.cname_owner: "仅在 owner 不同时分配"

lookup -> result: "重建的 DNS 响应"
```

这是一种很漂亮的：

# Context-dependent compression

以前：

```text
Record 是 self-contained
```

现在：

```text
Record + CacheKey
才能完整还原数据
```

单独看，这是更差的 abstraction。

但是从系统角度却更好。

因为 lookup 时：

```text
CacheKey 本来就一定存在
```

因此没有必要让 Record 为了“理论上的独立性”，重复携带 QNAME。

DNS wire format 本身其实也做类似的事情。

RFC 1035 定义了 DNS name compression：重复 domain name 可以通过 pointer 引用 DNS message 中已经出现的名字，而不是重复发送整个名称。

Cloudflare 没有直接在 cache 中使用 DNS compression pointer，因为 hot lookup path 上追踪这些 pointer 会增加处理成本；他们采用了一个更加适合 cache 的折中：

```text
最常见情况
owner == qname
    ↓
完全不存

特殊情况
owner != qname
    ↓
完整保存
```

也就是：

> **Optimize the common case, encode the exception.**

---

# 6. 第四刀：Rust Enum 的“大 Variant 税”

到这里，还有一个非常大的问题。

DNS 有很多 record type：

```text
A
AAAA
CNAME
TXT
MX
NS
SOA
NAPTR
SVCB
DNSKEY
RRSIG
...
```

最自然的 Rust 写法当然是：

```rust
enum RecordData {
    A(Ipv4Addr),
    Aaaa(Ipv6Addr),
    Txt(Txt),
    Naptr(Naptr),
    Svcb(Svcb),
    ...
}
```

但是 sum type 有一个关键特性：

```text
enum size
≈
max(all variant size)
+
discriminant
+
alignment
```

Cloudflare 当时最大的 variant 是：

```text
NAPTR ≈ 136 bytes
```

最终整个 ​`RecordData` enum 达到约：

```text
144 bytes
```

于是一个 IPv4 地址虽然只有：

```text
4 bytes
```

放进去后仍然要占：

```text
~144 bytes
```

可以把它想象成：

```d2
direction: down

enum: "RecordData enum\n每个值 144 bytes"

variants: {
  direction: right

  a: "A\n有用：4 B\n未用：约 120+ B"

  aaaa: "AAAA\n有用：16 B\n未用：约 120 B"

  txt: "TXT\n大小可变"

  naptr: "NAPTR\n约 136 B\n最大的 variant"
}

enum -> variants

traffic: "流量分布\nA + AAAA > 80%"

traffic -> variants.a
traffic -> variants.aaaa

problem: "稀有的大 variant\n决定了每个常见 variant 的大小"

variants.naptr -> problem
problem -> enum
```

这里最恐怖的是：

> **最稀有的数据类型，决定了最常见数据类型的内存大小。**

而 Cloudflare 的 A + AAAA 占流量绝大多数。

---

# 7. 第一个解决方案：Box 大 Variant

可以把：

```rust
Naptr(Naptr)
```

改成：

```rust
Naptr(Box<Naptr>)
```

于是 enum 里面不再放：

```text
136 bytes NAPTR
```

只需要放：

```text
8-byte pointer
```

例如：

```rust
enum RecordData {
    // hot + small
    A(Ipv4Addr),
    Aaaa(Ipv6Addr),

    // cold + large
    Txt(Box<Txt>),
    Naptr(Box<Naptr>),
    Svcb(Box<Svcb>),
}
```

于是 enum 本身可以从：

```text
144 bytes
```

缩小到大约：

```text
24 bytes
```

对于 A / AAAA，这一下就可以减少大约 120 bytes / record 级别的浪费。

这其实是一种：

# Hot / Cold Representation Splitting

```text
Common + Small
    ↓
inline

Rare + Large
    ↓
heap
```

这个模式在很多高性能系统里都会出现：

```text
small string optimization
small vector optimization
inline metadata
cold side table
tagged pointer
out-of-line large payload
```

但是 Cloudflare 很快发现：

> Boxing 并不是终点。

---

# 8. 为什么 Box 又产生了新的问题？

现在结构变成：

```text
CacheEntry
   │
   └── Record[]
          │
          ├── A inline
          ├── AAAA inline
          │
          ├── ptr ───────→ TXT
          │
          ├── ptr ─────────────→ MX
          │
          └── ptr ─────────────────────→ NAPTR
```

问题一：

# allocator size class

Big Pineapple 使用 jemalloc。

allocator 通常不会精确按照：

```text
request 40 bytes
```

就真的分配 40 bytes。

它可能对应到某个 size class：

```text
40 bytes
   ↓
48-byte allocation class
```

多出的：

```text
8 bytes
```

就是 internal fragmentation。

当：

```text
allocation 数量 × 数十亿
```

时，它就不再是小问题。Cloudflare 在文章中专门举了 ​`MX` 等 record 被 allocator size class 向上取整的例子。

---

问题二：

# Pointer Chasing

考虑：

```text
CPU 正在读取 CacheEntry

Cache line #1
┌─────────────────────────┐
│ metadata                │
│ Record A                │
│ Record AAAA             │
│ ptr --------------------┼─────────────┐
└─────────────────────────┘             │
                                        ▼
                                unrelated heap region
                                ┌───────────────────┐
                                │ TXT payload       │
                                └───────────────────┘
```

CPU 无法保证：

```text
Record
RecordData
Name
TXT
MX
...
```

都在附近。

所以 lookup 过程中可能不断发生：

```text
load pointer
    ↓
follow pointer
    ↓
new cache line
    ↓
possibly cache miss
    ↓
wait for memory
```

这就是：

```text
pointer chasing
```

对象模型越“漂亮”，有时候内存访问反而越散。

---

# 9. 最关键的一步：不要再存 Rust Object，直接存 Bytes

Cloudflare 最终问了一个很重要的问题：

```text
我们为什么一定要在 cache 中保存 parsed Record object？
```

DNS 数据最后本来就需要被重新编码成：

```text
DNS wire format
```

于是一个自然方案是：

```text
直接把整个 DNS Response packet 缓存下来
```

Cache hit 时：

```text
memcpy(packet)
    ↓
patch message ID
    ↓
send
```

听起来非常完美。

但是这里又有两个问题。

---

## 9.1 DNSSEC DO bit

客户端是否请求 DNSSEC record，取决于 EDNS 中的：

```text
DO = DNSSEC OK
```

如果直接 cache 完整 response：

```text
Response with DNSSEC
Response without DNSSEC
```

可能就需要保存两个版本。

否则 lookup 时还得重新解析完整 packet，然后删除：

```text
RRSIG
DNSKEY
NSEC
...
```

这违背了优化目标。

---

## 9.2 有些 Record 需要重新做 Name Compression

DNS wire message 中：

```text
CNAME
NS
MX
SOA
```

等 record 包含 domain name。

最终输出 packet 时，DNS message compression 与：

```text
这个 name 在最终 packet 的什么位置
```

有关。

所以这些记录不能简单地无脑 memcpy。

---

# 10. Cloudflare 最终选择：Hybrid Representation

最终不是：

```text
Structured Rust Objects
```

也不是：

```text
Whole DNS Packet
```

而是中间路线：

```text
Structured metadata
+
wire-format RecordData bytes
```

Cloudflare 将 records 编码成一个连续：

```rust
Box<[u8]>
```

内部类似：

```text
┌─────────────┬─────────────────────┐
│ len: u16    │ record bytes        │
├─────────────┼─────────────────────┤
│ len: u16    │ record bytes        │
├─────────────┼─────────────────────┤
│ len: u16    │ record bytes        │
├─────────────┼─────────────────────┤
│ ...         │ ...                 │
└─────────────┴─────────────────────┘
```

整体演进可以总结为：

```d2
direction: right

v0: "V0\n对象图" {
  label: "Vec<Record>\n+ 大 enum\n+ owner Name\n+ 多次分配"
}

v1: "V1\n不可变容器" {
  label: "Box<[T]>\nBox<str>\n去掉 capacity"
}

v2: "V2\n展平 Section" {
  label: "Answer + Authority + Additional\n→ 一个 record 列表\n+ section 偏移"
}

v3: "V3\n上下文压缩" {
  label: "owner == qname\n→ 省略 owner"
}

v4: "V4\nBox 大 Variant" {
  label: "小的 / 常见的内联\n大的 / 稀有的放到堆上"
}

v5: "V5\n面向字节的 Cache" {
  label: "一个 Box<[u8]>\n带长度前缀的 wire record\n连续分配"
}

v0 -> v1: "去掉不需要的可变性"
v1 -> v2: "去掉列表 / 指针"
v2 -> v3: "去掉重复信息"
v3 -> v4: "去掉 enum 最大 variant 税"
v4 -> v5: "去掉对象图本身"
```

这实际上是整个优化最核心的一步。

---

# 11. Insert Path 到底怎么实现？

Cloudflare 没有公开最终完整的 production struct，因此下面是根据文章重建的**概念模型**，不是其源码逐字还原。

可以把最终 entry 理解成：

```rust
struct CacheEntry {
    metadata: CacheMetadata,

    // Logical section boundaries / record metadata.
    sections: SectionMetadata,

    // Immutable compact representation.
    records: Box<[u8]>,
}
```

而插入过程大致变成：

```d2
direction: down

upstream: "上游 DNS 响应"

parse: "DNS 解析器" {
  validate: "校验 DNS 报文"
  decode: "解码所需的 record 元数据"
}

normalize: "Cache 规范化" {
  owner: "Owner 省略\nowner == qname → 隐式"

  flags: "打包布尔标志位"

  sections: "记录\nAnswer / Authority /\nAdditional 边界"
}

scratch: "可复用的暂存缓冲区\nVec<u8>" {
  note: "在多次插入之间保留\n容量可被复用"
}

serialize: "序列化 Record" {
  layout: "对每个 Record：\n[u16 长度][wire-format bytes]"
}

allocate: "一次精确大小的分配\nBox<[u8]>"

entry: "最终 CacheEntry" {
  meta: "TTL / 时间戳 /\n命中元数据 / 标志位"

  section_meta: "section 边界"

  data: "连续的 record 字节"
}

arc: "ARC Cache"

upstream -> parse.validate
parse.validate -> parse.decode

parse.decode -> normalize.owner
normalize.owner -> normalize.flags
normalize.flags -> normalize.sections

normalize.sections -> scratch

scratch -> serialize: "追加编码后的 record"

serialize -> allocate: "分配精确长度\n+ memcpy"

allocate -> entry.data
normalize.sections -> entry.section_meta

entry -> arc: "不可变写入"
```

这里有一个容易忽略、但非常漂亮的优化：

## Scratch Buffer

如果每次 insert 都这样：

```rust
let mut buf = Vec::new();

serialize(&mut buf);

let data = buf.into_boxed_slice();
```

仍然可能发生：

```text
allocate
grow
reallocate
grow
...
```

并且 allocator 不一定真的能从 ​`Vec` shrink 中收回尾部空间。

Cloudflare 使用一个会在多次 cache insertion 之间复用的：

```text
scratchspace buffer
```

第一次：

```text
capacity = 0
→ 128
→ 256
→ 512
→ ...
```

之后多数请求：

```text
capacity 已经足够
```

只需要：

```text
clear
serialize
```

而无需重新分配。

最终知道准确长度以后：

```text
scratch buffer
      ↓
exact Box<[u8]>
      ↓
memcpy once
```

最终 cache entry 因而只保留**刚好需要的 bytes**。

这一变化单独就让 Cloudflare benchmark 中 cache insertion throughput 又提高约 **13%** 。

---

# 12. Lookup Path 为什么反而更快？

通常听到：

```text
把 parsed object 改成 raw bytes
```

第一反应可能是：

```text
那不是要重新 parse？
```

但这里恰恰相反。

很多 DNS record：

```text
A
AAAA
TXT
DNSSEC records
...
```

其 record data 可以直接从 cache buffer：

```text
memcpy
```

到最终 DNS response。

于是过去：

```text
Parsed Rust Record
        ↓
match RecordData enum
        ↓
read fields
        ↓
serialize field
        ↓
serialize field
        ↓
serialize field
        ↓
wire format
```

变成：

```text
Cached wire-format bytes
        ↓
memcpy
        ↓
wire format
```

只有包含 domain name 的：

```text
CNAME
NS
MX
SOA
...
```

仍然需要解析，因为最终 packet 构建时需要重新进行 DNS name compression。

整个 lookup path 可以表示为：

```d2
direction: down

query: "DNS 查询"

key: "构建 CacheKey\nqname + qtype + flags/tag"

lookup: "ARC Cache 查找"

entry: "CacheEntry" {
  meta: "TTL / 元数据"
  bytes: "Box<[u8]>\n[长度][record][长度][record]..."
}

iterate: "顺序 Record 迭代器"

decision: "Record 是否需要\n重写名字 / 压缩？"

fast: "快速路径" {
  copy: "直接 memcpy\n缓存的 record 字节"
}

slow: "名字感知路径" {
  parse: "解析相关字段"
  restore: "按需从 CacheKey 恢复\n隐式的 owner"
  compress: "应用 DNS 名字压缩"
  serialize: "序列化进输出报文"
}

output: "最终 DNS Wire 报文"

query -> key
key -> lookup

lookup -> entry: "命中"

entry.bytes -> iterate

iterate -> decision

decision -> fast.copy: "否\nA / AAAA / TXT /\nDNSSEC 等"

decision -> slow.parse: "是\nCNAME / NS /\nMX / SOA 等"

key -> slow.restore

slow.parse -> slow.restore
slow.restore -> slow.compress
slow.compress -> slow.serialize

fast.copy -> output
slow.serialize -> output
```

这里出现了一个重要变化：

```text
Random access
      ↓
Sequential scan
```

原来的：

```rust
records[index]
```

变得没那么方便。

现在需要：

```text
read u16 length
advance length bytes
read next u16
...
```

尤其 round-robin A/AAAA rotation 的实现会更复杂。

但 Cloudflare 做出的判断是：

```text
每个 DNS cache entry 的 record 数量本身很少
```

因此：

```text
O(1) random access
```

并没有真正重要到值得付出 object graph 的内存和 cache-locality 成本。

这是一个很经典的工程取舍：

> Big-O 相同甚至更差，并不代表实际 CPU performance 更差。

---

# 13. 为什么连续 Buffer 会让 CPU 更快？

现代 CPU 读取内存并不是一个 byte 一个 byte 地取。

而是以 cache line 为基本单位，例如常见：

```text
64 bytes
```

如果数据是：

```text
Record 1
Record 2
Record 3
Record 4
```

连续排列：

```text
RAM

┌──────────────── Cache Line ────────────────┐
│ Record1 │ Record2 │ Record3 │ part Record4│
└────────────────────────────────────────────┘
```

CPU 读取 Record1 时，很可能顺便已经把 Record2 和 Record3 带进 L1/L2 cache。

这种访问方式非常接近：

```text
for record in records {
    process(record)
}
```

CPU hardware prefetcher 也非常喜欢。

反过来，如果是：

```text
Record
   ↓ pointer
Heap Object

Record
   ↓ pointer
Heap Object

Record
   ↓ pointer
Heap Object
```

访问模式就可能变成：

```text
CacheEntry
    │
    ├── L1 miss
    │
    └── pointer
          ↓
        Heap page A
          │
          └── pointer
                ↓
              Heap page F
```

这会同时增加：

```text
cache miss
TLB pressure
pointer dependency
allocator metadata
memory fragmentation
```

所以：

> **减少内存占用与提升性能，在这种 workload 下其实是同一个问题。**

Cloudflare 最终的 lookup latency：

```text
828 ns
  ↓
670 ns
```

下降约：

```text
19%
```

其中最后的 wire-format representation 本身就在 benchmark 中进一步改善了 lookup latency。

---

# 14. 五轮优化，其实是在逐渐消灭「对象」

把整个过程重新抽象一下：

```d2
direction: down

stage0: "阶段 0 — 领域模型" {
  a: "Vec"
  b: "String"
  c: "Record 结构体"
  d: "大 enum"
  e: "Owner Name"
}

stage1: "阶段 1 — 去掉可变性" {
  a: "Vec<T> → Box<[T]>"
  b: "String → Box<str>"
}

stage2: "阶段 2 — 去掉容器重复" {
  a: "3 个 record 数组 → 1 个数组"
  b: "指针 → 小偏移"
  c: "bool → bitflags"
}

stage3: "阶段 3 — 去掉语义重复" {
  a: "record.owner == qname"
  b: "→ 隐式 owner"
}

stage4: "阶段 4 — 去掉类型布局浪费" {
  a: "大 enum variant → Box"
  b: "缩小常见 RecordData 的大小"
}

stage5: "阶段 5 — 去掉对象图" {
  a: "Record enum"
  b: "Box<RecordData>"
  c: "多次堆分配"
  d: "↓"
  e: "一整块连续的 Box<[u8]>"
}

result: "最终效果" {
  mem: "内存大幅降低"
  alloc: "更少的分配"
  locality: "更好的局部性"
  insert: "更快的插入"
  lookup: "更快的查找"
}

stage0 -> stage1
stage1 -> stage2
stage2 -> stage3
stage3 -> stage4
stage4 -> stage5
stage5 -> result
```

可以发现 Cloudflare 一开始优化的是：

```text
field
```

后来优化的是：

```text
struct
```

再后来优化：

```text
allocation
```

最终优化的是：

```text
representation
```

这是性能工程中非常典型的层次：

```text
Micro Optimization
        ↓
Data Structure Optimization
        ↓
Memory Layout Optimization
        ↓
Representation Redesign
```

最后一层往往收益最大。

---

# 15. Cloudflare 是怎么测出来的？

还有一点非常值得学习：

Cloudflare 并不是：

```text
改代码
→ 看 RSS
→ 感觉省内存了
```

而是同时维护两套测量。

## Micro Benchmark

他们构造了接近生产流量分布的数据：

```text
A      56%
AAAA   25%
TXT    19%
```

每个 entry：

```text
1 ~ 4 records
```

TXT 大小随机分布在：

```text
64 ~ 224 bytes
```

并通过自定义 allocator wrapper 统计：

```text
allocation count
allocation size
bytes / cache entry
```

同时测量：

```text
insert throughput
lookup latency
```

从而避免出现：

```text
内存少了 30%
但是 CPU 慢了 50%
```

这种“优化”。

---

## Production RSS

Micro benchmark 无法反映：

```text
allocator fragmentation
真实 query distribution
ECS cache variants
cache occupancy
其他 process memory
```

因此 Cloudflare 最后又通过真实生产实例的 resident memory 验证。

上线阶段从：

```text
2026-05-18
```

逐步持续到：

```text
2026-07-06
```

生产环境中：

```text
p99 instance memory

9.3 GB
   ↓
5.3 GB
```

约下降：

```text
43%
```

p90：

```text
6.5 GB
   ↓
3.8 GB
```

约下降：

```text
42%
```

这也解释了为什么 benchmark 的：

```text
-56%
```

不会原样反映成 process RSS 的 ​`-56%`。

因为：

```text
RSS
=
DNS Cache
+
runtime
+
allocator
+
network buffers
+
Wasm
+
other application state
+
...
```

Cache 只是整个 process memory 的一部分。

---

# 16. 为什么 100 TB 并不夸张？

这是整个案例最容易低估的地方。

假设：

```text
250 billion entries
```

每条只节省：

```text
100 bytes
```

就是：

```text
250,000,000,000 × 100
=
25,000,000,000,000 bytes
≈
25 TB
```

而 Cloudflare benchmark 中：

```text
953 B
→
420 B
```

差值达到：

```text
533 B / entry
```

当然：

```text
benchmark entry count
≠
fleet 中所有 entry 的实际分布
```

所以不能简单计算：

```text
533 × 250B
```

作为生产节省量。

Cloudflare 最终使用生产 working set 得出的数字约为：

```text
100 TB
```

这仍然说明一个非常重要的问题：

> **Hyperscale systems 改变了“值得优化”的定义。**

在一个：

```text
10,000 entries
```

的应用里，节省：

```text
64 bytes / entry
```

毫无意义。

总共：

```text
640 KB
```

但在：

```text
250 billion entries
```

时：

```text
64 bytes
```

就是十几 TB。

---

# 17. 这套设计真正值得复用的 7 个原则

Cloudflare 这次优化其实可以提炼成七个更通用的系统设计原则。

## 1. 数据进入 immutable 生命周期以后，representation 应该改变

不要长期保存：

```text
builder representation
```

应该：

```text
Mutable Builder
      ↓
freeze
      ↓
Compact Immutable Representation
```

典型场景：

```text
cache
index
snapshot
AST
model weights
routing table
configuration
```

---

## 2. 不要为不可能发生的 mutation 付费

如果一个 collection 永远不会：

```text
push
insert
grow
```

那么：

```text
capacity
```

就是纯 metadata tax。

---

## 3. Common case 应该决定 layout

不要让：

```text
rare NAPTR
```

决定：

```text
every A record
```

的大小。

应该反过来：

```text
A / AAAA
决定 hot representation

NAPTR / uncommon type
承担 exception cost
```

即：

```text
Optimize common path
Degrade rare path gracefully
```

---

## 4. Context 可以替代数据

如果：

```text
record.owner
==
cache_key.qname
```

那么：

```text
record.owner
```

不是信息，只是重复。

这和数据库 normalization、dictionary encoding、column compression 的基本思想类似。

---

## 5. Allocation Count 和 Allocation Bytes 同样重要

两个方案即使：

```text
payload bytes
```

差不多，也可能因为：

```text
10 allocations
vs
1 allocation
```

表现完全不同。

原因包括：

```text
allocator metadata
size class rounding
fragmentation
cache locality
pointer chasing
```

---

## 6. Serialization Format 也可以是 Runtime Format

传统设计通常：

```text
Wire Format
    ↓ parse
Object Model
    ↓ serialize
Wire Format
```

Cloudflare 最后变成：

```text
Wire Format
    ↓ partial normalization
Cache-oriented Binary Format
    ↓ mostly memcpy
Wire Format
```

这里减少的不是一个函数调用。

而是：

```text
parse
object construction
heap allocation
enum dispatch
field serialization
```

整条 pipeline。

---

## 7. “更抽象”不一定“更高级”

传统软件工程可能倾向：

```text
Record {
    owner: Name,
    ttl: TTL,
    data: RecordData
}
```

因为它：

```text
self-contained
type-safe
easy to manipulate
easy to reason about
```

而 Cloudflare 最终的：

```text
metadata
+
offset
+
flags
+
length-prefixed bytes
```

明显更加低级。

但对于 cache：

```text
read-heavy
immutable
billions of objects
latency-sensitive
```

后一种 representation 恰恰更加正确。

所以：

> **好的 abstraction 必须与生命周期和 workload 对齐。**

而不是单纯追求对象模型漂亮。

---

# 18. 从系统层面看，这其实是在构造一个 Cache-specific IR

如果进一步抽象，我认为 Cloudflare 最终实际上设计出了一个：

```text
DNS Cache IR
```

也就是：

```text
Network Wire Representation
            ↓
Parser
            ↓
Rich Runtime Representation
            ↓
Cache Normalizer
            ↓
Compact Cache IR
            ↓
Response Builder
            ↓
Network Wire Representation
```

可以画成：

```d2
direction: right

network_in: "DNS Wire\n入站"

parser: "解析器"

runtime: "丰富的运行时模型" {
  records: "Record 结构体"
  names: "Name 对象"
  enum: "RecordData enum"
}

normalizer: "Cache 规范化器" {
  immutable: "冻结集合"
  flatten: "展平 section"
  owner: "省略重复的 owner"
  flags: "打包元数据"
  encode: "编码 record 字节"
}

cache_ir: "Cache IR" {
  metadata: "紧凑的元数据"
  sections: "section 边界"
  bytes: "连续的 record 字节"
}

builder: "响应构建器" {
  fast: "直接拷贝的快速路径"
  names: "名字感知的慢速路径"
}

network_out: "DNS Wire\n出站"

network_in -> parser
parser -> runtime

runtime -> normalizer

normalizer -> cache_ir: "STORE"

cache_ir -> builder: "CACHE HIT"

builder -> network_out

cache_ir.bytes -> builder.fast: "A / AAAA / TXT /\nDNSSEC"
cache_ir.bytes -> builder.names: "CNAME / NS /\nMX / SOA"

normalizer.owner -> cache_ir.metadata
normalizer.flatten -> cache_ir.sections
normalizer.encode -> cache_ir.bytes
```

这个视角比单纯理解为：

```text
Rust 内存优化
```

更有价值。

Cloudflare 实际做的是：

> **为 DNS cache workload 设计专用的数据中间表示。**

它既不是：

```text
网络协议表示
```

也不是：

```text
业务对象表示
```

而是：

```text
Serving Representation
```

---

# 19. 这对普通后端开发有什么意义？

可能有人会觉得：

```text
2500 亿条缓存
跟普通 SaaS 没关系。
```

其实设计原则非常通用。

例如你的系统中有：

```text
LLM Context Cache
Embedding Cache
Prompt Cache
Feature Cache
Routing Rules
Authorization Policy
Session Snapshot
Agent Memory
Search Index
```

如果这些数据：

```text
写一次
读很多次
几乎不修改
数量巨大
```

那么都应该问一次：

```text
当前在内存里保存的是：

业务最方便操作的 Representation

还是：

Serving 最适合读取的 Representation？
```

尤其对于：

```text
Rust
C++
Go
Java
```

这类长期运行的 backend service，更应该观察：

```text
bytes / object
allocations / object
pointers / object
cache lines / lookup
serialization cost / lookup
```

而不能只观察：

```text
CPU%
RSS
QPS
```

---

# 20. 最后总结

Cloudflare 这次 100 TB 内存优化，如果只看表面，可以总结成：

```text
Vec → Box
enum → Box
Record → bytes
```

但这会错过最重要的部分。

真正的演进其实是：

```text
方便编程的数据结构
        ↓
符合生命周期的数据结构
        ↓
符合真实数据分布的数据结构
        ↓
符合 allocator 的数据结构
        ↓
符合 CPU memory hierarchy 的数据结构
        ↓
符合实际 serving path 的数据表示
```

最终：

```text
953 B → 420 B
```

不仅省下了内存。

还让：

```text
Insert
625K/s → 893K/s

Lookup
828ns → 670ns
```

同时变快。

这可能是这篇文章最值得记住的一句话：

> **在足够大的系统里，Data Representation 本身就是 Architecture。**

当一个对象会存在几十亿、几百亿甚至几千亿份时，决定系统成本的往往已经不是：

```text
用了什么数据库
用了什么缓存框架
用了什么网络协议
```

而是更加基础的问题：

```text
这个对象到底由多少 bytes 构成？

里面有几个 pointer？

会触发几次 allocation？

CPU 需要跨多少 cache line 才能把它读完？

有没有保存根本不需要保存的信息？
```

Cloudflare 的答案最终非常接近高性能系统最朴素的一条原则：

```text
Store less.
Allocate less.
Chase fewer pointers.
Keep hot data contiguous.
Do less work on the hot path.
```

而当这个原则被应用到 **2500 亿级对象** 上时，结果就是：

```text
≈ 100 TB RAM
```

被释放出来。
