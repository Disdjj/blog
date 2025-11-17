---
title: 思源基本配置
slug: basic-configuration-of-siyuan-z1jiyaw
url: /post/basic-configuration-of-siyuan-z1jiyaw.html
date: '2024-03-24 15:02:25+08:00'
lastmod: '2025-11-17 23:02:37+08:00'
toc: true
isCJKLanguage: true
---



# 思源基本配置

[siyuan.css](assets/siyuan-20240331113733-tuabx5m.css)

# 背景颜色

```css
:root[data-theme-mode=dark] {
  --b3-theme-background: #020202;
  --b3-theme-surface: #111111;
  --b3-scroll-color: rgba(169, 62, 218, 0.2);
  /* 文字颜色 */
  --b3-theme-on-primary: #e2e2e2;
  --b3-theme-on-secondary: #e2e2e2;
  --b3-theme-on-background: #F1F1F1;
  --b3-theme-on-surface: #eee;
  --b3-theme-on-surface-light: #fff;
  --b3-theme-on-error: #fff;
}

.protyle-wysiwyg .code-block>.hljs {
  font-size: 1em;
  /* 调整字体大小为1.2em */
}


:root[data-theme-mode=light] {
  /* 文字颜色 */
  --b3-theme-on-primary: #000;
  --b3-theme-on-secondary: #000;
  --b3-theme-on-background: #000;
  --b3-theme-on-surface: #000;
  --b3-theme-on-surface-light: #000;
  --b3-theme-on-error: #000;


}
```

# 横向菜单

```css
/* '/'弹出分栏*/
.hint--menu{
	animation: menu 0.2s ease-in-out;
	box-shadow: var(--b3-menu-shadow);
    background-color: var(--b3-theme-background);
	padding:5px;
	border:none;
	min-width: 50vw;
	border-radius: 6px;
}
.hint--menu>div{
	columns: 50px 4;
	column-rule:1px outset var(--b3-border-color);
	/*column-fill:auto;
	max-height: 402px !important;*/
}
.hint--menu .b3-list-item{
	margin:0!important;
	width:100%!important;
}
.hint--menu .b3-list-item__text{
	margin:0 0 0 8px;
	color:var(--b3-theme-on-background);
}
.hint--menu .b3-list-item__graphic,.hint--menu .color__square {
	margin:0px;
	width:10px;
	height:12px;
	border:1px solid var(--b3-border-color);
	padding: 2px 3px;
    border-radius: 3px;
	box-shadow:none;
}
.hint--menu>.b3-list-item--two{
	margin:0;
}
@media screen and (min-width: 1280px){
	.hint--menu .b3-list-item--two{
	width:calc(25% - 5px);
}
	.hint--menu{
	max-height: 412px !important;
	}
}
@media screen and (max-width: 1280px) {
	.hint--menu>div{
	columns:unset;
}
	.hint--menu{
	columns:unset;
	min-width: unset !important;
}
}
.protyle-hint.hint--menu:has(>.emojis) {
    min-width: 372px;
    width: 372px !important;
}
.protyle-hint.hint--menu>.emojis {
    column-span: all;
    width: 360px!important;
}

/*滚动条*/
::-webkit-scrollbar {
    width : var(--webkit-scrollbar);
	height: var(--webkit-scrollbar);
	background-color:var(--b3-scroll-bgcolor);
}
::-webkit-scrollbar-thumb:hover{
    background-color:var(--b3-scroll-color-hover);
}
::-webkit-scrollbar-thumb{
	border-radius: var(--webkit-scrollbar-thumb);
	background-color:var(--b3-scroll-color);
}

.b3-slider::-webkit-slider-runnable-track {
    height: 3px;
}
.b3-slider::-webkit-slider-thumb {
	transform:unset !important;
    width: 7px;
    height: 7px;
	margin-top: -2px;
    background-color: var(--b3-theme-background);
	box-shadow: 0px 0px 0px 3px var(--b3-theme-primary) ;
}
.b3-slider::-webkit-slider-thumb:hover{
	box-shadow:0px 0px 0px 3px var(--b3-theme-primary),0px 0px 0px 5px var(--b3-theme-primary-lighter);
	transition:all 500ms;
}
```

# 选中页签

```css
.layout-tab-bar .item.item--focus {
  /* 被选中的页签项 */
  background-color: rgb(36, 100, 174);
  border-color: black;
  border-bottom-color: var(--custom-striking-color);
}
```

# 引用

```css
:root {
  --custom-quote-l: "⸢";
  --custom-quote-r: "⸥";
  --custom-ref-l: var(--custom-quote-l);
  --custom-ref-r: var(--custom-quote-r);
  /* 块引用动态锚文本标记符号 | Block references dynamic anchor text mark symbol */
  --custom-ref-mark-d-l: var(--custom-quote-l);
  --custom-ref-mark-d-r: var(--custom-quote-r);
  /* 块引用静态锚文本标记符号 | Block references static anchor text mark symbol */
  --custom-ref-mark-s-l: var(--custom-quote-l);
  --custom-ref-mark-s-r: var(--custom-quote-r);
  /* 块引用标记颜色 | Block reference mark color */
  --custom-ref-mark-color: orange;
  --custom-ref-mark-d-l-color: var(--custom-ref-mark-color);
  --custom-ref-mark-s-l-color: var(--custom-ref-mark-color);
  --custom-ref-mark-d-r-color: var(--custom-ref-mark-color);
  --custom-ref-mark-s-r-color: var(--custom-ref-mark-color);
  /* 块引用标记宽度 | Block reference mark width */
  --custom-ref-mark-width: 0.5em;
  --custom-ref-mark-d-l-width: var(--custom-ref-mark-width);
  --custom-ref-mark-s-l-width: var(--custom-ref-mark-width);
  --custom-ref-mark-d-r-width: var(--custom-ref-mark-width);
  --custom-ref-mark-s-r-width: var(--custom-ref-mark-width);

  --custom-span-block-ref-color: orange;
}

/* 块引用 */
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext),
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext),
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext) {
  color: var(--custom-span-block-ref-color);
}

#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext::before,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext::before,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::before,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::before,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext::after,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext::after,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::after,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)::after {
  font-weight: bold;
  display: inline-block;
  text-align: center;
}

#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::before,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::before,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::before,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::before {
  /* 左侧-动态锚文本 */
  content: var(--custom-ref-mark-d-l);
  color: var(--custom-ref-mark-d-l-color);
  width: var(--custom-ref-mark-d-l-width);
}

#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::after,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=d]::after,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::after,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=d]::after {
  /* 右侧-动态锚文本 */
  content: var(--custom-ref-mark-d-r);
  color: var(--custom-ref-mark-d-r-color);
  width: var(--custom-ref-mark-d-r-width);
}

#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::before,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::before,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::before,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::before,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::before {
  /* 左侧-静态锚文本 */
  content: var(--custom-ref-mark-s-l);
  color: var(--custom-ref-mark-s-l-color);
  width: var(--custom-ref-mark-s-l-width);
}

#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::after,
.sy__outline [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref].av__celltext[data-subtype=s]::after,
#sidebar [data-type="sidebar-outline"] [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::after,
.sy__outline [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::after,
.protyle-wysiwyg [data-node-id] span[data-type~=block-ref]:not(.av__celltext)[data-subtype=s]::after {
  /* 右侧-静态锚文本 */
  content: var(--custom-ref-mark-s-r);
  color: var(--custom-ref-mark-s-r-color);
  width: var(--custom-ref-mark-s-r-width);
}
```

# 边缘

```css
:root {
    --b3-theme-primary: #5b68ff;
    --card-color: var(--b3-toolbar-background);
    --border-is: 1px solid rgb(66, 66, 66);
    --line-col: block;
}

/* 标签页头 */
.fn__flex.layout-tab-bar [data-type="tab-header"] {
    border: var(--border-is);
}

/* 顶部工具栏和底部状态栏 */
#status {
    border-bottom: none;
    /* 移除下边框 */
    border-top: var(--border-is);
    /* 左边框样式 */
    border-right: var(--border-is);
    /* 右边框样式 */
    border-left: var(--border-is);
    /* 下边框样式 */
}



/* 菜单 */
.b3-menu,
.b3-menu__submenu {
    border: var(--border-is);
}

/* 菜单项 */
/* .b3-menu__item {
    border: var(--border-is);
} */

/* 文档树与标签页 */
.layout-tab-container.fn__flex-1 {
    border: var(--border-is);
}

/* 标签页头空余 */
/* .layout-tab-bar.layout-tab-bar--readonly.fn__flex-1 {
    border-radius: 10px;
    margin: 1px;
    box-shadow: 0 0 14px rgba(0, 0, 0, 0.2);
} */

/* 对话框（设置） */
.b3-dialog__body {
    border: var(--border-is);
}


.b3-menu .b3-menu__item:first-child {
    border-top-left-radius: var(--b3-border-radius-b);
    border-top-right-radius: var(--b3-border-radius-b);
}

.b3-menu .b3-menu__item:last-child {
    border-bottom-left-radius: var(--b3-border-radius-b);
    border-bottom-right-radius: var(--b3-border-radius-b)
}
```

# 段落块边界

```css
/* ------------------------ 段落块 ------------------------ */
:root {
  --custom-border-line-color: #666666;
}

.protyle-wysiwyg [data-node-id].p {
  padding-bottom: 0px;
  border-bottom: 1px dashed var(--custom-border-line-color);
}

.protyle-wysiwyg [data-node-id].p:hover {
  border-radius: var(--custom-border-line-color);
}

.protyle-wysiwyg [data-node-id] [spellcheck][contenteditable]:empty:before {
  content: "";
  color: var(--custom-border-line-color);
}

.b3-typography p {
  padding-bottom: 0px;
}

.b3-typography p:hover {
  border-radius: var(--custom-border-line-color);
}
```

# 代码tag位置

```css
.b3-typography .code-block .protyle-action .protyle-action__language,
.protyle-wysiwyg .code-block .protyle-action .protyle-action__language {
  margin-top: 0;
  position: absolute;
  left: 3.5em; /* 修改这里，从 right 改为 left 并设置适当的值 */
  border-radius: 1px;
  opacity: 1 !important;
}

/* 如果您还需要调整伪元素的位置，也可以在这里进行修改 */
.b3-typography .code-block .protyle-action .protyle-action__language::after,
.protyle-wysiwyg .code-block .protyle-action .protyle-action__language::after {
  content: "›";
  color: rgba(128, 128, 128, 0.502);
  opacity: 1;
}

```

‍

# 自动编号

```css
/* 各级标题 */
/* 👇标题自动编号👇 */
/* body {
    counter-reset: h1-counter 0;
} */

:root {
    --custom-h-num-font-size: 60%;;
}

.protyle-wysiwyg,
.b3-typography {
    counter-reset: h1-counter 0 h2-counter 0 h3-counter 0 h4-counter 0 h5-counter 0 h6-counter 0;
}

.protyle-wysiwyg>[data-node-id].h1,
.protyle-wysiwyg>[data-node-id][fold="1"].h1,
.b3-typography>h1 {
    counter-increment: h1-counter;
    counter-reset: h2-counter 0;
}

.protyle-wysiwyg>[data-node-id].h1::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h1::before,
.b3-typography>h1::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h1,
.b3-typography h1 {
    color: var(--custom-h1-color);
    border-left: 3px solid var(--custom-h1-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h1>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h1-indentation);
}

.protyle-wysiwyg>[data-node-id].h2,
.protyle-wysiwyg>[data-node-id][fold="1"].h2,
.b3-typography>h2 {
    counter-increment: h2-counter;
    counter-reset: h3-counter 0;
}

.protyle-wysiwyg>[data-node-id].h2::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h2::before,
.b3-typography>h2::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "." counter(h2-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h2,
.b3-typography h2 {
    color: var(--custom-h2-color);
    border-left: 3px solid var(--custom-h2-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h2>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h2-indentation);
}

.protyle-wysiwyg>[data-node-id].h3,
.protyle-wysiwyg>[data-node-id][fold="1"].h3,
.b3-typography>h3 {
    counter-increment: h3-counter;
    counter-reset: h4-counter 0;
}

.protyle-wysiwyg>[data-node-id].h3::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h3::before,
.b3-typography>h3::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "." counter(h2-counter) "." counter(h3-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h3,
.b3-typography h3 {
    color: var(--custom-h3-color);
    border-left: 3px solid var(--custom-h3-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h3>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h3-indentation);
}

.protyle-wysiwyg>[data-node-id].h4,
.protyle-wysiwyg>[data-node-id][fold="1"].h4,
.b3-typography>h4 {
    counter-increment: h4-counter;
    counter-reset: h5-counter 0;
}

.protyle-wysiwyg>[data-node-id].h4::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h4::before,
.b3-typography>h4::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "." counter(h2-counter) "." counter(h3-counter) "." counter(h4-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h4,
.b3-typography h4 {
    color: var(--custom-h4-color);
    border-left: 3px solid var(--custom-h4-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h4>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h4-indentation);
}

.protyle-wysiwyg>[data-node-id].h5,
.protyle-wysiwyg>[data-node-id][fold="1"].h5,
.b3-typography>h5 {
    counter-increment: h5-counter;
    counter-reset: h6-counter 0;
}

.protyle-wysiwyg>[data-node-id].h5::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h5::before,
.b3-typography>h5::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "." counter(h2-counter) "." counter(h3-counter) "." counter(h4-counter) "." counter(h5-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h5,
.b3-typography h5 {
    color: var(--custom-h5-color);
    border-left: 3px solid var(--custom-h5-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h5>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h5-indentation);
}

.protyle-wysiwyg>[data-node-id].h6,
.protyle-wysiwyg>[data-node-id][fold="1"].h6,
.b3-typography>h6 {
    counter-increment: h6-counter;
    counter-reset: h7-counter 0;
}

.protyle-wysiwyg>[data-node-id].h6::before,
.protyle-wysiwyg>[data-node-id][fold="1"].h6::before,
.b3-typography>h6::before {
    display: block !important;
    float: left;
    font-size: var(--custom-h-num-font-size);
    content: counter(h1-counter) "." counter(h2-counter) "." counter(h3-counter) "." counter(h4-counter) "." counter(h5-counter) "." counter(h6-counter) "\00A0";
}

.protyle-wysiwyg [data-node-id].h6,
.b3-typography h6 {
    color: var(--custom-h6-color);
    border-left: 3px solid var(--custom-h6-color);
    padding-left: 9px;
    font-weight: var(--custom-h-font-weight);
}

.protyle-wysiwyg>[data-node-id].h6>[contenteditable][spellcheck]:empty {
    padding-left: var(--custom-h6-indentation);
}

/* 👆标题自动编号👆 */
```

# plugin-custom-fonts-style

```css
/* Twemoji Mozilla: https://github.com/mozilla/twemoji-colr */
@font-face {
    font-family: "Twemoji Mozilla";
    font-style: normal;
    src: url("plugins/custom-fonts/static/fonts/Twemoji.Mozilla/Twemoji.Mozilla-0.7.0.ttf");
}


:root {
    --b3-font-family: "LXGW WenKai", "Helvetica Neue", "Luxi Sans", "DejaVu Sans", "Hiragino Sans GB", "Microsoft Yahei", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", "EmojiSymbols";
    --b3-font-family-protyle: "LXGW WenKai";
    --b3-font-family-code: "SauceCodePro Nerd Font Propo", "JetBrainsMono-Regular", "mononoki", "Consolas", "Liberation Mono", "Menlo", "Courier", "monospace", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Segoe UI Symbol", "Android Emoji", "EmojiSymbols";
    --b3-font-family-graph: "mononoki";
    --b3-font-family-math: "KaTeX_Math", "KaTeX_Main";
    --b3-font-family-emoji: "Twemoji Mozilla", "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Noto Color Emoji", "Android Emoji";
}
```

‍

# markdown

```css
.b3-typography blockquote,
.b3-typography .bq,
.protyle-wysiwyg blockquote,
.protyle-wysiwyg .bq {
  border-left: var(--quote-border-width) solid #8d48e3;
  /* 紫色竖条 */
  border-color: #8d48e3;
  color: #b8bfc6;
  /* 改为偏灰的白色 */
  background-color: rgba(128, 128, 128, 0.15);
  margin: 0.5em 0em 0.5em 0.6em;
  padding: 0px 4px;
  padding-left: 0.5em;
}

.protyle-wysiwyg .sb blockquote,
.protyle-wysiwyg .sb .bq {
  border-left: 3px solid #8d48e3;
  margin: var(--allen-block-margin);
  padding: var(--allen-block-padding)
}

/* 代码块背景和字体设置 */
.b3-typography div.hljs,
.protyle-wysiwyg div.hljs {
  /* 修改背景色为更深的灰色 */
  background-color: rgb(22, 22, 22);

  /* 设置代码字体 */
  font-family: 'SauceCodePro Nerd Font Mono', 'Fira Code', 'Consolas', 'monospace';

  /* 设置字号 */
  font-size: 13px;

  /* 其他原有样式保持不变 */
  overflow: auto;
  border-radius: 0px;
  border-left: var(--quote-border-width) solid rgba(180, 142, 173, 0.7);
}

.protyle-wysiwyg div[fold="1"]:not(div[data-type="NodeListItem"]),
.protyle-wysiwyg [data-node-id][fold="1"]:not(.li):not([data-type=NodeHeading]) {
  background-image: repeating-linear-gradient(-45deg,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0.05) 5px,
      rgba(255, 255, 255, 0.1) 0,
      rgba(255, 255, 255, 0.1) 10px);
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.9;
}
```
