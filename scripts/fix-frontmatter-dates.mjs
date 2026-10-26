#!/usr/bin/env node
/*
 * 修正思源发布插件（siyuan-plugin-publisher）写坏的 front matter 日期
 *
 * 插件的 Hugo 转换器把时刻换成北京时间的挂钟时间（toISOString 后硬加 8 小时），
 * 再拼上本机时区偏移；本机不在 UTC+8 时标签就错了，负时区还会写成 `--7:00`，
 * Hugo 解析失败，整站构建失败。
 *
 * 所以偏移格式坏掉的 date/lastmod 一定出自插件，挂钟时间是北京时间，
 * 这里把偏移改回 '+08:00' 并加上引号；格式正确的日期不动，重复执行结果不变。
 *
 * 插件重新读取自己写的 yaml 时会把北京时间当成本机时间再换算一次，
 * 时间会越漂越晚，这种情况无法自动还原：修正后 date 若在未来，
 * Hugo 会静默跳过这篇文章，因此直接让构建失败，提示人工改正时间。
 *
 * 用法：node scripts/fix-frontmatter-dates.mjs   原地修正 content/ 下的 .md
 */

import { readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(import.meta.dirname, '..');
const CONTENT_DIR = join(ROOT, 'content');

const FRONT_MATTER = /^(﻿?---\r?\n)([\s\S]*?\r?\n)?---(?:\r?\n|$)/;
// 插件的写法：负数时符号重复（--7:00、--10:00），一位数小时不补零（-7:00、+9:00）
const PLUGIN_DATE = /^(date|lastmod):[ \t]*(['"]?)(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})([+-]-?\d{1,2}):(\d{2})\2[ \t]*$/gm;
const VALID_OFFSET = /^[+-]\d{2}$/;

export function fixFrontMatterDates(source, now = new Date()) {
  const fm = FRONT_MATTER.exec(source);
  if (!fm?.[2]) return { source, fixes: [] };

  const fixes = [];
  const fixed = fm[2].replace(PLUGIN_DATE, (line, field, _quote, time, hours) => {
    if (VALID_OFFSET.test(hours)) return line;
    const value = `${time}+08:00`;
    fixes.push({ field, from: line, to: value, future: field === 'date' && new Date(value.replace(' ', 'T')) > now });
    return `${field}: '${value}'`;
  });
  if (fixes.length === 0) return { source, fixes };

  const start = fm[1].length;
  return { source: source.slice(0, start) + fixed + source.slice(start + fm[2].length), fixes };
}

function* walkMarkdown(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMarkdown(path);
    else if (entry.name.endsWith('.md')) yield path;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let futurePosts = 0;
  for (const path of walkMarkdown(CONTENT_DIR)) {
    const { source, fixes } = fixFrontMatterDates(readFileSync(path, 'utf8'));
    if (fixes.length === 0) continue;
    writeFileSync(path, source);
    for (const { from, to, future } of fixes) {
      console.log(`fix-frontmatter-dates: ${relative(ROOT, path)}: ${from} → ${to}`);
      if (future) {
        futurePosts++;
        console.error(`  错误：${to} 在未来，Hugo 会跳过这篇文章。时间已被思源发布插件重复换算，请在思源里改正后重新发布`);
      }
    }
  }
  if (futurePosts > 0) process.exit(1);
}
