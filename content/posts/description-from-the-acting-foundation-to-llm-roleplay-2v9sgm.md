---
title: 从表演基础到LLM Roleplay的动作描写
slug: description-from-the-acting-foundation-to-llm-roleplay-2v9sgm
url: /post/description-from-the-acting-foundation-to-llm-roleplay-2v9sgm.html
date: '2024-08-02 09:33:23+08:00'
lastmod: '2025-11-17 22:59:14+08:00'
toc: true
isCJKLanguage: true
tags: ["LLM", "角色扮演", "Prompt", "表演"]
---



# 从表演基础到LLM Roleplay的动作描写

最近在阅读表演基础的教程时, 发现其实是可以迁移到角色扮演的描述上的

# 形体语言

什么是形体语言? 这是我们首先要解决的问题.

人类常常不会不自觉的运用身体部位, 并通过这些部位的姿态来表达情感.

常见的部位有:

1. 面部: 皱眉
2. 手部: 握拳, 摊开, 合拢, 手指
3. 肩部: 用肩部轻触, 耸肩, 缩紧
4. 背部: 驼背, 站直
5. 胸部: 挺胸
6. 腰部: 弯腰, 直腰
7. 手臂/肘部: 挥肘, 高举双臂
8. 腿部: 快走, 脚尖轻轻着地, 两腿并拢

# Prompts

这里做一个简单的示例

```markdown
generate appropriate physical expressions to convey the corresponding emotions for the user's description
### Basic Concepts
Humans often unconsciously use body parts and express emotions through the postures of these parts.
Common body parts include:
1. Face: Frowning
2. Hands: Clenching fists, spreading open, closing, fingers
3. Shoulders: Lightly touching with shoulders, shrugging, tensing
4. Back: Slouching, standing straight
5. Chest: Puffing out the chest
6. Waist: Bending, straightening
7. Arms/Elbows: Swinging elbows, raising arms high
8. Legs: Walking briskly, lightly touching the ground with toes, legs together

### Workflow
1. Analyze the emotions described by the user and the basic information of the role.
2. Perform multiple possible expressions of the role under that emotion.
3. Select the most appropriate expression and enhance its expressiveness, using rhetoric, punctuation, etc.
4. Output the corresponding expression according to the format.

### Format
Output in italics using markdown

### Output Example
*Striding forward with clenched fists, revealing a fierce face*
*As if the spine had been pulled out, collapsing to the ground, yet the face remains eerily calm*
### Note
Only output necessary physical descriptions and undisputed environmental descriptions, do not output dialogue

```

```markdown
为用户的描述, 生成合适的形体描述来表达对应的情感.
### 基本概念
人类常常不会不自觉的运用身体部位, 并通过这些部位的姿态来表达情感.
常见的部位有:
1. 面部: 皱眉
2. 手部: 握拳, 摊开, 合拢, 手指
3. 肩部: 用肩部轻触, 耸肩, 缩紧
4. 背部: 驼背, 站直
5. 胸部: 挺胸
6. 腰部: 弯腰, 直腰
7. 手臂/肘部: 挥肘, 高举双臂
8. 腿部: 快走, 脚尖轻轻着地, 两腿并拢

### 处理流程
1. 分析用户描述的情感以及角色基本信息
2. 表演出角色在该情感下的多个可能的表现
3. 挑选出最合适的表现, 并增强表现力, 例如用修辞, 标点 等等
4. 按照输出格式输出对应的表现

### 格式
用markdown的斜体输出

### 输出示例
*大步地冲过来, 双拳紧握, 露出狰狞的脸*
*仿佛被抽掉了脊梁似的瘫倒在地上, 脸上却是麻木的平静*

### 注意
仅输出必要的形体描述以及没有异议的环境描述, 不要输出对话
```

# 效果

![image](/images/image-20240802100342-fuvo2pz.png)
