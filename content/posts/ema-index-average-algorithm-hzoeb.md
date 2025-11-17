---
title: 'EMA: 指数平均算法'
slug: ema-index-average-algorithm-hzoeb
url: /post/ema-index-average-algorithm-hzoeb.html
date: '2024-10-20 20:51:18+08:00'
lastmod: '2025-11-17 23:01:23+08:00'
toc: true
isCJKLanguage: true
tags: ["算法", "EMA", "数据分析"]
---



# EMA: 指数平均算法

EMA算法是什么?

一种常用的技术分析工具，主要用于平滑数据序列，以便更好地观察数据的趋势。

# 公式

$$
EMA_t = \alpha \times \text{Current} + (1 - \alpha) \times \text{EMA}_{t-1}
$$

其中：

- $\text{EMA}_t$ 是当前时刻的EMA值。
- $\alpha$ 是平滑系数，取值范围为0到1，通常计算为 $\alpha = \frac{2}{N+1}$，其中 $N$ 是时间窗口的大小。
- $\text{EMA}_{t-1}$ 是前一时刻的EMA值。

# 应用场景

如果直接使用当前值, 可能会因为尖刺的出现导致判断不够平滑

使用EMA算法可以通过调整 alpha 的大小来调整损失平滑度
