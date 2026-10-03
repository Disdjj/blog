---
title: 'D2: TALA'
slug: d2-tala-zujbef
url: /post/d2-tala-zujbef.html
date: '2026-10-03 17:19:47+08:00'
lastmod: '2026-10-03 19:39:56+08:00'
toc: true
isCJKLanguage: true
---



# D2: TALA

[D2](https://d2lang.com/) 是一个我非常喜欢的 **Diagram** as Code 的工具, 我之前一直都在使用[mermaid](https://mermaid.js.org/), 但是架不住 D2 的 TALA 算法实在太好用了

如果对其效果感兴趣, 建议去看看这[一篇文档](https://d2lang.com/blog/tala-is-open-source/)

> ```d2
>
> direction: right
>
> classes: {
>   base: {
>     style: {
>       bold: true
>       font-size: 28
>     }
>   }
>
>   person: {
>     shape: person
>   }
>
>   animated: {
>     style: {
>       animated: true
>     }
>   }
>
>   multiple: {
>     style: {
>       multiple: true
>     }
>   }
>
>   enqueue: {
>     label: Enqueue Task
>   }
>
>   dispatch: {
>     label: Dispatch Task
>   }
>
>   library: {
>     style: {
>       bold: true
>       font-size: 32
>       fill: PapayaWhip
>       fill-pattern: grain
>       border-radius: 8
>       font: mono
>     }
>   }
>
>   task: {
>     style: {
>       bold: true
>       font-size: 32
>     }
>   }
> }
>
> user01: {
>   label: User01
>   class: [base; person; multiple]
> }
>
> user02: {
>   label: User02
>   class: [base; person; multiple]
> }
>
> user03: {
>   label: User03
>   class: [base; person; multiple]
> }
>
> user01 -> container.task01: {
>   label: Create Task
>   class: [base; animated]
> }
> user02 -> container.task02: {
>   label: Create Task
>   class: [base; animated]
> }
> user03 -> container.task03: {
>   label: Create Task
>   class: [base; animated]
> }
>
> container: Application {
>   direction: right
>   style: {
>     bold: true
>     font-size: 28
>   }
>   icon: https://icons.d2lang.com/dev%2Fgo.svg
>
>   task01: {
>     icon: https://icons.d2lang.com/essentials%2F092-graph%20bar.svg
>     class: [task; multiple]
>   }
>
>   task02: {
>     icon: https://icons.d2lang.com/essentials%2F095-download.svg
>     class: [task; multiple]
>   }
>
>   task03: {
>     icon: https://icons.d2lang.com/essentials%2F195-attachment.svg
>     class: [task; multiple]
>   }
>
>   queue: {
>     label: Queue Library
>     icon: https://icons.d2lang.com/dev%2Fgo.svg
>     style: {
>       bold: true
>       font-size: 32
>       fill: honeydew
>     }
>
>     producer: {
>       label: Producer
>       class: library
>     }
>
>     consumer: {
>       label: Consumer
>       class: library
>     }
>
>     database: {
>       label: Ring\nBuffer
>       shape: cylinder
>       style: {
>         bold: true
>         font-size: 32
>         fill-pattern: lines
>         font: mono
>       }
>     }
>
>     producer -> database
>     database -> consumer
>   }
>
>   worker01: {
>     icon: https://icons.d2lang.com/essentials%2F092-graph%20bar.svg
>     class: [task]
>   }
>
>   worker02: {
>     icon: https://icons.d2lang.com/essentials%2F095-download.svg
>     class: [task]
>   }
>
>   worker03: {
>     icon: https://icons.d2lang.com/essentials%2F092-graph%20bar.svg
>     class: [task]
>   }
>
>   worker04: {
>     icon: https://icons.d2lang.com/essentials%2F195-attachment.svg
>     class: [task]
>   }
>
>   task01 -> queue.producer: {
>     class: [base; enqueue]
>   }
>   task02 -> queue.producer: {
>     class: [base; enqueue]
>   }
>   task03 -> queue.producer: {
>     class: [base; enqueue]
>   }
>   queue.consumer -> worker01: {
>     class: [base; dispatch]
>   }
>   queue.consumer -> worker02: {
>     class: [base; dispatch]
>   }
>   queue.consumer -> worker03: {
>     class: [base; dispatch]
>   }
>   queue.consumer -> worker04: {
>     class: [base; dispatch]
>   }
> }
> ```

# TALA

> TALA开源没多长时间, 感兴趣的可以去 [repo](https://github.com/d2lang/d2/tree/master/d2layouts/d2talalayout) 中看一看

按照官方的说法: ​`autolayout algorithm designed with software architecture diagrams in mind`

也就是一种专为软件架构图设计的自动布局算法, 从实际效果来看, 也确实如此, 最后的布局效果非常类似于大家在白板上手绘, 尤其是在有多层嵌套的情况下, 表现要更加的话, 尤其对比起 ELK 和Dagre, 在描述架构时优势非常大.

所以, 为什么D2 能够做到这么出色的表现呢?

从官方的文档中其实能够看到一些端倪

> Please also note that TALA is not without tradeoffs.
>
> - It has randomness in the algorithm. It finds the best layout by using a default of 3 seeds and choosing the one scored the best. Given the same seeds and same input, it'll produce the same diagram. But let's say you just add one more node. The diagram could look completely different. In Dagre and ELK, it looks mostly the same as prior, with the extra node accommodated for. This is sometimes desirable.
> - It doesn't do DAGs as well. I often find myself preferring Dagre or ELK when I want a long flowing graph.
> - It can take longer to run for larger diagrams -- scaling nonlinearly. For a benchmark of TALA's runtime performance compared to others, see [https://github.com/d2lang/d2-benchmarks](https://github.com/d2lang/d2-benchmarks).

非常明显的一点是: 布局具有随机性, 新增的节点可能会完全打乱, 对 DAG 处理效果不佳, 性能随着规模会迅速劣化.

所以我们能够推测出的一些事情:

1. 有 Seed, Random, 至少某种随机性
2. 层次遍历可能比较深

那么接下来的问题, 我们就看代码, 复刻 Demo 来解决吧

但是要说的一点是: TALA 是一个非常复杂的 Pipeline, 其中的一些步骤的必要性, 不见能够特别好的演示出来, 这部分会附上一些简单的说明 + 演示 demo

# DEMO

GPT 6.1 sol: https://gistpreview.github.io/?8fd9ae230611ec4d87c97ffcfab95244/index.html

A\ opus 5.5: [https://gistpreview.github.io/?6b738c2422ab87fff842f9cfb568c9e8](https://gistpreview.github.io/?6b738c2422ab87fff842f9cfb568c9e8)

---

> 以下内容由 claude opus 5.5 生成

# TALA 布局算法通俗说明

TALA 是 Terrastruct 给 D2 写的自动布局引擎，原来闭源收费，2026 年 9 月 7 日随 D2 v0.9.0 开源。代码在 ​`d2lang/d2`​ 仓库的 ​`d2layouts/d2talalayout` 目录，大约 6.4 万行 Go。这份说明基于我读源码的笔记，以及自己写 mini-tala 复刻时踩过的坑。

## 它想解决的问题

人画架构图时，很少一层层往下排。用户一般在一边，服务在中间，数据库在另一边；几个一样的 worker 排成一列；三个任务都连 producer，就从三个方向围过去。dagre 这类引擎先分层再排序，画流程图挺好，画这种图常常别扭。

TALA 的路子更像在白板上作图：先认出图里熟悉的结构，各用合适的办法摆好，剩下的部分一点点挪到合适位置，最后连线、放字。整条流水线按固定顺序跑 38 步。

## 第一步：先把图化简

正式摆放之前，TALA 会把图扫几遍，能认出来的结构先处理掉。

一串 ​`step` 形状的节点会被当成一条序列，压成一个整体。

树的识别靠反复剥掉只有一个邻居的叶子，把它挂到父节点名下。带分叉的树才会保留，单纯的链条放回原图。

符合条件的子图走经典的分层画法：network simplex 决定每个节点在第几层，sifting 减少交叉，Brandes–Köpf 定横坐标。判定条件很严，至少三层，不能太高也不能太宽，顺方向的边要明显多于反方向的，所以很多图根本走不到这条路。

同一容器里形状相同、尺寸接近、邻居也完全相同的几个节点，会合并成一个整体，源码里叫 vessel。任务队列那张图里，四个 worker 都只连着 consumer，就成了一个簇。

扫完这几遍，交给通用摆放器的节点就少了一大截。

## 第二步：在网格上反复挪位置

这是 TALA 的核心，源码注释说参考了 Freivalds 和 Glagolevs 关于紧凑正交布局的论文。

容器从里往外处理：先排好最内层容器里的东西，算出它有多大，再到上一层把它当成普通盒子来摆。

每一层里，节点只能落在格子上。算法跑 90×√N 轮（N 是这一层的节点数）。每轮先打乱节点顺序，再挨个处理：取邻居坐标的中位数，加一点随机偏移，当作它想去的地方，然后在附近找代价最低的空格挪过去。偏移量一开始有 2×√N 格，之后慢慢缩到 0.2 格，所以前期节点跳得厉害，后期只做微调。最后再跑几轮，只接受严格变好的移动。

我原本以为这就是模拟退火，读了代码才发现不太一样。每一轮节点都会去候选里最好的格子，哪怕那个格子比它现在的位置还差；代码里没有按概率接受变差的判断，也不会推倒重来。跳出局部最优，靠的是随机偏移，加上外层同时跑的几个 seed。

图最后长什么样，取决于代价怎么算。边越长代价越高。两端不在同一行或同一列时，连线得拐弯，要加罚；中间被别的节点挡住，也要加罚。方向上默认稍微偏向往右下走，写了 ​`direction` 之后这个偏好会强很多。两个节点之间有三条以上带标签的边时，会很想左右摆放，这样标签才排得开。另外，左右对称的布局会减分，相当于奖励。

## 第三步：修修补补

摆完节点还有十来个小步骤。比如交换两个节点，把一侧的子树绕中心旋转，把连线两端拉到同一条中心线上（这一步前后做了四次），收紧过大的空隙，把节点挪到两个邻居正中间。互不相连的几块用一个简单的装箱算法拼起来，装箱的打分里有一项 (宽−高)²，所以整张图偏向接近正方形。

这些步骤几乎都是同一个套路：试着改一下，算整体代价，变好就留，变差就撤。

## 第四步：连线

TALA 自带一个只走横线和竖线的连线器。它先在节点周围铺一张"可见性图"：把所有端口的横坐标和纵坐标两两组合成候选点，同一行、同一列上相邻的点连起来，穿过节点的连接去掉。线只能沿着这张图走，走出来自然横平竖直。

节点每条边上有三个端口，分别在 25%、50%、75% 处，从中间那个出线最便宜。

找路用 Dijkstra。搜索时会记着"是从哪个方向走过来的"，这样拐弯可以单独计费。交叉、和别的线重叠、从非中间端口出线，都要额外付代价。同源而且箭头相同的线可以共用一段，图里那种叉子形状就是这么来的。

先连的线会占掉好位置，所以连线顺序会影响结果。TALA 的办法很直接：按短边优先、长边优先、原始顺序各连一遍，挑总代价最低的。每条线只连一次，不会拆掉重连。

连完还有十几步后处理，比如去掉多余的绕弯、交换端口减少交叉、把平行线段均匀拉开、让连向同一个簇的线从同一点分叉。每一步都会检查交叉数、有没有穿过节点、有没有挡住标签，只要有一项变差，这一步就回滚。

## 第五步：放标签

标签一个接一个放，放好的标签会变成后面标签的障碍。每个标签有一组候选位置，挨个打分：压到节点、压到线要扣分，压到别的标签扣得最重。碰到零分的位置就直接用。

## 第六步：几个 seed 比一比

默认用 seed 1、2、3 各跑一遍完整流水线。偶数 seed 在节点数适中时会换一种开局，先按图上的距离摆出个大致形状，所以这三次其实是两种开局在比。

挑结果用的分数很朴素：

```
penalty = 0.5 × 拐点数 + 3 × 斜线段数 + 交叉数 + 标签重叠程度
```

越低越好。分数一样就比面积，面积也一样就取后面那个 seed。

## 工程上值得学的地方

几十条启发式规则叠在一起，却很少把节点改出重叠或越出容器，因为每次修改前都会先拍快照，检查不过就自动回滚。

同样的输入加同样的 seed，永远得到同一张图。多线程只影响速度，不影响结果，所有平局怎么判都写死了。

运行时间靠的是每个阶段的工作量上限，超出就报错或回滚。这样在浏览器（WASM）里跑也能稳定地停下来。

##
