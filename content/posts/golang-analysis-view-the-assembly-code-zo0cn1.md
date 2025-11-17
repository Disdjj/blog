---
title: 'golang: 分析查看汇编代码'
slug: golang-analysis-view-the-assembly-code-zo0cn1
url: /post/golang-analysis-view-the-assembly-code-zo0cn1.html
date: '2024-03-29 22:33:14+08:00'
lastmod: '2025-11-17 22:58:31+08:00'
toc: true
isCJKLanguage: true
---



# golang: 分析查看汇编代码

# 查看可执行文件

## 可视化

> 注意: linux用户需要额外运行`go install --tags nowayland loov.dev/lensm@main`

1. 下载 [lensm](https://github.com/loov/lensm): <kbd>go install loov.dev/lensm@main</kbd>
2. 运行`lensm`​: `lensm .\main.exe`

**效果:**

![image](/images/image-20240329223709-uz8x4k8.png)

## Go build

​`go build -gcflags -S .\main.go`

# 查看某个文件

​`go tool compile -N -l -S once.go`
