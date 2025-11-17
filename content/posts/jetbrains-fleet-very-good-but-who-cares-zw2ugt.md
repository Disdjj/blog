---
title: 'Jetbrains Fleet: 很好, 但是谁在乎呢?'
slug: jetbrains-fleet-very-good-but-who-cares-zw2ugt
url: /post/jetbrains-fleet-very-good-but-who-cares-zw2ugt.html
date: '2024-08-12 18:16:56+08:00'
lastmod: '2025-11-17 22:59:20+08:00'
toc: true
isCJKLanguage: true
---



# Jetbrains Fleet: 很好, 但是谁在乎呢?

在2024年8月12日的下午, 我收到了一封来自Jetbrains Fleet的订阅邮件, 现在开始Fleet开始[支持自定义插件](https://blog.jetbrains.com/fleet/2024/08/fleet-plugins-themes-first/?map=1)

![image](/images/image-20240812181749-ejy6le8.png)

Fleet曾经是一个充满了野心的项目, 曾经在官网上写着`下一代编辑器`, 曾经我也为获得了Fleet的内测资格而感觉无比兴奋, 但那已经是很久之前的事情了.

在我第一次体验之后, 我对这个项目失去了信心, 为什么?

我认为这个项目并不是为了解决类JB Idea的问题, 也不是为了解决Vscode / nvim的问题, 这像是一个KPI产物一样, 逐渐的丧失IDE的第一性以及Jetbrains的工程便利.

在经过了很久的迭代后: 很好, 但是谁在乎呢?

# IDE的第一性

什么是IDE的第一性?

1. 支持代码编辑
2. 支持语言/框架/项目的补全

在Vscode之前, 所有的IDE都是内置的语法分析以及补全, 这没有什么问题, 但是在Vscode带着LSP横空出世之后, 对于语言/框架/项目的补全已经不再是和IDE绑定的了, 所以在Vscode之后, nvim(Neovim)得以出现以及席卷世界.

那么剩下的就是代码编辑的舒适程度, 那这真的只剩下UI以及美化的工作了. 这里能够拉开多少差距呢?

# 工程便利性

我使用Jetbrains的最重要原因就是在开发上是非常便利的

1. 各类语言以及开发框架的出色支持
2. 语言上的各种贴心操作: Python的各种虚拟环境的支持, Rust的Cargo等等
3. 出色而且默认的Debug
4. 人性化的Git UI操作

但是肉眼可见的事情是, 在Fleet上这些优势是没有完全继承的

# 自定义插件

非常好, Fleet终于支持了自定义插件, 但是不是有些能力支持了就能够立刻获得社区支持的

我以我最喜欢的Vscode插件[Continue举例](https://github.com/continuedev/continue), 在Jetbrains和Vscode上的更新频率如下:

### Jetbrains 每月两次左右

![image](/images/image-20240812184323-81u87d6.png)

### Vscode 每周三次左右

![image](/images/image-20240812184447-nxlaikk.png)

某种程度上来说这其实是代表了插件开发的难度以及社区的活跃程度

根据Fleet的博客

> Fleet plugins are developed as Kotln Multiplatform Gradle-based projects. Only one Kotlin Multiplatform target is supported at this time: Kotlin/JVM.

还在他妈的用Kotlin

我不是说Kotlin不好, 但是能不能选一个更多人会写的语言来做? 不行! 因为用JS/lua等等和Fleet基于的语言很难一起使用, 容易造成一些语言层面的兼容性问题

现在Jetbrains 插件和Vscode的插件资源丰富度已经有比较大的差别了, Fleet能靠这个翻身吗? 难!

# Final

Vscode还在保持着出色的更新频率以及新的能力支持

但是Jetbrains Idea还在原地踏步, 最近最大的更新是2024.2 版本中强行使用`New UI`

我明确的告诉你们, `New UI`是很一般的, 而且测试了将近快一年的时间

太慢了, 小BUG太多了, 不严谨的发布版本太多了, 这就是我现在使用Jetbrains的感觉

我不会在下一年为Jetbrains购买全家桶的订阅了, 我已经受够了这样不稳定的IDE了, Fleet不会拯救你, 自求多福
