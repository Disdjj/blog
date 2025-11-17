---
title: 'BBR算法: 在Kratos的实现'
slug: bbr-algorithm-the-implementation-of-kratos-1nvlj9
url: /post/bbr-algorithm-the-implementation-of-kratos-1nvlj9.html
date: '2024-10-20 21:03:09+08:00'
lastmod: '2025-11-17 23:01:19+08:00'
toc: true
isCJKLanguage: true
---



# BBR算法: 在Kratos的实现

## 什么是BBR?

BBR (Bottleneck Bandwidth and RTT) 最初是由Google开发的网络拥塞控制算法。在限流领域,BBR被改造用于自适应限流,通过动态调整并发请求数来平衡系统吞吐量和响应时间。

## BBR限流算法的核心思想

BBR限流算法的核心思想是:

1. 持续监控系统的关键指标(CPU使用率、请求通过量、响应时间)
2. 根据这些指标动态计算系统的最大承载能力
3. 当系统负载接近或超过这个能力时进行限流

## Go语言实现分析

参考: [Kratos的BBR实现](https://github.com/go-kratos/aegis/blob/main/ratelimit/bbr/bbr.go)

### 核心数据结构

```go
type BBR struct {
    cpu             cpuGetter
    passStat        window.RollingCounter
    rtStat          window.RollingCounter
    inFlight        int64
    bucketPerSecond int64
    bucketDuration  time.Duration
    prevDropTime    atomic.Value
    maxPASSCache    atomic.Value
    minRtCache      atomic.Value
    opts            options
}
```

- ​`cpu`: 获取CPU使用率的函数
- ​`passStat`: 统计通过请求数的滑动窗口
- ​`rtStat`: 统计响应时间的滑动窗口
- ​`inFlight`: 当前处理中的请求数
- ​`bucketPerSecond`: 每秒的桶数
- ​`bucketDuration`: 每个桶的持续时间
- ​`prevDropTime`: 上一次开始丢弃请求的时间
- ​`maxPASSCache`: 缓存最大通过请求数
- ​`minRtCache`: 缓存最小响应时间

### 初始化

```go
func NewLimiter(opts ...Option) *BBR {
    // ... 初始化代码
}
```

这个函数创建并初始化一个BBR限流器实例。它设置默认选项,创建滑动窗口计数器,并初始化CPU使用率获取函数。

### 关键方法实现

#### maxPASS(): 计算最大通过请求数

```go
func (l *BBR) maxPASS() int64 {
    // ... 计算逻辑
}
```

这个方法计算在一个时间窗口内能够成功处理的最大请求数。它使用缓存来优化性能,并通过遍历滑动窗口找出最大的通过请求数。

#### 3.3.2 minRT(): 计算最小响应时间

```go
func (l *BBR) minRT() int64 {
    // ... 计算逻辑
}
```

这个方法计算系统处理请求的最短时间。它同样使用缓存优化,并通过遍历滑动窗口计算每个桶的平均响应时间,然后找出最小值。

#### maxInFlight(): 计算最大并发请求数

```go
func (l *BBR) maxInFlight() int64 {
    return int64(math.Floor(float64(l.maxPASS()*l.minRT()*l.bucketPerSecond)/1000.0) + 0.5)
}
```

这个方法计算系统在保持最佳性能的同时可以同时处理的最大请求数。它结合了最大通过量、最小响应时间和每秒的桶数来计算。

#### shouldDrop(): 判断是否应该限流

```go
func (l *BBR) shouldDrop() bool {
    // ... 判断逻辑
}
```

这个方法决定是否应该丢弃当前请求。它首先检查CPU使用率是否超过阈值。如果CPU使用率低,它会检查是否刚开始丢弃请求。如果CPU使用率高,它会检查当前并发请求数是否超过最大允许值。

#### Allow(): 限流器的主要入口

```go
func (l *BBR) Allow() (ratelimit.DoneFunc, error) {
    // ... 限流逻辑
}
```

这是BBR限流器的主要入口。它首先调用`shouldDrop()`​来决定是否应该丢弃请求。如果不丢弃,它会增加`inFlight`​计数,并返回一个`DoneFunc`,用于在请求完成时更新统计信息。

### CPU使用率监控

```go
func cpuproc() {
    // ... CPU使用率监控逻辑
}
```

这个函数在后台持续运行,每500毫秒采样一次CPU使用率,并使用指数移动平均(EMA)算法更新全局CPU使用率变量。

## BBR的工作流程

1. 系统持续监控CPU使用率、请求通过量和响应时间。
2. 当新请求到来时,`Allow()`方法被调用。
3. ​`Allow()`​调用`shouldDrop()`来决定是否应该限流。
4. ​`shouldDrop()`​首先检查CPU使用率,然后比较当前并发请求数与`maxInFlight()`。
5. 如果决定不限流,请求被允许通过,并增加`inFlight`计数。
6. 请求处理完成后,调用返回的`DoneFunc`来更新统计信息。

## BBR的优势

1. 自适应: 根据实时系统性能动态调整限流策略。
2. 多维度保护: 同时考虑CPU使用率、请求量和响应时间。
3. 高效: 使用滑动窗口和原子操作,保证高并发下的性能。
4. 精确控制: 通过精确计算最大并发请求数,实现细粒度的限流。

## 使用BBR的注意事项

1. 合理设置CPU使用率阈值: 这直接影响限流的触发时机。
2. 调整滑动窗口大小: 影响统计的精度和实时性。
3. 监控和调优: 在实际使用中需要持续监控系统性能,并根据需要调整参数。
