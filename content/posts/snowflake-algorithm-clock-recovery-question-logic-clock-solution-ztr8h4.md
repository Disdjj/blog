---
title: 'snowflake算法时钟回拨问题: 基于逻辑时钟解决方案'
slug: snowflake-algorithm-clock-recovery-question-logic-clock-solution-ztr8h4
url: >-
  /post/snowflake-algorithm-clock-recovery-question-logic-clock-solution-ztr8h4.html
date: '2024-03-14 23:40:12+08:00'
lastmod: '2025-11-17 22:33:19+08:00'
toc: true
isCJKLanguage: true
---



# snowflake算法时钟回拨问题: 基于逻辑时钟解决方案

> # 问题
>
> 1. 时间的生成完全依赖于本地时钟, 在开启NTP协议的情况下, 可能出现时钟回拨现象, 此时服务不可用
> 2. 为了防止ID被顺序破解, 通常自增值不会 递增1, 可以更加随机的添加递增值

# 解决方案

我们需要知道, 时钟回拨问题是一个对于分布式服务影响非常大的环节. 我们需要做的事情就是尽可能的削弱时钟回拨带来的影响.

可是, 怎么削弱?

只要时钟不回拨就能够解决这个问题, 或者说只要逻辑时钟不回拨就不会出现这个问题

```go
func (worker *idWorker) Generate() (value int64) {
	mutex.Lock()
	defer mutex.Unlock()
	t := time.Now().UnixMilli()

	// 如果当前时间比上一次时间大, 则sequence归零, 直接生成
	if t > worker.lastTimestamp {
		// fmt.Printf("lastTimestamp: %d\n", worker.lastTimestamp)
		worker.sequence = 0
		goto Generate
	}
	// 设置当前时间至少 >= 上一次时间
	t = worker.lastTimestamp
	worker.sequence += 1
	// fmt.Printf("sequence: %d\n", worker.sequence)
	// 如果超出了本次序列的最大值，借用后一ms的时间, 直接生成
	if worker.sequence >= seqMax {
		worker.sequence = 0
		t = worker.lastTimestamp + 1
		goto Generate
	}

Generate:
	worker.lastTimestamp = t
	// 时间左移 12+5+5, // 机器码ID左移10位，中间的12位是machine和dc, // 最后10位 是序列号
	value = worker.lastTimestamp<<22 | (worker.machineAndDC << 10) | worker.sequence
	return
}
```

在这个实现方案里, 表示序列号的用了 10bit 约 1024 个

在每次序列号将耗尽时, 不再等待时钟追回, 而是直接租借**下一个 ms** 的配额, 因为在大多数的场景下, 没有业务会需要 10Wqps 的发号器, 所以我们可以认为, 只要时间足够, `逻辑时钟` ​会最终追回 `物理时钟`

# 效果

## 唯一性

## 性能基准测试

‍
