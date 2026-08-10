/*
 * 界面增强
 *
 * 明暗切换、回到顶部、阅读进度、图片放大。
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
  initLightbox();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
