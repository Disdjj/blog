/*
 * 站内搜索引擎
 *
 * 中文用 2-gram 切分，拉丁文按词切分并小写归一，浏览器端建倒排索引。
 * 149 篇文章量级下建索引约 50ms，索引只在首次交互时 fetch 并缓存到 sessionStorage。
 *
 * 索引字段名与 layouts/index.searchindex.json 约定一致：
 *   u=url  t=title  d=date  g=tags  r=readingTime  s=summary  c=content
 */

const INDEX_URL = '/search-index.json';
const CACHE_KEY = 'blog:search-index:v1';

// 字段权重：标题命中远比正文命中重要
const FIELD_WEIGHT = { t: 8, g: 5, s: 2, c: 1 };

const MAX_RESULTS = 30;
const SNIPPET_RADIUS = 40;

// 词频饱和系数：越小则词频收益衰减越快，字段权重占比越高
const TF_K = 1.4;

/* ---------- 分词 ---------- */

// CJK 统一表意文字、扩展 A、兼容表意文字，以及日文假名
const CJK = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const CJK_RE = new RegExp(`[${CJK}]`);
const TOKEN_RE = new RegExp(`[${CJK}]|[a-z0-9]+(?:[.+#-][a-z0-9]+)*`, 'gi');

function isCJK(ch) {
  return CJK_RE.test(ch);
}

/**
 * 切分为检索单元。
 * 连续 CJK 字符切成 2-gram（单字成句时保留单字），拉丁串按词保留并小写化。
 * 「搜索能力」→ 搜索 / 索能 / 能力
 */
function tokenize(text) {
  if (!text) return [];
  const raw = String(text).match(TOKEN_RE) || [];
  const tokens = [];
  let run = [];

  const flushRun = () => {
    if (!run.length) return;
    if (run.length === 1) {
      tokens.push(run[0]);
    } else {
      for (let i = 0; i < run.length - 1; i++) {
        tokens.push(run[i] + run[i + 1]);
      }
    }
    run = [];
  };

  for (const unit of raw) {
    if (unit.length === 1 && isCJK(unit)) {
      run.push(unit);
    } else {
      flushRun();
      tokens.push(unit.toLowerCase());
    }
  }
  flushRun();
  return tokens;
}

/* ---------- 索引 ---------- */

class SearchIndex {
  constructor(pages) {
    this.pages = pages;
    // token -> Map<docId, 加权词频>
    this.inverted = new Map();
    this.build();
  }

  build() {
    this.pages.forEach((page, docId) => {
      for (const [field, weight] of Object.entries(FIELD_WEIGHT)) {
        const value = page[field];
        if (!value) continue;
        const text = Array.isArray(value) ? value.join(' ') : value;

        // 按字段分别累计词频，稍后各自饱和处理
        const counts = new Map();
        for (const token of tokenize(text)) {
          counts.set(token, (counts.get(token) || 0) + 1);
        }

        for (const [token, count] of counts) {
          let postings = this.inverted.get(token);
          if (!postings) {
            postings = new Map();
            this.inverted.set(token, postings);
          }
          // 词频饱和（BM25 思路）：出现越多边际收益越小。
          // 若直接线性累加，正文里出现 26 次的词会盖过标题命中的字段权重，
          // 导致标题精确命中的文章排不到前面。
          const saturated = (count * (TF_K + 1)) / (count + TF_K);
          postings.set(docId, (postings.get(docId) || 0) + weight * saturated);
        }
      }
    });
  }

  /**
   * 打分 = Σ(饱和加权词频 × IDF)，再对连续 n-gram 命中给短语加成。
   */
  search(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];

    const total = this.pages.length;
    const scores = new Map();
    // 记录每个文档命中了哪些 query token，用于短语加成
    const hits = new Map();

    tokens.forEach((token, position) => {
      const postings = this.inverted.get(token);
      if (!postings) return;
      const idf = Math.log(1 + total / postings.size);
      for (const [docId, tf] of postings) {
        scores.set(docId, (scores.get(docId) || 0) + tf * idf);
        let positions = hits.get(docId);
        if (!positions) {
          positions = new Set();
          hits.set(docId, positions);
        }
        positions.add(position);
      }
    });

    if (!scores.size) return [];

    // 短语加成：query 中相邻的 token 在同一文档同时命中，说明原短语很可能完整出现
    for (const [docId, positions] of hits) {
      let adjacent = 0;
      for (const position of positions) {
        if (positions.has(position + 1)) adjacent++;
      }
      const coverage = positions.size / tokens.length;
      const boost = 1 + coverage * 0.5 + (adjacent / tokens.length) * 0.8;
      scores.set(docId, scores.get(docId) * boost);
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || this.pages[a[0]].t.length - this.pages[b[0]].t.length)
      .slice(0, MAX_RESULTS)
      .map(([docId, score]) => ({ page: this.pages[docId], score, tokens }));
  }
}

/* ---------- 高亮与片段 ---------- */

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

/** 在 text 中找出所有 token 命中区间并合并重叠部分 */
function findRanges(text, tokens) {
  const lower = text.toLowerCase();
  const ranges = [];
  for (const token of new Set(tokens)) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(token, from);
      if (at === -1) break;
      ranges.push([at, at + token.length]);
      from = at + 1;
    }
  }
  if (!ranges.length) return [];
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (const [start, end] of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

function highlight(text, tokens) {
  const ranges = findRanges(text, tokens);
  if (!ranges.length) return escapeHTML(text);
  let html = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    html += escapeHTML(text.slice(cursor, start));
    html += '<mark>' + escapeHTML(text.slice(start, end)) + '</mark>';
    cursor = end;
  }
  return html + escapeHTML(text.slice(cursor));
}

/** 截取首个命中处周围的上下文，命中不在正文时回落到摘要 */
function snippet(page, tokens) {
  const body = page.c || page.s || '';
  const ranges = findRanges(body, tokens);
  if (!ranges.length) {
    return highlight((page.s || '').slice(0, SNIPPET_RADIUS * 3), tokens);
  }
  const [start, end] = ranges[0];
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(body.length, end + SNIPPET_RADIUS * 2);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < body.length ? '…' : '';
  return prefix + highlight(body.slice(from, to), tokens) + suffix;
}

/* ---------- 索引加载 ---------- */

let indexPromise = null;

function loadIndex() {
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    let payload = null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) payload = JSON.parse(cached);
    } catch (_) {
      // sessionStorage 不可用或缓存损坏，直接走网络
    }

    if (!payload) {
      const response = await fetch(INDEX_URL);
      if (!response.ok) throw new Error(`索引加载失败：HTTP ${response.status}`);
      payload = await response.json();
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch (_) {
        // 超出配额则跳过缓存，不影响功能
      }
    }

    return new SearchIndex(payload.p || []);
  })();

  // 失败后允许下次交互重试
  indexPromise.catch(() => { indexPromise = null; });
  return indexPromise;
}

export { loadIndex, highlight, snippet, escapeHTML, tokenize, MAX_RESULTS };
