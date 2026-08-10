/*
 * 搜索交互层：同一份引擎驱动两个壳
 *   1. /search/ 独立页 —— URL 同步 ?q=，可分享、可进浏览器历史
 *   2. 全站 Cmd/Ctrl+K 命令面板 —— / 聚焦、Esc 关闭、↑↓ 导航、Enter 打开
 */

import { loadIndex, highlight, snippet, escapeHTML } from './search.js';

const DEBOUNCE_MS = 120;

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function resultHTML(result, index, idPrefix) {
  const { page, tokens } = result;
  const tags = (page.g || [])
    .map((tag) => `<span class="search-result-tag">#${escapeHTML(tag)}</span>`)
    .join('');

  return `
    <li class="search-result" role="option" id="${idPrefix}-opt-${index}" aria-selected="false">
      <a class="search-result-link" href="${escapeHTML(page.u)}">
        <span class="search-result-title">${highlight(page.t, tokens)}</span>
        <span class="search-result-meta">
          <time>${escapeHTML(page.d)}</time>
          ${page.r ? `<span class="search-result-time">约 ${page.r} 分钟</span>` : ''}
          ${tags}
        </span>
        <span class="search-result-snippet">${snippet(page, tokens)}</span>
      </a>
    </li>`;
}

/**
 * 把一组 DOM 元素接成一个可用的搜索界面。
 * 返回 { run, focus } 供外层（页面 / 面板）调用。
 */
function createSearchUI({ input, results, status, idPrefix, onNavigate }) {
  let activeIndex = -1;
  let currentResults = [];

  const setStatus = (text) => {
    if (status) status.textContent = text;
  };

  const setActive = (next) => {
    const items = [...results.querySelectorAll('.search-result')];
    if (!items.length) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    // 环绕移动，边界处回到另一端
    activeIndex = (next + items.length) % items.length;
    items.forEach((item, index) => {
      const active = index === activeIndex;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const active = items[activeIndex];
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  };

  const render = (query) => {
    if (!query.trim()) {
      results.innerHTML = '';
      setStatus('');
      activeIndex = -1;
      return;
    }
    if (!currentResults.length) {
      results.innerHTML = `<li class="search-empty">没有找到与「${escapeHTML(query)}」相关的文章</li>`;
      setStatus(`没有找到与 ${query} 相关的文章`);
      activeIndex = -1;
      return;
    }
    results.innerHTML = currentResults
      .map((result, index) => resultHTML(result, index, idPrefix))
      .join('');
    setStatus(`找到 ${currentResults.length} 篇相关文章`);
    setActive(0);
  };

  const run = async (query) => {
    if (!query.trim()) {
      currentResults = [];
      render(query);
      return;
    }
    setStatus('正在搜索…');
    try {
      const index = await loadIndex();
      // 索引 fetch 期间用户可能已改动输入，丢弃过期结果
      if (input.value !== query) return;
      currentResults = index.search(query);
      render(query);
    } catch (error) {
      currentResults = [];
      results.innerHTML = '<li class="search-empty">搜索索引加载失败，请刷新页面重试</li>';
      setStatus('搜索索引加载失败');
    }
  };

  const debouncedRun = debounce(run, DEBOUNCE_MS);

  input.addEventListener('input', () => {
    const query = input.value;
    debouncedRun(query);
    if (onNavigate) onNavigate(query);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter') {
      const active = results.querySelector('.search-result.is-active .search-result-link');
      if (active) {
        event.preventDefault();
        window.location.href = active.getAttribute('href');
      }
    }
  });

  // 鼠标移动时同步高亮，避免键盘与指针选中状态打架
  results.addEventListener('mousemove', (event) => {
    const item = event.target.closest('.search-result');
    if (!item) return;
    const items = [...results.querySelectorAll('.search-result')];
    const index = items.indexOf(item);
    if (index !== -1 && index !== activeIndex) setActive(index);
  });

  return { run, focus: () => input.focus() };
}

/* ---------- /search/ 独立页 ---------- */

function initSearchPage() {
  const input = document.getElementById('search-page-input');
  if (!input) return;

  const ui = createSearchUI({
    input,
    results: document.getElementById('search-page-results'),
    status: document.getElementById('search-page-status'),
    idPrefix: 'search-page',
    onNavigate: (query) => {
      // 用 replaceState，避免每敲一个字就往历史里塞一条
      const url = new URL(window.location.href);
      if (query) {
        url.searchParams.set('q', query);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState(null, '', url);
    },
  });

  const initial = new URL(window.location.href).searchParams.get('q');
  if (initial) {
    input.value = initial;
    ui.run(initial);
  }
  input.focus();
}

/* ---------- Cmd/Ctrl+K 命令面板 ---------- */

function initSearchModal() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;

  const input = document.getElementById('search-modal-input');
  const ui = createSearchUI({
    input,
    results: document.getElementById('search-modal-results'),
    status: document.getElementById('search-modal-status'),
    idPrefix: 'search-modal',
  });

  let lastFocused = null;

  const open = () => {
    if (modal.hasAttribute('hidden') === false) return;
    lastFocused = document.activeElement;
    modal.removeAttribute('hidden');
    document.body.classList.add('search-modal-open');
    input.focus();
    input.select();
    // 预热索引，用户开始输入时通常已就绪
    loadIndex().catch(() => {});
  };

  const close = () => {
    modal.setAttribute('hidden', '');
    document.body.classList.remove('search-modal-open');
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  document.addEventListener('keydown', (event) => {
    const isModifierK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (isModifierK) {
      event.preventDefault();
      modal.hasAttribute('hidden') ? open() : close();
      return;
    }

    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
      event.preventDefault();
      close();
      return;
    }

    // 「/」快捷聚焦，但不能在用户正在别处输入时抢焦点
    if (event.key === '/' && modal.hasAttribute('hidden')) {
      const target = event.target;
      const typing = target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!typing) {
        event.preventDefault();
        open();
      }
    }
  });

  // 点击遮罩关闭，点击面板内部不关闭
  modal.addEventListener('mousedown', (event) => {
    if (event.target === modal || event.target.classList.contains('search-modal-backdrop')) {
      close();
    }
  });

  modal.querySelectorAll('[data-search-close]').forEach((button) => {
    button.addEventListener('click', close);
  });

  // 头部搜索按钮
  document.querySelectorAll('[data-search-open]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
  });

  // 焦点困在面板内，Tab 不会跑到背后的页面上
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('input, button, a[href]')]
      .filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function init() {
  initSearchPage();
  initSearchModal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
