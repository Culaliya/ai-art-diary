// ===== 📱 手機漢堡選單功能 =====
document.addEventListener('DOMContentLoaded', function() {
  // 建立漢堡選單 HTML 結構
  const navHTML = `
    <button class="mobile-nav-toggle" id="mobileNavToggle" aria-label="開啟選單">
      ☰
    </button>
    <div class="mobile-nav-overlay" id="mobileNavOverlay"></div>
    <nav class="mobile-nav-menu" id="mobileNavMenu">
      <a href="index.html">🏠 首頁</a>
      <a href="games.html">🎮 遊戲實驗室</a>
      <a href="fortune_lab.html">🔮 命理實驗室</a>
      <a href="image_lab.html">🎨 圖像實驗室</a>
      <a href="music_lab.html">🎵 音樂實驗室</a>
    </nav>
  `;
  
  // 插入到 body 開頭
  document.body.insertAdjacentHTML('afterbegin', navHTML);
  
  // 取得元素
  const toggle = document.getElementById('mobileNavToggle');
  const menu = document.getElementById('mobileNavMenu');
  const overlay = document.getElementById('mobileNavOverlay');
  
  // 開啟/關閉選單
  function toggleMenu() {
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
    toggle.textContent = menu.classList.contains('active') ? '✕' : '☰';
  }
  
  // 點擊漢堡按鈕
  toggle.addEventListener('click', toggleMenu);
  
  // 點擊遮罩關閉選單
  overlay.addEventListener('click', toggleMenu);
  
  // 點擊選單連結後關閉選單
  const menuLinks = menu.querySelectorAll('a');
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
      overlay.classList.remove('active');
      toggle.textContent = '☰';
    });
  });
  
  // ESC 鍵關閉選單
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      toggleMenu();
    }
  });
});
