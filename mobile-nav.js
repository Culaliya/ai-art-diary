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

  if (location.pathname.endsWith('index.html') || location.pathname === '/') {
    syncHomepageAppUpdates();
  }
});

function syncHomepageAppUpdates() {
  const homepageUpdates = [
    {
      name: '第N次醒來',
      desc: '日系懸疑視覺小說風格的循環敘事遊戲，在重複甦醒中撿回殘存的真相。',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/aa/c4/89/aac489e0-b10c-7df3-131b-23f9f33fd8eb/AppIcon-0-0-1x_U007epad-0-1-85-220.jpeg/512x512bb.jpg',
      link: 'https://apps.apple.com/us/app/%E7%AC%ACn%E6%AC%A1%E9%86%92%E4%BE%86/id6761845169',
      updated: '2026/04/09',
      version: '1.0',
      badge: '新上架',
      spotlight: true,
      emoji: '⏳'
    },
    {
      name: '馬桶密室：再沖一次',
      desc: '在詭異馬桶密室裡探索、生存與做選擇的荒謬驚悚逃脫遊戲。',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/66/f3/1f/66f31fd9-927b-abf1-276a-41b071102380/AppIcon-0-0-1x_U007epad-0-1-85-220.jpeg/512x512bb.jpg',
      link: 'https://apps.apple.com/us/app/%E9%A6%AC%E6%A1%B6%E5%AF%86%E5%AE%A4-%E5%86%8D%E6%B2%96%E4%B8%80%E6%AC%A1/id6761712917',
      updated: '2026/04/09',
      version: '1.0',
      badge: '新上架',
      spotlight: true,
      emoji: '🚽'
    },
    {
      name: '失控鍋物：物理大亂燉',
      desc: '把食材丟進鍋裡，看碰撞、爆炸與突變一路失控的單機物理亂鬥鍋物遊戲。',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/61/c7/74/61c77475-a69c-e14a-458e-5b7795ea9d91/AppIcon-0-0-1x_U007epad-0-1-85-220.jpeg/512x512bb.jpg',
      link: 'https://apps.apple.com/us/app/%E5%A4%B1%E6%8E%A7%E9%8D%8B%E7%89%A9-%E7%89%A9%E7%90%86%E5%A4%A7%E4%BA%82%E7%87%89/id6761712131',
      updated: '2026/04/08',
      version: '1.0',
      badge: '新上架',
      spotlight: true,
      emoji: '🍲'
    },
    {
      name: '喵喵蕃茄鐘',
      desc: '喵喵蕃茄鐘：專注每一刻',
      icon: 'assets/apps/meowfocus.png',
      link: 'https://apps.apple.com/us/app/%E5%96%B5%E5%96%B5%E7%95%AA%E8%8C%84%E9%90%98meowfocus-timer/id6753789886',
      updated: '2026/04/06',
      version: '1.2',
      badge: '已更新',
      spotlight: false,
      emoji: '🍅'
    }
  ];

  syncHomepageUpdateBanner();
  syncHomepageAppCards(homepageUpdates, 0);
}

function syncHomepageUpdateBanner() {
  const updateCard = document.querySelector('#app-updates .update-card');
  if (!updateCard) return;

  updateCard.innerHTML = `
    <p class="update-title">【📱 App Updates】</p>
    <p class="update-text special-new">⏳ <a class="update-link" href="https://apps.apple.com/us/app/%E7%AC%ACn%E6%AC%A1%E9%86%92%E4%BE%86/id6761845169">第N次醒來</a> v1.0 (2026/04/09) — NEW</p>
    <p class="update-text special-new">🚽 <a class="update-link" href="https://apps.apple.com/us/app/%E9%A6%AC%E6%A1%B6%E5%AF%86%E5%AE%A4-%E5%86%8D%E6%B2%96%E4%B8%80%E6%AC%A1/id6761712917">馬桶密室：再沖一次</a> v1.0 (2026/04/09) — NEW</p>
    <p class="update-text special-new">🍲 <a class="update-link" href="https://apps.apple.com/us/app/%E5%A4%B1%E6%8E%A7%E9%8D%8B%E7%89%A9-%E7%89%A9%E7%90%86%E5%A4%A7%E4%BA%82%E7%87%89/id6761712131">失控鍋物：物理大亂燉</a> v1.0 (2026/04/08) — NEW</p>
    <p class="update-text special-new">🍅 <a class="update-link" href="https://apps.apple.com/us/app/%E5%96%B5%E5%96%B5%E7%95%AA%E8%8C%84%E9%90%98meowfocus-timer/id6753789886">喵喵蕃茄鐘</a> v1.2 (2026/04/06) — UPDATED</p>
    <p class="update-text special-new">🛠️ <a class="update-link" href="https://apps.apple.com/us/app/%E5%BD%A2%E4%B8%8A%E5%AD%B8%E4%BA%94%E9%87%91%E8%A1%8C/id6761043770">形上學五金行</a> v1.0 (2026/03/31) — NEW</p>
    <p class="update-text special-new">🥊 <a class="update-link" href="https://apps.apple.com/us/app/buddies-%E4%BA%82%E9%AC%A5%E6%B4%BE%E5%B0%8D/id6760216392">Buddies 亂鬥派對</a> v1.0 (2026/03/25) — NEW</p>
    <p class="update-text special-new">📔 <a class="update-link" href="https://apps.apple.com/us/app/%E6%B0%B8%E6%81%86%E6%97%A5%E8%A8%98stickymode/id6760697871">永恆日記 StickyMode</a> v1.0 (2026/03/23) — NEW</p>
  `;
}

function syncHomepageAppCards(updates, attempt) {
  const container = document.getElementById('app-container');
  if (!container) return;

  const existingCards = Array.from(container.querySelectorAll('.app-card'));
  if (!existingCards.length) {
    if (attempt < 20) {
      window.setTimeout(() => syncHomepageAppCards(updates, attempt + 1), 250);
    }
    return;
  }

  const cardMap = new Map();
  existingCards.forEach((card) => {
    const title = card.querySelector('h3')?.childNodes[0]?.textContent?.trim();
    if (title) cardMap.set(title, card);
  });

  const newCards = updates.map((app) => {
    const card = cardMap.get(app.name) || document.createElement('div');
    card.className = `app-card${app.spotlight ? ' new-app-spotlight' : ''}`;
    card.dataset.appName = app.name;
    card.innerHTML = `
      <img class="app-image" src="${app.icon}" alt="${app.name}" onerror="this.src='https://via.placeholder.com/96/000000/0ff?text=App'">
      <div class="app-info">
        <h3>
          ${app.name}
          <span class="update-badge${app.spotlight ? ' launch' : ''}">${app.badge}</span>
        </h3>
        <p>${app.desc}</p>
        <div class="app-meta">📅 ${app.updated} | 版本：${app.version}</div>
      </div>
      <div class="app-actions">
        <a class="button" href="${app.link}" target="_blank" rel="noopener">App Store</a>
      </div>
    `;
    attachHoverSound(card);
    card.querySelectorAll('.button').forEach(attachHoverSound);
    return card;
  });

  const preservedCards = existingCards.filter((card) => {
    const title = card.querySelector('h3')?.childNodes[0]?.textContent?.trim();
    return !updates.some((app) => app.name === title);
  });

  container.replaceChildren(...newCards, ...preservedCards);
}

function attachHoverSound(element) {
  const hoverSound = document.getElementById('hover-sound');
  if (!hoverSound || !element || element.dataset.hoverSoundBound === 'true') return;

  element.dataset.hoverSoundBound = 'true';
  element.addEventListener('mouseenter', () => {
    hoverSound.volume = 0.2;
    hoverSound.currentTime = 0;
    hoverSound.play();
  });
}
