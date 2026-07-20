---
title: About Agent Infra
slug: about-agent-infra-1rfneb
url: /post/about-agent-infra-1rfneb.html
date: '2026-07-16 17:39:40+08:00'
lastmod: '2026-07-20 20:45:06+08:00'
toc: true
isCJKLanguage: true
---



# About Agent Infra

Agent 非常火热, 当然到 2026 年最火热的还是在 Coding 领域, 程序员们都爱他

在其他的领域呢?

OpenAI 在自己的发布会上特别邀请了一个日本的农民, 用 Codex做农业自动化(WTF)

Codex 本身也在不断地说: "Not Only Coding"

当然了, Claude也在做类似的叙事, 这当然没有什么问题

# Code Change World

我第一次感受到代码的魅力是在小学玩赛尔号, 我的亲戚教我开挂, 我想: "这太屌了", 高考报志愿的时候, 我拿自己不太高的分数, 所有的志愿全部都是计算机. 这就是我的梦想的起点了

在 2026 年, 手机已经是一种默认设备. 手机上跑的所有的 app 和他背后的 Server 已经事实上成为人们沟通交互的基础设施了

构建这一切的是自动化, 是代码, 它在用一种沉默但是暴力的方式改变这个世界

我当然会认为 Smart Phone 会转变为 Intelligence Phone (IPhone?), 实际上我认为人类不需要 100个 APP, 因为将来的 Agent 不需要 100 个 APP

代码在改变世界, 而且会更加粗暴的改变这个世界

# Agent Infra

当我谈及这个巨大的命题时, 我非常的恐惧, 但是有些话又不得不说

### Why?

因为For Human 的 Infra 对 AI/Agent 实在是太不友好, GUI / Doc / Comment / IM ....

而且 For Agent 的 Infra 又实在太过于简陋: MCP, Agent Loop ...

各个 SaaS 服务的 MCP 写的又非常的烂, 我非常不喜欢现状, 为了让Agent 帮我完成一些工作, 我要配置 N 个 MCP, 或者做 N 个集成, 在 codex 里面是一套, 在 Claude 里又是一套,这种体验非常割裂: 一方面是强大的智能, 另一方面是我们把它关进了只有狭窄窗户的小黑屋

在前段时间, 给公司内做分享的时候, 有些同事问题, 既然 Agent 这么强大, 那么现在 Agent 遇到的最大的问题是什么?

我当时的回答是 Agent Infra, 也就是为 Agent 设计和构造的基础设施

### What?

我认为 Agent Infra 应该包含以下:

1. Agent Management: 对 Agent 的管理
2. Context Management: 对于 Context 的管理
3. Tools Management: 对于工具的管理
4. Environment Management: 对于环境的管理

让我解释一下, 为什么 Agent Infra需要包含这四层

首先我们不妨先分析一下现在的 Agent 使用的问题是什么?

1. Agent 之间的通信问题, 这里指的是跨 Agent 的通信, 比如 Codex 和 Claude 的协同
2. Context 之间缺少联系, 你当然可以使用各种 memory 的方案, 但这些方案还是没有解决 Context 的集中管理和更新
3. Tools 十分分散, 你的工具会散落在 10 个不同的服务: 飞书 微信 Coding Memory ... 不同的 Agent 之间无法使用共同的工具
4. Agent 很难触达不同的环境: 在你电脑中运行的 Claude 总是很难管理你的手机, 服务器, pod ...

### How?

HTTP 已经给出了几乎完美的方案, 把一切都抽象为"资源", 剩下的就是对资源的"操作"

也就是 Domain + Path + Method + Payload

好了, 问题已经解决掉了

Agent: /Agent/*

Context: /Context/*

Tools: /Tools/*

Environment: /Device/*

如果你没有听懂, 没有关系:

1. [watt](https://github.com/TokenRollAI/Watt)
2. [tool-bridge](https://github.com/tokenRollAI/tool-bridge)

这就是我的答案, 复用成熟的通信协议, 在应用层上下功夫.

# 参考

### Codex 在其他领域的使用

|领域|描述|链接|
| ---------------------| ------------------------------------------------------------------------------------------------------------------------------------------| -------|
|知识工作/办公产出|用 Codex 创建报告、电子表格、演示文稿、合同，并做研究、数据分析、流程自动化和轻量工具构建。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-knowledge-work/?utm_source=openai))|
|非技术团队运营|OpenAI 内部非技术团队用 Codex 构建内部应用、准备高管材料、创建仪表板，把创意 brief 转成符合品牌/设计约束的成果。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|复盘与事件响应|Zapier 团队用 Codex 从 Slack、Google Docs、Coda 中提取上下文，生成复盘报告、事件响应计划和功能工单。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|数据分析/BI|数据分析插件帮助分析师和业务团队探索产品/业务数据、解释指标变化、创建报告和仪表板。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|营销与创意生产|创意制作插件把营销 brief 转成活动看板、广告变体、产品生活方式图和电商图片集。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|销售/客户管理|销售插件帮助团队识别高优先级客户和信号、准备客户会议、跟进、更新 CRM、制定成交计划、审查风险交易。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|产品设计/原型|产品设计插件把早期想法转成可评审原型，支持用户流程审查、从实时 URL 做原型、把静态截图变成交互式体验。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|投资/金融服务|公开股票投资插件用于审阅财报、比较公司、跟踪市场信号、评估投资论点；投行插件用于准备 pitch、分析可比公司/交易、把尽调转成建议。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|法务/财务/招聘|OpenAI 报告称 Codex 已成为内部所有部门的主要 AI 工具，法务、财务、招聘也在 2026 年 4 月左右转向以 Codex 为主。|([openai.com](https://openai.com/zh-Hans-CN/index/how-agents-are-transforming-work/?utm_source=openai))|
|交互式站点/决策工具|Codex Sites 可把想法、分析、计划转成可分享的交互式网站或应用，例如客户评审页、财务情景规划器、产品发布中心。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/))|
|科研/实验工作流|NVIDIA 研究人员用 Codex 加速实验工作流；OpenAI Academy 也展示了研究员用 Codex 把假设转成交互式可视化和 dashboard。|([openai.com](https://openai.com/zh-Hans-CN/index/codex-for-every-role-tool-workflow/)) ([academy.openai.com](https://academy.openai.com/en/public/blogs/from-hypothesis-to-dashboard-in-an-hour))|
|天体物理/科学发现|University of Arizona 的 CK Chan 用 Codex 寻找数值算法和坐标变换，帮助黑洞等离子体模拟提速，并把更多精力放回科学问题本身。|([openai.com](https://openai.com/index/creating-new-simulations-black-holes/))|
|日常工作自动化|OpenAI Academy 给出的例子包括每日工作简报、周报、幻灯片草稿、文件清理、表格合并、月结财务复盘、发布 campaign kit、流程审计与自动化规格。|([openai.com](https://openai.com/academy/how-to-use-codex-for-everyday-work/))|

### Claude 在其他领域对 AI 的使用

|领域|描述|链接|
| -------------------------| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------|
|小企业运营|Claude for Small Business 接入 QuickBooks、PayPal、HubSpot、Canva、DocuSign、Google Workspace、Microsoft 365，用于发票追收、月结、薪资规划、营销活动、合同审阅、销售线索分级等。|[Anthropic News](https://www.anthropic.com/news/claude-for-small-business)|
|团队协作/Slack 工作代理|Claude Tag 让团队在 Slack 里直接 @Claude，处理产品指标、支持工单、跨工具上下文整理、异步任务跟进。|[Anthropic News](https://www.anthropic.com/news/introducing-claude-tag)|
|教育/K-12 教师|Claude for Teachers 为美国 K-12 教师提供教学技能库和课程标准映射；ClassDojo 用 Claude 做教学助手，节省备课、干预方案和行政录入时间。|[Claude for Teachers](https://www.anthropic.com/news/claude-for-teachers),[ClassDojo](https://www.anthropic.com/customers/classdojo)|
|高等教育/学生学习|Anthropic 教育报告显示，学生主要用 Claude 创建/改进学习材料、总结资料、编辑文章、做数据分析、研究设计、翻译校对等。|[Education Report](https://www.anthropic.com/news/anthropic-education-report-how-university-students-use-claude)|
|知识工作/金融与法律分析|Hebbia 用 Claude 帮资产管理、投行、律所分析大量复杂文档，提取洞察，服务高强度知识工作。|[Hebbia](https://www.anthropic.com/customers/hebbia)|
|法律服务|Law&Company 用 Claude 驱动韩国 AI 法律助手 SuperLawyer，支持法律研究、文书准备、韩文法律写作。|[Law&Company](https://www.anthropic.com/customers/law-and-company)|
|税务与专业服务|Thomson Reuters 在 CoCounsel 中使用 Claude，支持法律和税务专家综合知识、处理合同与税务文件；KPMG 将 Claude 嵌入审计、税务、法律、咨询业务。|[Thomson Reuters](https://www.anthropic.com/customers/thomson-reuters),[KPMG](https://www.anthropic.com/news/anthropic-kpmg)|
|客户支持|Intercom、Gradient Labs、Assembled 等用 Claude 自动解决客户问题、执行 SOP、降低升级量，同时保持品牌语气和合规边界。|[Intercom](https://www.anthropic.com/customers/intercom),[Gradient Labs](https://www.anthropic.com/customers/gradient-labs)|
|金融风控/反欺诈|Inscribe 用 Claude 做欺诈检测、文档验证、KYC/KYB、风险分析，把人工审查时间从几十分钟压到约 90 秒级。|[Inscribe](https://www.anthropic.com/customers/inscribe)|
|保险|Newfront 用 Claude 做员工福利问答、保险文档处理、合同审阅，降低人工文档处理成本，并给 HR/法务提供即时支持。|[Newfront](https://www.anthropic.com/customers/newfront)|
|生命科学/合规文档|Bluenote 用 Claude 构建生命科学 agent，生成监管和科学文档、处理协议、检查合规缺口，让科研人员减少文书负担。|[Bluenote](https://www.anthropic.com/customers/bluenote)|
|会计/财务运营|Campfire 用 Claude 自动化月结、银行对账、财务报表和自然语言财务查询，缩短客户关账时间。|[Campfire](https://www.anthropic.com/customers/campfire)|
|市场/创意/品牌策略|TRY 用 Claude Enterprise 减少例行任务、加速提案开发，覆盖创意、策略、市场和内部 agent 场景。|[TRY](https://www.anthropic.com/customers/try)|
|招聘/人才管理|Braintrust 用 Claude 生成岗位描述、做候选人筛选和 AI 面试，提升招聘吞吐与候选人匹配质量。|[Braintrust](https://www.anthropic.com/customers/braintrust)|
|公共部门/政府|Anthropic 官方写到 Claude 可用于政府文档审查与准备、公民服务、政策分析、培训场景；Claude Gov 面向美国国家安全客户。|[Government Access](https://www.anthropic.com/news/expanding-access-to-claude-for-government),[Claude Gov](https://www.anthropic.com/news/claude-gov-models-for-u-s-national-security-customers)|
