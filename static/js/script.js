/*
 * 覆盖主题的 static/js/script.js
 *
 * 只保留代码块复制按钮。原文件里的明暗切换与回到顶部已移交 assets/js/enhance.js：
 *   - 明暗状态改挂在 <html> 上（配合 baseof.html 的防闪白内嵌脚本），
 *     若保留原逻辑会与之冲突，出现点一次没反应的情况；
 *   - 原 back-to-top 只有一个未被使用的变量，没有滚动显隐逻辑。
 */

document.addEventListener("DOMContentLoaded", function () {
  const svgCopy =
    '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 16 16" width="1rem" height="1rem" fill="currentColor" class="octicon octicon-copy"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';
  const svgCopied =
    '<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 16 16" width="1rem" height="1rem" fill="currentColor" class="octicon octicon-check"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';

  document.querySelectorAll("pre").forEach(function (block) {
    const copyButton = document.createElement("button");
    copyButton.classList.add("copy-button");
    copyButton.setAttribute("aria-label", "复制代码");
    copyButton.setAttribute("type", "button");
    copyButton.innerHTML = svgCopy;

    copyButton.addEventListener("click", function () {
      // 按钮本身在 <pre> 内，取 innerText 会带上它的文本；这里只取代码节点
      const code = block.querySelector("code");
      const textToCopy = code ? code.innerText : block.innerText;

      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          copyButton.innerHTML = svgCopied;
          copyButton.setAttribute("aria-label", "已复制");
          setTimeout(() => {
            copyButton.innerHTML = svgCopy;
            copyButton.setAttribute("aria-label", "复制代码");
          }, 2000);
        })
        .catch(() => {
          copyButton.setAttribute("aria-label", "复制失败");
        });
    });

    block.appendChild(copyButton);
  });
});
