---
title: 常用Hash函数速度比较
slug: common-hat-function-speed-comparison-1bruzn
url: /post/common-hat-function-speed-comparison-1bruzn.html
date: '2024-04-02 18:55:55+08:00'
lastmod: '2025-11-17 22:57:49+08:00'
toc: true
isCJKLanguage: true
tags: ["哈希", "性能", "算法", "Go"]
---



# 常用Hash函数速度比较

# 结论

> 常见的这些Hash函数, 没有数量级上的差别, 当然这只是针对在长度为20000以内的字符串所得出的结论.
>
> 如果是对文件进行摘要, 请还是使用非可逆的Hash函数, 而不是crc / murmur 这类

1. ​`crc`​的性能非常出色, 但是与`murmur3`的性能没有拉开差距, 由于其内置在标准库中, 因此可以直接使用, 推荐!
2. ​`md5 / sha`在string长度较小的情况下, 性能表现并不差, 如果对于可逆性有一定追求, 并且追求可能得更好的敛散性, 可以使用.
3. ​`sha3-512 `​的性能约为`crc`​的8倍, 如果调用频率较高时, 请注意可能会带来较高的**CPU耗时**.

测试脚本见文末.

# Len(Key) = 20

```go
goos: windows
goarch: amd64
pkg: hash_compare
cpu: 12th Gen Intel(R) Core(TM) i7-12700K
BenchmarkMD5
BenchmarkMD5-19                  8822782               135.7 ns/op
BenchmarkSHA1
BenchmarkSHA1-19                 8182909               145.1 ns/op
BenchmarkSHA256
BenchmarkSHA256-19              10178547               116.2 ns/op
BenchmarkSHA512
BenchmarkSHA512-19               4528038               267.6 ns/op
BenchmarkSHA3_256
BenchmarkSHA3_256-19             2184250               556.6 ns/op
BenchmarkSHA3_512
BenchmarkSHA3_512-19             2206112               541.4 ns/op
BenchmarkCRC32
BenchmarkCRC32-19               12400216                99.20 ns/op
BenchmarkCRC64
BenchmarkCRC64-19               15547041                78.54 ns/op
BenchmarkMurmur3_32
BenchmarkMurmur3_32-19          11555438               108.0 ns/op
BenchmarkMurmur3_128
BenchmarkMurmur3_128-19          9971091               115.9 ns/op
```

# Len(Key) = 50

```go
goos: windows
goarch: amd64
pkg: hash_compare
cpu: 12th Gen Intel(R) Core(TM) i7-12700K
BenchmarkMD5
BenchmarkMD5-19                  6289884               192.0 ns/op
BenchmarkSHA1
BenchmarkSHA1-19                 5622404               217.4 ns/op
BenchmarkSHA256
BenchmarkSHA256-19               6940231               174.1 ns/op
BenchmarkSHA512
BenchmarkSHA512-19               3849984               318.2 ns/op
BenchmarkSHA3_256
BenchmarkSHA3_256-19             2014849               593.4 ns/op
BenchmarkSHA3_512
BenchmarkSHA3_512-19             2100302               583.7 ns/op
BenchmarkCRC32
BenchmarkCRC32-19                8180628               147.6 ns/op
BenchmarkCRC64
BenchmarkCRC64-19                6771878               176.4 ns/op
BenchmarkMurmur3_32
BenchmarkMurmur3_32-19           6703288               161.6 ns/op
BenchmarkMurmur3_128
BenchmarkMurmur3_128-19          7424919               165.5 ns/op
```

# Len(Key) = 100

```go
goos: windows
goarch: amd64
pkg: hash_compare
cpu: 12th Gen Intel(R) Core(TM) i7-12700K
BenchmarkMD5
BenchmarkMD5-19                  4070643               295.8 ns/op
BenchmarkSHA1
BenchmarkSHA1-19                 3737098               315.4 ns/op
BenchmarkSHA256
BenchmarkSHA256-19               4678782               259.2 ns/op
BenchmarkSHA512
BenchmarkSHA512-19               3292449               365.5 ns/op
BenchmarkSHA3_256
BenchmarkSHA3_256-19             1956735               619.0 ns/op
BenchmarkSHA3_512
BenchmarkSHA3_512-19             1368730               904.4 ns/op
BenchmarkCRC32
BenchmarkCRC32-19                5888480               199.0 ns/op
BenchmarkCRC64
BenchmarkCRC64-19                6796117               179.5 ns/op
BenchmarkMurmur3_32
BenchmarkMurmur3_32-19           5414822               224.4 ns/op
BenchmarkMurmur3_128
BenchmarkMurmur3_128-19          5682339               217.3 ns/op
```

# Len(Key) = 1000

```go
goos: windows
goarch: amd64
pkg: hash_compare
cpu: 12th Gen Intel(R) Core(TM) i7-12700K
BenchmarkMD5
BenchmarkMD5-19                   534554              2200 ns/op
BenchmarkSHA1
BenchmarkSHA1-19                  623023              1999 ns/op
BenchmarkSHA256
BenchmarkSHA256-19                747392              1586 ns/op
BenchmarkSHA512
BenchmarkSHA512-19                551026              2339 ns/op
BenchmarkSHA3_256
BenchmarkSHA3_256-19              373495              3334 ns/op
BenchmarkSHA3_512
BenchmarkSHA3_512-19              254478              4723 ns/op
BenchmarkCRC32
BenchmarkCRC32-19                1000000              1187 ns/op
BenchmarkCRC64
BenchmarkCRC64-19                 959308              1367 ns/op
BenchmarkMurmur3_32
BenchmarkMurmur3_32-19            839200              1434 ns/op
BenchmarkMurmur3_128
BenchmarkMurmur3_128-19          1000000              1233 ns/op
```

# Len(Key) = 10000

```go
goos: windows
goarch: amd64
pkg: hash_compare
cpu: 12th Gen Intel(R) Core(TM) i7-12700K
BenchmarkMD5
BenchmarkMD5-19                    57900             20013 ns/op
BenchmarkSHA1
BenchmarkSHA1-19                   66994             18038 ns/op
BenchmarkSHA256
BenchmarkSHA256-19                 79039             15403 ns/op
BenchmarkSHA512
BenchmarkSHA512-19                 55267             22265 ns/op
BenchmarkSHA3_256
BenchmarkSHA3_256-19               37862             29851 ns/op
BenchmarkSHA3_512
BenchmarkSHA3_512-19               26913             52982 ns/op
BenchmarkCRC32
BenchmarkCRC32-19                  80836             15127 ns/op
BenchmarkCRC64
BenchmarkCRC64-19                  66034             17882 ns/op
BenchmarkMurmur3_32
BenchmarkMurmur3_32-19             65836             17436 ns/op
BenchmarkMurmur3_128
BenchmarkMurmur3_128-19           105553             13862 ns/op
```

# 测试脚本

## Hash Func

```go
package hash_compare

import (
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"hash/crc32"
	"hash/crc64"

	"github.com/twmb/murmur3"
	"golang.org/x/crypto/sha3"
)

func MD5(hash string) string {
	h := md5.New()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func SHA1(hash string) string {
	h := sha1.New()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func SHA256(hash string) string {
	h := sha256.New()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func SHA512(hash string) string {
	h := sha512.New()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func SHA3_256(hash string) string {
	sha3.New256()
	h := sha3.New256()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func SHA3_512(hash string) string {
	h := sha3.New512()
	h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func Murmur3_32(hash string) string {
	h := murmur3.New32()
	_, _ = h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func Murmur3_128(hash string) string {
	h := murmur3.New128()
	_, _ = h.Write([]byte(hash))
	return string(h.Sum(nil))
}
func CRC32(hash string) string {
	h := crc32.New(crc32.IEEETable)
	_, _ = h.Write([]byte(hash))
	return string(h.Sum(nil))
}

func CRC64(hash string) string {
	h := crc64.New(crc64.MakeTable(crc64.ISO))
	_, _ = h.Write([]byte(hash))
	return string(h.Sum(nil))
}

```

## Bench Script

```go
package hash_compare

import "testing"

var length = 10000

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}

func BenchmarkMD5(b *testing.B) {
	for i := 0; i < b.N; i++ {
		MD5(randomString(length))
	}
}

func BenchmarkSHA1(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SHA1(randomString(length))
	}
}

func BenchmarkSHA256(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SHA256(randomString(length))
	}
}

func BenchmarkSHA512(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SHA512(randomString(length))
	}
}

func BenchmarkSHA3_256(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SHA3_256(randomString(length))
	}
}

func BenchmarkSHA3_512(b *testing.B) {
	for i := 0; i < b.N; i++ {
		SHA3_512(randomString(length))
	}
}

func BenchmarkCRC32(b *testing.B) {
	for i := 0; i < b.N; i++ {
		CRC32(randomString(length))
	}
}

func BenchmarkCRC64(b *testing.B) {
	for i := 0; i < b.N; i++ {
		CRC64(randomString(length))
	}
}

func BenchmarkMurmur3_32(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Murmur3_32(randomString(length))
	}
}

func BenchmarkMurmur3_128(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Murmur3_128(randomString(length))
	}
}

```
