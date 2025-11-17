---
title: '离开Jetbrains拥抱VsCode: 离开大便拥抱大便'
slug: leave-jetbrains-to-hug-vscode-leave-the-stool-to-hug-the-stool-7o3tm
url: >-
  /post/leave-jetbrains-to-hug-vscode-leave-the-stool-to-hug-the-stool-7o3tm.html
date: '2024-12-22 19:23:45+08:00'
lastmod: '2025-11-17 23:02:19+08:00'
toc: true
isCJKLanguage: true
---



# 离开Jetbrains拥抱VsCode: 离开大便拥抱大便

# 为什么要离开Jetbrains

原因很简单, Jetbrains对于AI Coding的支持非常烂

其中大部分的AI Coding都是通过插件来实现的, 但是体验非常不好, 而且开发难度比之Vscode高了许多, 很多同时支持Jetbrains以及VsCode的插件, 更新速度有巨大的区别

例如Continue, VsCode上可以做到周更, 但是在Jetbrains上更新频率要慢上许多.

当然了, 最重要的是功能上差了非常多.

Github Copilit在很就之前就支持了选择模型, 但是直到现在都还没有支持Jetbrains.

而Jetbrains自己开发的AI Assistant体验非常糟糕, 补全速度慢, 质量差.

而且肉眼可见的, 这两者的差别会越来越大. 因此在这种情况下, 我必须要离开Jetbrains了.

在AI编程越来越重要的情况下, Jetbrains在慢慢的落后, 直到被淘汰

# VsCode是另一坨大便

VsCode的体验算不上美妙.

对于一名后端开发来说, 我觉得功能实在是太捡漏了, 相比于Jetbrains提供的丰富的简化操作, 使用Code就像是穿着内裤洗澡一样, 总是让我觉得缺一点东西.

但是VsCode的插件系统做的太好了.

他给了开发者相当高的自由, 而且又具有相当低的开发难度.

最重要的是: 开源

Cursor以及Windsurf都是基于VsCode构建了自己的发行版, 所以其使用习惯和生态也是继承自VsCode.

但是问题是, 我之前从来只拿VsCode做写配置的工具, 从来不会在这上面写代码.

直到最近高强度使用下来, 巨大的痛苦向我袭来.

第一就是VsCode对于自定义主题的支持非常差, 很多人使用主题是非常粗糙的, 代码主题的作用不是让你的界面变得花花绿绿的很好看. 其真正的作用是帮助你快速的理解代码的结构.

例如: 区分函数声明以及函数调用, 区分Function和Method, 区分Class, Struct, Interface

之前我在Jetbrains上调了将近两年, 才摸索出了一套适合自己的方案

但是要迁到VsCode时, 我遇到了巨大的问题: VsCode完全没有提供相关的入口, 即使有, 也强依赖各种语言支持的插件, 但大概率是不支持的

例如我们可以使用: `Developer: Inspect Editor Tokens and Scopes`​来看所涉及的`textmate scopes`​以及`foreground Field`

![image](https://raw.githubusercontent.com/Disdjj/SiyuanPic/main/20241222210757.png)

好, 现在回答我 enc 是什么类型?

实例? interface? Package?

判断不了, 也加不上, VsCode的上色逻辑判断这是一个 `variable.other.go`

什么是`variable.other`? 全都是

判断不了的全都是他妈的`variable.other`

这就导致最后在VsCode上的配色, 最后都会变成一个个的色块儿, 而不能像在Jetbrains上变成

![image](https://raw.githubusercontent.com/Disdjj/SiyuanPic/main/20241222211208.png)

# 再见Jetbrains

我在Jetbrains上有两种主要资产

1. 主题设置, 从2017年开始, 我客制化了一套非常适用于自己的主题设置, 包括对类/结构体/引用/接口/变量/函数定义/函数调用等等非常详细的设置
2. 操作逻辑, 主要包括快捷键以及一些Jetbrains的特有逻辑: 函数调用栈

Jetbrains变得越来越臃肿, 时长会有卡顿, 而且每年1000块的价格的对比下, 实在是让我暴怒.

这两种资产在VsCode可能只能保留 50%, 但是这就足够了, 剩下的50%,  交给时间和社区吧.
