---
title: AI IDE的观察
slug: observation-of-ai-ide-z2w7k6c
url: /post/observation-of-ai-ide-z2w7k6c.html
date: '2024-08-31 23:33:38+08:00'
lastmod: '2025-11-17 22:59:32+08:00'
toc: true
isCJKLanguage: true
---



# AI IDE的观察

最近的cursor有掀起了巨大的潮流, 一夜之间仿佛又带来了AI IDE的春天

AI Coding的风潮并不起源于ChatGPT. 在更早的时候, GPT3出现后, 有一个[CodeX](https://openai.com/index/openai-codex/), 已经展现出了强大的编程能力. 此期间又有像是Github Copilit, Tabnine.

在ChatGPT出现后, 突然发现, 为代码进行高质量的补全并不是一件麻烦的事情, 提供代码上下文, 推断出后续的代码, 这件事情天生就适合LLM

按照形态来区分, 有这么几种

1. 插件
2. IDE

按照功能来说, 有

1. 自动代码补全
2. 根据自然语言进行补全
3. CodeBase QA
4. file mention Context
5. Error Debug
6. VCS
7. Unit Test

# 插件

插件是最简单也是最实用的一种方式, Github Copilit, Codium都是这样实现的.

但是平台其实会限制插件的能力, 以最主流的两种IDE: VsCode, Jetbrains举例

## VsCode

VsCode是对插件支持最强大的IDE, 实际上没有插件的VsCode就是一个记事本而已

VsCode的插件能力强大的超乎想象, 获取Terminal内容, Editor弹窗等等, 插件几乎可以所有应该获取的内容

一个非常明显的体验是, 几乎所以的AI Coding插件在VsCode上的体验都要超过Jetbrains, 除了市场占有率之外还有插件选择语言的原因(谁他妈喜欢写Java?)

## Jetbrains

毫无疑问, Jetbrains有着明显的语言倾向, 提供极为强大的开箱即用的能力, 在大部分情况下, 你不需要额外下载其他插件就能获得极为强大的代码工程能力

用Java写插件只能说是一坨大便, 几乎所有的AI Coding都会承诺对VsCode, Jetbrains的支持, 但是毫无疑问VsCode会是最优先支持

## Fleet

为什么要额外提一句Fleet, 因为实在是太垃圾了, 使用伟大的Kotlin语言进行插件的编写, 哇哦!

在开放的插件平台上已经有了大量的三方插件(三个), 伟大的Fleet, 拉了坨大的

## 总结

如果仅仅是想要做一些简单的能力, 那么没问题, 用插件来做是完全OK的.

但是如果你不想做简单的能力呢?

# IDE

从头到尾撸一套IDE? 那得多大的工作量啊

但是感觉伟大的VsCode, 将这么伟大的工程产品开源出来, 这是开源史上的一块丰碑

cursor, Haystack都借助其迅速的开发构建出了完整的IDE

而且, ***<u>可以直接使用VsCode的插件生态</u>***   相比下Jetbrains开发Fleet就完全抛弃了原本IDEA的插件生态, 真是臭的一坨

## VsCode-Like

毫无疑问, 在2024年, 这是最出色的方案, 市占率高, 极低的切换成本, 生态共享, 自定义程度高

这简直太棒了, 我现在用的Cursor就是这样做的, 高度制定了一些能力: 任意位置补全, 任意内容获取, 简单来说项目的完全控制能力

当然很棒, 但是你知道的, 我觉得其实完全可以做成一个插件来做的

之所以必须要做换皮, 我觉的可能有这么几个原因:

1. 防止破解, 使得 插件 + Proxy Backend影响了付费能力, 例如Github Copilit被Override + DeepSeek 爆杀
2. 完整的IDE控制能力, 不需要考虑插件的优先级, 访问权限的限制, 提供最优以及最高的能力

## Fleet

还是要说一手Fleet, 太鸡巴垃圾了, 我对Fleet出奇的愤怒, 就是因为太烂了

我在IDEAs上的使用习惯完全无法迁移过来

如果必须从头开始使用的话, 我为什么要用一个不成熟的IDE而不是用VsCode?

# 亟需改进

我认为现在的AI IDE有几个亟需改进的地方

1. 自动构建上下文的能力, 现在的解决方案和RAG很类似, 将整个代码库进行Index, 然后根据询问时的关键词进行确认, 构建Context的效果其实比较一般
2. 更广泛的API支持, 更多的LLM 厂商的接入, DeepSeek我爱你
3. 代码安全问题, 小厂无所谓, 但是对于有严格的代码审查的公司来说, 确实是很难受, 我认为安全问题的解决更应该依靠LLM厂商的能力保证

BTW, 在使用cursor之后, 我认为我得到了真正的解放, 这种感觉远胜于Github Copilit, 这让我真正的开始思考, 好像从手工时代一下子步入了工业时代, 虽然还少不了精细的雕琢, 但是效率依然远胜从前.

# Job Found

我正在寻找工作, 虽然不太难找, 但是我还是想找一些有共识且富有热情的人. 如果您有合适的工作机会,  [点我](https://blog.pdjjq.org/about)
