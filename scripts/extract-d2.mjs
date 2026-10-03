import MarkdownIt from 'markdown-it';

// 按 CommonMark 解析容器里的围栏，得到与 Hugo .Inner 一致的源码。
// 不能直接删除每行的 >，因为 D2 字符串和普通代码块也可能包含它。
const markdown = new MarkdownIt('commonmark');

export function extractD2Blocks(source) {
  return markdown.parse(source, {})
    .filter((token) => token.type === 'fence' && /^d2(?:\s|\{|$)/i.test(token.info.trim()))
    .map((token) => token.content);
}
