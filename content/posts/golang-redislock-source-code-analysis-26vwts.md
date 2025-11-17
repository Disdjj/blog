---
title: 'Golang: Redislock源码分析'
slug: golang-redislock-source-code-analysis-26vwts
url: /post/golang-redislock-source-code-analysis-26vwts.html
date: '2024-03-23 14:19:53+08:00'
lastmod: '2025-11-17 22:56:53+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "Redis", "分布式锁", "源码分析", "Lua"]
---



# Golang: Redislock源码分析

# 源码

[https://github.com/bsm/redislock](https://github.com/bsm/redislock)

# 实现

## Lua脚本

### obtain.lua

```lua
-- obtain.lua: arguments => [value, tokenLen, ttl]
-- Obtain.lua try to set provided keys's with value and ttl if they do not exists.
-- Keys can be overriden if they already exists and the correct value+tokenLen is provided. 

-- 设置过期时间
local function pexpire(ttl) 
	-- Update keys ttls.
	for _, key in ipairs(KEYS) do
		redis.call("pexpire", key, ttl)
	end
end

-- canOverrideLock check either or not the provided token match
-- previously set lock's tokens.
-- 判断某个Key是否已经被占用了, 如果是自己占用的, 那么则可以尝试覆盖
local function canOverrideKeys() 
	local offset = tonumber(ARGV[2])

	for _, key in ipairs(KEYS) do
		if redis.call("getrange", key, 0, offset-1) ~= string.sub(ARGV[1], 1, offset) then
			return false
		end
	end
	return true
end

-- Prepare mset arguments.
local setArgs = {}
for _, key in ipairs(KEYS) do
	table.insert(setArgs, key)
	table.insert(setArgs, ARGV[1])
end

-- 尝试范围性的使用setnx , 如果有值已经存在, 则尝试覆盖, 如果没法覆盖, 则失败.
if redis.call("msetnx", unpack(setArgs)) ~= 1 then
	if canOverrideKeys() == false then
		return false
	end
	redis.call("mset", unpack(setArgs))
end

pexpire(ARGV[3])
return redis.status_reply("OK")
```

### refresh.lua

```lua
-- refresh.lua: => Arguments: [value, ttl]
-- refresh.lua refreshes provided keys's ttls if all their values match the input. 

-- Check all keys values matches provided input.
-- 检查是否拥有以上锁的权限
local values = redis.call("mget", unpack(KEYS))
for i, _ in ipairs(KEYS) do
	if values[i] ~= ARGV[1] then
		return false
	end
end

-- 如果有, 则刷新keys的ttl
for _, key in ipairs(KEYS) do
	redis.call("pexpire", key, ARGV[2]) 
end

return redis.status_reply("OK")
```

### release.lua

```lua
-- release.lua: => Arguments: [value]
-- Release.lua deletes provided keys if all their values match the input. 

-- Check all keys values matches provided input.
-- 检查是否拥有以上锁的权限, 如果没有所有的权限, 则取消
local values = redis.call("mget", unpack(KEYS))
for i, _ in ipairs(KEYS) do
	if values[i] ~= ARGV[1] then
		return false
	end
end
-- 删除所有的可以
-- Delete keys.
redis.call("del", unpack(KEYS))

return redis.status_reply("OK")
```

### pttl.lua

```lua
-- pttl.lua: => Arguments: [value]
-- pttl.lua returns provided keys's ttls if all their values match the input. 

-- Check all keys values matches provided input.
-- 检查是否拥有以上锁的权限, 如果没有所有的权限, 则取消
local values = redis.call("mget", unpack(KEYS))
for i, _ in ipairs(KEYS) do
	if values[i] ~= ARGV[1] then
		return false
	end
end

-- 返回所有key的最短ttl
local minTTL = 0
for _, key in ipairs(KEYS) do
	local ttl = redis.call("pttl", key)
	-- Note: ttl < 0 probably means the key no longer exists.
	if ttl > 0 and (minTTL == 0 or ttl < minTTL) then
		minTTL = ttl
	end
end
return minTTL
```

## Golang实现

### 引入lua脚本

在Reids中, 可以直接运行lua脚本

在实现中, 脚本的引入通过 `//go:embed {filename}`可以非常方便的实现

### 基本结构

#### Client​

```go
type Client struct {
	client RedisClient
	tmp    []byte
	tmpMu  sync.Mutex
}
```

这里的设计很蠢, tmp是用来获取一个随机的token的, 按理说这个token作为校验应该和lock绑定, 但是绑定在了client上, 这部分没有任何阅读的必要.

#### Lock

```go
type Lock struct {
	*Client
	keys     []string
	value    string
	tokenLen int
}
```

需要稍微注意下的是`tokenLen`, 因为实际的Key对应的Value是Token + Metadata, 所以在校验的时候不能直接获取value判断而是前缀判断.

​`metadata`可以设置一些和服务实例相关的信息, 这部分的设计还有有考虑的.

### 获取锁

1. 生成一个Token, 作为标识符, 添加metadata信息, 辅助后期debug
2. 设置ttl, 重试策略

    - 最大重试次数

    - 指数退避算法[^1]

    - 间隔重试, 直至成功
3. 检查是否已经设置了最大超时时间, 如果没有设置, 默认使用ttl作为超时时间
4. 不断尝试获取锁, 如果没有获取, 根据重试策略直接进行重试, 或超时返回

### 获取TTL

使用[pttl.lua](#20240323144506-1a5uoa1)进行最小ttl的获取

### 刷新TTL

使用[refresh.lua](#20240323144223-ho8zdja)更新所有的key的ttl

### 释放

调用[release.lua](#20240323144343-m3u4kbe)删除所有占用的key

## 注意

Redis: msetnx[^2]

> 当且仅当给定的所有键都不存在时, 为所有的键设定值
>
> 只要有一个键存在, 则拒绝所有操作, 并返回 0
>
> 即: 要么全部设置, 要么全部不设置
>
> 即: 要么全部设置, 要么全部不设置

# 总结

lua代码的设计还稍微值得学习看看

Go代码没有什么特别值得学习的地方, 如果能够提供一个`watch-dog`的方式, 可能会更好一些, 现在的使用没有特别方便.

[^1]: # 指数退避算法

    # 指数退避算法

    > 在查看Ants的源码时, 发现了一个关于自旋锁 spinlock的一个操作, 就此引入指数退避算法以及相关的实现.
    > 互斥锁/自旋锁
    >

    # 示例代码

    ```go
    func (sl *spinLock) Lock() {
      backoff := 1
      for !atomic.CompareAndSwapUint32((*uint32)(sl), 0, 1) {
        // Leverage the exponential backoff algorithm, see https://en.wikipedia.org/wiki/Exponential_backoff.
        for i := 0; i < backoff; i++ {
          runtime.Gosched()
        }
        if backoff < maxBackoff {
          backoff <<= 1
        }
      }
    }
    ```
    # 解释

    1. 第3行, 尝试CAS获得锁, 如果获取成功, 直接返回
    2. 如果获取失败, 尝试等待 n 个时间片
    3. backOff << 1 , 重新尝试获取

    # 重点

    需要重点关注的是backOff的值, 会指数递增, 从 1 > 2 > 4 > 8 > 16 > ... 

    随着尝试次数的增加, 等待时间也会增长, 这就是指数递增.

    # 参考文档

    [   https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn](https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn "   https://cloud.google.com/memorystore/docs/redis/exponential-backoff?hl=zh-cn")


[^2]: # Redis: msetnx

    当且仅当给定的所有键都不存在时, 为所有的键设定值

    只要有一个键存在, 则拒绝所有操作, 并返回 0

    即: 要么全部设置, 要么全部不设置

    即: 要么全部设置, 要么全部不设置
