console.log("Typewriter script loaded v3");

document.addEventListener('DOMContentLoaded', function() {
  const descElement = document.querySelector('.site-description');
  if (!descElement) return;

  const text = descElement.textContent.trim() || "反抗吧，朋友！";
  descElement.textContent = "";
  
  let charIndex = 0;
  let isDeleting = false;
  
  function tick() {
    // 1. 渲染当前状态
    descElement.textContent = text.substring(0, charIndex);
    
    // 2. 确定下一步动作和速度
    let delta = 150; // 默认打字速度

    if (isDeleting) {
      delta = 80; // 删除速度
      charIndex--;
    } else {
      charIndex++;
    }

    // 3. 边界处理
    if (!isDeleting && charIndex === text.length + 1) {
      // 打字刚完成
      charIndex--; // 修正回最大长度，保持显示完整
      isDeleting = true;
      delta = 2000; // 停顿 2秒
    } else if (isDeleting && charIndex === 0) {
      // 删除刚完成
      isDeleting = false;
      delta = 500; // 停顿 0.5秒
    }

    setTimeout(tick, delta);
  }

  tick();
});
