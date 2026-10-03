#!/usr/bin/env node
/*
 * 预渲染 markdown 里的 ```d2 代码块
 *
 * Hugo 构建期间不能调用外部命令，所以 D2 图在构建前由本脚本生成：
 *   扫描 content/ 下所有 .md 的 d2 代码块 → 用 @d2lang/d2（D2 的 WASM 版，内置 TALA）渲染
 *   → 写到 assets/d2/<md5>.svg。
 * layouts/_default/_markup/render-codeblock-d2.html 用同样的哈希规则
 * （去掉首尾空白后取 md5）找到对应 SVG。
 *
 * 布局引擎固定为 TALA。写图时不用操心排版方向：代码块没有声明顶层 direction 时，
 * 优先横向渲染，横向放进正文后字被缩得太小才改用纵向（见 pickBest）。
 *
 * 渲染参数与方向规则需与思源插件 siyuan-plugin-d2 保持一致，两边看到的图才一样。
 *
 * 生成的 SVG 会提交进仓库，脚本只补缺失的图，已有的直接跳过。
 *
 * 用法：
 *   node scripts/render-d2.mjs          补渲染缺失的图
 *   node scripts/render-d2.mjs --force  全部重新渲染（改了下面的渲染参数后用）
 *   node scripts/render-d2.mjs --prune  额外删除已没有文章引用的 SVG
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { D2 } from '@d2lang/d2';

const ROOT = join(import.meta.dirname, '..');
const CONTENT_DIR = join(ROOT, 'content');
const OUT_DIR = join(ROOT, 'assets', 'd2');

// 布局固定用 TALA，统一手绘风格；等价于 CLI 的 --layout=tala --sketch --pad=16 --theme=0
const COMPILE_OPTIONS = { layout: 'tala', sketch: true, pad: 16, themeID: 0 };

// 正文列宽约 46rem = 736px；图再高也希望一屏内看完，超过约 900px 就要缩小
const COLUMN_WIDTH = 736;
const MAX_HEIGHT = 900;

const force = process.argv.includes('--force');
const prune = process.argv.includes('--prune');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

// 与 CommonMark 围栏规则一致：``` 或 ~~~ 开头，结束围栏同字符且不短于开始围栏
function extractD2Blocks(markdown) {
  const blocks = [];
  const lines = markdown.split(/\r?\n/);
  let fence = null;
  let isD2 = false;
  let buffer = [];

  for (const line of lines) {
    if (!fence) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})\s*([^\s{`]*)/);
      if (open) {
        fence = open[1];
        isD2 = open[2].toLowerCase() === 'd2';
        buffer = [];
      }
      continue;
    }
    const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (close && close[1][0] === fence[0] && close[1].length >= fence.length) {
      if (isD2) blocks.push(buffer.join('\n'));
      fence = null;
      continue;
    }
    buffer.push(line);
  }
  return blocks;
}

const hashOf = (source) => createHash('md5').update(source.trim()).digest('hex');

// WASM 初始化较慢，整个脚本复用一个实例，用到时才创建
let d2 = null;

async function renderSvg(source) {
  d2 ??= new D2();
  const result = await d2.compile(source.trim() + '\n', COMPILE_OPTIONS);
  // 与 CLI 输出保持一致：CLI 写文件时末尾带一个换行
  return (await d2.render(result.diagram, result.renderOptions)) + '\n';
}

// 放进正文后的缩放比例，越大字越清楚；小图不放大，按 1 计
function displayScale(svg) {
  const match = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  if (!match) return 0;
  const [width, height] = [Number(match[1]), Number(match[2])];
  return Math.min(1, COLUMN_WIDTH / width, MAX_HEIGHT / height);
}

// 只看顶层（无缩进）的 direction，容器内部的 direction 不影响整体朝向
const hasTopLevelDirection = (source) => /^direction\s*:/m.test(source);

// 优先横向：横向放进正文后字号不低于原来的这个比例（16px 正文下约 12px）就用横向
const MIN_HORIZONTAL_SCALE = 0.75;

async function pickBest(source) {
  // 作者明确写了顶层 direction 就照办
  if (hasTopLevelDirection(source)) return renderSvg(source);

  const horizontal = await renderSvg(`direction: right\n${source}`);
  const horizontalScale = displayScale(horizontal);
  if (horizontalScale >= MIN_HORIZONTAL_SCALE) return horizontal;

  // 横向放不下才考虑纵向，且纵向确实更清楚时才换
  const vertical = await renderSvg(`direction: down\n${source}`);
  return displayScale(vertical) > horizontalScale ? vertical : horizontal;
}

async function render(source, outFile) {
  writeFileSync(outFile, await pickBest(source));
}

const wanted = new Map();
for (const file of walk(CONTENT_DIR)) {
  for (const source of extractD2Blocks(readFileSync(file, 'utf8'))) {
    const hash = hashOf(source);
    if (!wanted.has(hash)) wanted.set(hash, { source, file: relative(ROOT, file) });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const pending = [...wanted].filter(([hash]) => force || !existsSync(join(OUT_DIR, `${hash}.svg`)));

let failed = 0;
for (const [hash, { source, file }] of pending) {
  try {
    await render(source, join(OUT_DIR, `${hash}.svg`));
    console.log(`render-d2: ${file} → assets/d2/${hash}.svg`);
  } catch (error) {
    failed += 1;
    console.error(`render-d2: ${file} 渲染失败\n${error.message || error}`);
  }
}

if (prune) {
  for (const name of readdirSync(OUT_DIR)) {
    if (name.endsWith('.svg') && !wanted.has(name.slice(0, -4))) {
      rmSync(join(OUT_DIR, name));
      console.log(`render-d2: 删除未引用的 assets/d2/${name}`);
    }
  }
}

await d2?.dispose();

console.log(`render-d2: 共 ${wanted.size} 张图，本次渲染 ${pending.length - failed} 张`);
if (failed) process.exit(1);
