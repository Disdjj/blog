---
title: 'go: embed'
slug: go-embed-7g7du
url: /post/go-embed-7g7du.html
date: '2024-03-23 00:18:32+08:00'
lastmod: '2025-11-17 22:56:48+08:00'
toc: true
isCJKLanguage: true
tags: ["Go", "embed", "编程"]
---



# go: embed

​`go:embed` 是 Go 语言在其 1.16 版本中引入的一个新功能，它允许开发者在编译时将文件或文件夹嵌入到 Go 程序中。这样做可以简化资源文件的分发，因为它们会被编译到可执行文件里，避免了在运行时需要处理文件路径和分发额外文件的问题。

要使用 `go:embed`，你需要做以下几步：

1. 导入 `embed` 包。
2. 使用 `//go:embed` 指令来标记要嵌入的文件或文件夹。
3. 声明一个变量来接收嵌入的内容，类型可以是 `string`​、`[]byte`​ 或 `embed.FS`（用于目录或多个文件）。

下面是一个使用 `go:embed` 的示例：

```go
package main

import (
    "embed"
    "io/fs"
    "io/ioutil"
    "log"
    "net/http"
)

//go:embed version.txt
var version string

//go:embed config.json
var config []byte

//go:embed static
var staticFiles embed.FS

func main() {
    // 使用嵌入的字符串
    log.Println("Version:", version)

    // 使用嵌入的字节切片
    configContents, err := ioutil.ReadAll(fs.FS(config))
    if err != nil {
        log.Fatal(err)
    }
    log.Println("Config:", string(configContents))

    // 使用嵌入的文件系统
    http.Handle("/", http.FileServer(http.FS(staticFiles)))
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

在上面的代码中：

- ​`version.txt`​ 文件的内容会被嵌入到 `version`​ 变量中，类型为 `string`。
- ​`config.json`​ 文件的内容会被嵌入到 `config`​ 变量中，类型为 `[]byte`。
- ​`static`​ 目录及其内容会被嵌入到 `staticFiles`​ 变量中，类型为 `embed.FS`。

请注意，使用 `go:embed`​ 的文件或目录必须在同一个包中。此外，`go:embed`​ 只能用于全局变量，且这些变量不能是导出的（即变量名不能以大写字母开头），除非它们是用来嵌入的类型（`string`​、`[]byte`​、`embed.FS`）。

在运行 `go build` 编译程序时，Go 编译器会处理这些指令，并将指定的文件或目录内容嵌入到最终的可执行文件中。
