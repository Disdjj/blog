/*
 * 界面增强
 *
 * 明暗切换、回到顶部、阅读进度、文章目录、图片放大。
 * 明暗状态的 class 挂在 <html> 上（由 baseof.html 内嵌的防闪白脚本设置），
 * 与主题 script.js 挂在 <body> 上的做法不同，因此这里接管切换逻辑。
 */

const root = document.documentElement;

/* ---------- 明暗模式 ---------- */

function initDarkMode() {
  const apply = (dark) => {
    root.classList.toggle('darkmode', dark);
    // 主题自带样式里有 body.darkmode 选择器，两处都同步以免漏样式
    document.body.classList.toggle('darkmode', dark);
    try {
      localStorage.setItem('darkMode', dark ? 'enabled' : 'disabled');
    } catch (_) {
      // 隐私模式下 localStorage 可能不可写，忽略即可
    }
  };

  // 首屏由内嵌脚本设定了 <html>，这里补上 <body>
  apply(root.classList.contains('darkmode'));

  document.querySelectorAll('#dark-mode-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      apply(!root.classList.contains('darkmode'));
    });
  });

  // 用户没手动选过时，跟随系统切换
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem('darkMode');
    } catch (_) { /* 忽略 */ }
    if (stored === null) apply(event.matches);
  });
}

/* ---------- 回到顶部 ---------- */

function initBackToTop() {
  const button = document.getElementById('back-to-top');
  if (!button) return;

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const update = () => {
    button.classList.toggle('is-visible', window.scrollY > 400);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ---------- 阅读进度 ---------- */

function initReadingProgress() {
  const bar = document.querySelector('.reading-progress-bar');
  if (!bar) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/* ---------- 文章目录 ---------- */

// 目录固定在视口左侧：平时收成一列短横线，悬停或键盘聚焦时展开显示标题
// 标题顶端越过视口这条线即视为进入该章节
const TOC_ACTIVE_OFFSET = 120;

function initToc() {
  const mount = document.getElementById('toc-mount');
  const article = document.querySelector('article.content');
  if (!mount || !article) return;

  const all = [...article.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')];
  if (!all.length) return;

  // 文章标题层级不统一（有的从 h1 起，有的从 h2 起），取实际出现的最浅两级
  const levelOf = (heading) => Number(heading.tagName[1]);
  const top = Math.min(...all.map(levelOf));
  const headings = all.filter((heading) => levelOf(heading) <= top + 1);
  if (headings.length < 3) return;

  const toc = document.createElement('aside');
  toc.className = 'post-toc';
  const label = document.createElement('div');
  label.className = 'post-toc-label';
  label.textContent = '目录';
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', '文章目录');

  const rootList = document.createElement('ul');
  let subList = null;
  const links = headings.map((heading) => {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll('.heading-anchor').forEach((anchor) => anchor.remove());
    const text = clone.textContent.trim();

    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.title = text;
    const textNode = document.createElement('span');
    textNode.className = 'post-toc-text';
    textNode.textContent = text;
    link.appendChild(textNode);
    const item = document.createElement('li');
    item.appendChild(link);

    if (levelOf(heading) === top || !rootList.lastElementChild) {
      rootList.appendChild(item);
      subList = null;
    } else {
      if (!subList) {
        subList = document.createElement('ul');
        rootList.lastElementChild.appendChild(subList);
      }
      subList.appendChild(item);
    }
    return link;
  });

  nav.appendChild(rootList);
  toc.append(label, nav);
  mount.appendChild(toc);

  let active = null;
  const setActive = (link) => {
    if (link === active) return;
    if (active) {
      active.classList.remove('is-active');
      active.removeAttribute('aria-current');
    }
    active = link;
    if (!link) return;
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'true');

    // 目录较长时让当前项留在侧栏可视区内；不用 scrollIntoView，以免带动整页滚动
    if (nav.scrollHeight > nav.clientHeight) {
      const offset = link.offsetTop - nav.offsetTop;
      if (offset < nav.scrollTop || offset > nav.scrollTop + nav.clientHeight - link.offsetHeight) {
        nav.scrollTop = offset - nav.clientHeight / 2;
      }
    }
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    let index = -1;
    for (let i = 0; i < headings.length; i += 1) {
      if (headings[i].getBoundingClientRect().top > TOC_ACTIVE_OFFSET) break;
      index = i;
    }
    setActive(index >= 0 ? links[index] : null);
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}

/* ---------- 图片点击放大 ---------- */

function initLightbox() {
  const images = document.querySelectorAll('.content figure img, .content p > img');
  if (!images.length) return;

  let overlay = null;

  const close = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKeydown);
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  const open = (src, alt) => {
    close();
    overlay = document.createElement('div');
    overlay.className = 'image-lightbox';
    const large = document.createElement('img');
    large.src = src;
    large.alt = alt || '';
    overlay.appendChild(large);
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);
  };

  images.forEach((image) => {
    image.style.cursor = 'zoom-in';
    image.addEventListener('click', () => open(image.currentSrc || image.src, image.alt));
  });
}

function init() {
  initDarkMode();
  initBackToTop();
  initReadingProgress();
  initToc();
  initLightbox();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
