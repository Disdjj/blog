---
title: E2B & FireCracker by GPT5.4
slug: e2b-z1sb21m
url: /post/e2b-z1sb21m.html
date: '2026-04-03 00:17:48+08:00'
lastmod: '2026-04-05 17:16:23+08:00'
toc: true
isCJKLanguage: true
---



# E2B & FireCracker by GPT5.4

如果你第一次接触 Firecracker，很容易陷入一种混乱：

- KVM 是不是虚拟机？
- QEMU 和 KVM 到底是什么关系？
- Firecracker 是不是“替代了” QEMU？
- 如果我要自己做一个 mini Firecracker，最小需要做什么？

我最近就是沿着这个问题一路往下挖，最后发现：  
**这几个东西其实不是同一层的概念。**

它们的关系，如果一句话概括，就是：

- **KVM**：内核里的硬件虚拟化执行后端
- **QEMU**：用户态的通用 VMM / 设备模拟器
- **Firecracker**：用户态的极简 VMM，建立在 KVM 之上

也就是说：

**QEMU 和 Firecracker 都可以用 KVM。**   
它们真正的区别，不在“有没有 KVM”，而在于：**谁来做 VMM，以及这个 VMM 做得多大、多复杂。**

这篇文章我想把这件事彻底讲清楚。

---

# 一、问题的起点：为什么 Firecracker 会存在？

Firecracker 不是凭空出现的，它解决的是一个非常现实的问题：

在云计算场景里，比如 AWS Lambda、Fargate、Serverless 平台，一台物理机上往往要同时运行大量来自不同用户的代码。

这里有一个经典矛盾：

## 容器很轻，但隔离不够强

Docker、containerd 这条路线有明显优势：

- 启动快
- 资源开销小
- 编排成熟

但容器共享宿主内核。  
这意味着：

**容器的隔离边界，本质上不是硬件级别的。**

只要内核、namespace、cgroup、runtime 某一层出了问题，就可能导致跨容器突破。

---

## 传统虚拟机隔离强，但太重

另一边是传统 VM：

- 有自己的内核
- 隔离边界更强
- 更接近“真正的一台独立机器”

但问题也很明显：

- 启动慢
- 内存开销大
- 设备模型复杂
- 历史兼容包袱重

如果你只是想跑一个很小的函数，或者一个短生命周期任务，传统 VM 往往过重。

---

## Firecracker 的目标

Firecracker 的目标可以理解为：

**用尽量小的开销，换取 VM 级别的隔离。**

不是追求“模拟一台完整 PC”，而是追求：

- 少设备
- 少功能
- 少攻击面
- 快启动
- 小内存占用

所以它本质上是一个：

**建立在 KVM 之上的极简 microVM VMM。**

---

# 二、先把关系讲清楚：KVM、QEMU、Firecracker 各自是什么？

这是最容易混的地方。

---

## 1. KVM 是什么？

KVM，`Kernel-based Virtual Machine`，是 Linux 内核里的一套虚拟化能力。

它不是完整虚拟机，也不是设备模拟器。  
它的核心职责很简单：

- 创建 VM
- 创建 vCPU
- 让 guest 指令直接在物理 CPU 上运行
- 当 guest 发生 VM Exit 时，把控制权还给用户态 VMM

所以可以把 KVM 理解成：

**内核提供的“虚拟 CPU 执行引擎”。**

它解决的是：

 **“guest 代码怎么高效运行在硬件上？”**

---

## 2. QEMU 是什么？

QEMU 是用户态的 VMM / 模拟器。

它做的事情是：

- 加载 kernel / initrd / BIOS
- 布置 guest memory
- 模拟磁盘、网卡、串口、时钟等设备
- 处理 guest 的 I/O 行为
- 提供完整的启动流程

如果**不配 KVM**，QEMU 也能跑，但那是纯软件模拟，会很慢。  
如果**配 KVM**：

```bash
qemu-system-x86_64 -accel kvm ...
```

那么就是：

- **QEMU 管机器**
- **KVM 管 CPU 执行**

所以：

**QEMU 不是 KVM 的替代品，而是 KVM 上层最常见的 VMM。**

---

## 3. Firecracker 是什么？

Firecracker 也是用户态 VMM，但和 QEMU 的理念完全不同。

QEMU 的目标是：

- 通用
- 兼容很多硬件
- 能模拟一大堆设备
- 覆盖各种历史负担

Firecracker 的目标是：

- 只做 microVM 需要的最小集合
- 设备尽量少
- 启动路径尽量短
- 安全面尽量小

所以 Firecracker 不是“没有 KVM 的另一个东西”，而是：

**Firecracker = 更小的 VMM + KVM**

---

# 三、最关键的一句话：它们的边界在哪里？

如果把一台虚拟机拆开看，可以粗暴分成两层：

## 下层：让 guest CPU 跑起来

这是 **KVM** 解决的。

## 上层：让它看起来像一台机器

这是 **QEMU / Firecracker** 解决的。

也就是说：

- KVM 管“执行”
- VMM 管“机器行为”

所以你可以记一句很有用的话：

**KVM 管 CPU，VMM 管设备和启动流程。**

---

# 四、Firecracker 每一层到底在解决什么问题？

如果从工程视角看，Firecracker 不是“一个大黑盒”，而是一层一层在解决问题。

---

## 1. Jailer：先把 VMM 自己关进笼子

问题是：

即使 guest 被 KVM 隔离了，**Firecracker 进程自己仍然运行在 host 上**。

如果 VMM 本身有 bug，被打穿，它依旧可能伤害宿主机。

所以 Firecracker 在启动前先用 Jailer 做一层外部隔离：

- namespace
- cgroup
- chroot
- 降权
- 最小文件可见性

它解决的是：

 **“谁来限制 VMM 自己？”**

---

## 2. KVM 初始化：让 guest 能真正跑起来

问题是：

你需要一种方式，让 guest 不靠软件模拟，而是尽量直接使用硬件。

KVM 提供的核心对象一般是三个 fd：

- KVM fd
- VM fd
- vCPU fd

然后用户态 VMM 负责：

- 配 guest 内存
- 创建 vCPU
- 设寄存器
- 调 `KVM_RUN`

它解决的是：

 **“guest 指令到底怎么执行？”**

---

## 3. 内存映射：guest 看到的物理内存从哪来？

Guest 以为自己有一块连续物理内存。  
实际上，这通常只是 host 上的一段 `mmap` 区域。

KVM 帮你把：

- guest physical address
- 映射到 host 内存

它解决的是：

 **“guest 看到的 RAM 是怎么伪造出来的？”**

---

## 4. vCPU 线程：guest CPU 怎么持续运行？

每个 vCPU 一般对应一个 host 线程。  
VMM 的典型主循环是：

1. 调 `KVM_RUN`
2. guest 执行
3. 遇到 VM Exit
4. VMM 处理退出原因
5. 再次进入 guest

它解决的是：

 **“guest 怎么在 host 上持续执行，同时还能被暂停、恢复和管理？”**

---

## 5. 设备模拟：guest 怎么做 I/O？

Guest 不可能直接摸宿主机硬件。  
所以 VMM 需要提供设备。

Firecracker 采取的是最小设备集：

- ​`virtio-net`
- ​`virtio-blk`
- ​`serial`
- ​`rng`
- ​`vsock`
- ​`balloon`
- 等少量必需设备

这里关键点是：Firecracker 更喜欢 **VirtIO**，而不是模拟传统 PC 硬件。  
因为 VirtIO 更简单、更快、攻击面更小。

它解决的是：

 **“guest 如何访问网络、磁盘、串口这些外设？”**

---

## 6. API Server：外部怎么控制 microVM？

平台不可能手动敲命令控制 VM。  
需要一个控制接口。

Firecracker 提供的是 Unix Socket 上的 API，分为：

- preboot 配置
- runtime 操作

比如：

- 设置 kernel
- 挂 drive
- 设置网卡
- start
- pause
- snapshot
- restore

它解决的是：

 **“平台控制面如何管理 VM 生命周期？”**

---

## 7. MMDS：guest 如何拿到自己的 metadata？

在云环境里，guest 常常要知道：

- 自己是谁
- 配置是什么
- 应该拿什么 token / credential

Firecracker 提供 MMDS，模仿云平台元数据服务。

它解决的是：

 **“guest 如何拿到属于自己的配置元数据？”**

---

## 8. Seccomp：最后一层防线

即使已经有：

- Jailer
- KVM

仍然还要防止 Firecracker 进程乱调用系统调用。

所以不同线程会被挂上不同的 seccomp 白名单。

它解决的是：

 **“如果 VMM 出问题，如何进一步限制伤害范围？”**

---

## 9. Snapshot / Restore：解决冷启动

这是 Firecracker 在 Serverless 场景非常关键的一环。

不是每次都从：

- 启 kernel
- 启 OS
- 启 runtime
- 加载应用

而是先启动一次，再保存快照，后续直接恢复。

它解决的是：

 **“如何把冷启动延迟压到毫秒级别？”**

---

## 10. Event Loop：怎么把 API、设备、定时器、vCPU 串起来？

VMM 要同时处理很多事件：

- API 请求
- 设备 I/O
- 中断
- 定时器
- guest 退出

Firecracker 用基于 `epoll` 的事件循环来组织这些事情。

它解决的是：

 **“如何高效协调整个 VMM 内部的事件流？”**

---

# 五、如果我只是想做一个 mini 版 Firecracker，最小需要什么？

这个问题比“Firecracker 全量实现”更有意义。

因为大多数人第一次做 microVM runtime，不应该一上来就做：

- jailer
- seccomp
- snapshot
- mmds
- virtio-blk
- 多 vCPU
- 热插拔

你会直接淹死在复杂度里。

---

## 一个真正“最小可运行”的目标应该是什么？

比如下面这个闭环就很好：

1. 本地启动 `N` 个 microVM
2. 每个 guest 能联网
3. 每个 guest 启动后访问 host API
4. host API 收到请求后 `count + 1`

如果以这个目标倒推，最小需要：

- Linux host + `/dev/kvm`
- 1 个 vCPU
- guest memory
- kernel
- initramfs
- 串口
- virtio-net
- tap / bridge
- host counter API
- 一个简单 launcher

---

## 最重要的简化：先不要磁盘

第一版最值得做的简化是：

**不要 root disk，不要 virtio-blk，直接用 initramfs。**

因为这样 guest 启动后直接执行 `/init`，你把最小用户态程序打进 initramfs 就行。

guest 的 `/init` 做三件事：

1. 配网
2. 调 `http://host/incr`
3. 打日志然后关机

这样能少掉非常多复杂度。

---

# 六、为什么我一开始选择了 “QEMU + KVM” 而不是直接手搓 VMM？

因为如果你的目标是先跑通业务闭环，QEMU 非常适合作为过渡层。

比如你只想验证：

- guest 能起来
- guest 能通过 virtio-net 出网
- guest 能请求 host API
- host count 能变成 N

那一开始直接上自研 VMM，你会立刻被这些问题包围：

- Linux boot protocol
- guest memory 布局
- vCPU 初始化
- serial 模拟
- virtio-net
- TAP 转发
- VM Exit 处理

这些全都是对的，但**不该同时做**。

所以我当时的工程判断是：

**先用 QEMU 作为 VMM，把 control plane、network、guest workload 跑通。**   
然后再逐步把 QEMU 替换掉。

这条路线的好处是：

- 验证闭环先成立
- 排障基准先稳定
- 以后替换 backend 时，CLI 和业务验收标准不变

---

# 七、QEMU 和 KVM 的关系，最容易被误解的一点

很多人会说：

> “我都用 QEMU 了，那还跟 KVM 有什么关系？”

答案是：关系非常大。

如果你运行的是：

```bash
qemu-system-x86_64 -accel kvm ...
```

那么你的 guest CPU 其实就是跑在 KVM 上的。  
只是你没有自己写 `/dev/kvm` 的 ioctl，而是让 QEMU 帮你做了。

所以准确说：

- **QEMU without KVM**：软件模拟，慢
- **QEMU + KVM**：QEMU 管机器，KVM 管执行
- **Firecracker + KVM**：Firecracker 管机器，KVM 管执行

换句话说：

**Firecracker 和 QEMU 真正不同的，是 VMM 层，而不是 KVM 层。**

---

# 八、如果要从 QEMU 逐步走向“自研 Firecracker 风格 VMM”，应该怎么走？

这是我现在觉得最靠谱的一条工程路线。

---

## 第一步：把外部体验先做稳

在你真正替换 backend 之前，先把这些做稳：

- 配置文件
- 启动命令
- 环境诊断
- 日志
- 运行时目录
- 错误提示

比如我们后来补了：

- ​`doctor`
- ​`minivm.toml`
- 交互式 `init` 向导
- backend abstraction

这类改动表面看和 KVM 没关系，但其实非常关键。  
因为它们决定了你以后调试新 backend 时，外部世界是不是稳定的。

---

## 第二步：把 backend seam 抽出来

如果 `launcher` 直接依赖 QEMU 命令行，那后面会很难换。

所以需要有一个明确的 backend 边界：

- launcher 管 orchestration
- backend 管 guest runtime

这样之后：

- ​`qemu` backend 继续可用
- ​`kvm` backend 可以逐步补

---

## 第三步：做 boot-only KVM backend

真正自研 VMM 的第一步，不应该是网络。  
而应该是：

**只让 guest kernel 跑起来，并且能输出串口。**

因为一旦串口稳定，你就有了最基础的调试手段。

目标应该是：

- 创建 VM
- 分配内存
- 创建 1 个 vCPU
- 加载 kernel/initramfs
- guest 串口打印
- guest halt

---

## 第四步：再接 virtio-net

等 boot 和串口稳定后，再做网络。

这样你只是在已有可观测 boot path 上增加一个设备，而不是同时调试整个世界。

---

# 九、我对 Firecracker 最大的理解转变

以前我总以为：

> “Firecracker 是一个特别厉害的虚拟机软件。”

后来我才意识到，这个理解太模糊了。

更准确的理解应该是：

**Firecracker 不是在发明新的 CPU 虚拟化原理，它是在 KVM 之上做了一次非常克制、非常工程化的 VMM 裁剪。**

它厉害的地方在于：

- 知道什么必须有
- 知道什么可以砍
- 知道什么必须延后
- 知道如何用多层隔离把风险压低
- 知道如何把启动路径缩短到适合云场景

所以如果你自己也想做一个 mini Firecracker，真正重要的不只是“会不会调 KVM ioctl”，而是：

**你有没有能力把问题拆成一条最短闭环。**

---

# 十、结语

如果把这篇文章压缩成一句话，那就是：

**KVM 解决的是“guest 怎么高效运行”，QEMU 和 Firecracker 解决的是“guest 作为一台机器怎么存在”。**

而 Firecracker 的核心价值，不在于“替代 KVM”，而在于：

**在 KVM 之上，把 VMM 做到了极简、快速、可控、安全。**

对我来说，真正的收获不是背下了这些名词，而是终于看清了这条演进路线：

1. 先用 QEMU + KVM 跑通业务闭环
2. 再抽出 backend 边界
3. 再逐步替换成自研 KVM boot path
4. 最后才是 virtio-net、快照、安全隔离这些更复杂的能力
