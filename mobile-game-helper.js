/**
 * 手機遊戲優化輔助模組
 * 提供觸控事件、Canvas 自動適應、iOS 音效修復等功能
 */

class MobileGameHelper {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      enableTouch: true,
      enableResize: true,
      maintainAspectRatio: true,
      maxWidth: options.maxWidth || 800,
      maxHeight: options.maxHeight || 600,
      aspectRatio: options.aspectRatio || null, // 例如 4/3, 16/9
      ...options
    };
    
    this.originalWidth = canvas.width;
    this.originalHeight = canvas.height;
    this.scale = 1;
    this.touchStartPos = null;
    this.audioContext = null;
    this.audioUnlocked = false;
    
    this.init();
  }
  
  init() {
    if (this.options.enableResize) {
      this.setupResponsiveCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.resizeCanvas(), 100);
      });
    }
    
    if (this.options.enableTouch) {
      this.setupTouchEvents();
    }
    
    // iOS 音效解鎖
    this.setupAudioUnlock();
  }
  
  /**
   * 設定響應式 Canvas
   */
  setupResponsiveCanvas() {
    const container = this.canvas.parentElement;
    
    // 設定 Canvas 樣式
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.height = 'auto';
    
    this.resizeCanvas();
  }
  
  /**
   * 調整 Canvas 尺寸
   */
  resizeCanvas() {
    const container = this.canvas.parentElement || document.body;
    const containerWidth = container.clientWidth;
    const containerHeight = window.innerHeight * 0.7; // 最多佔 70% 高度
    
    let newWidth, newHeight;
    
    if (this.options.aspectRatio) {
      // 使用固定比例
      const ratio = this.options.aspectRatio;
      if (containerWidth / containerHeight > ratio) {
        newHeight = Math.min(containerHeight, this.options.maxHeight);
        newWidth = newHeight * ratio;
      } else {
        newWidth = Math.min(containerWidth, this.options.maxWidth);
        newHeight = newWidth / ratio;
      }
    } else if (this.options.maintainAspectRatio) {
      // 保持原始比例
      const ratio = this.originalWidth / this.originalHeight;
      if (containerWidth / containerHeight > ratio) {
        newHeight = Math.min(containerHeight, this.options.maxHeight);
        newWidth = newHeight * ratio;
      } else {
        newWidth = Math.min(containerWidth - 20, this.options.maxWidth);
        newHeight = newWidth / ratio;
      }
    } else {
      // 不保持比例
      newWidth = Math.min(containerWidth - 20, this.options.maxWidth);
      newHeight = Math.min(containerHeight, this.options.maxHeight);
    }
    
    // 設定 CSS 尺寸（顯示尺寸）
    this.canvas.style.width = newWidth + 'px';
    this.canvas.style.height = newHeight + 'px';
    
    // 計算縮放比例
    this.scale = newWidth / this.originalWidth;
    
    // 觸發自訂事件
    this.canvas.dispatchEvent(new CustomEvent('canvasResized', {
      detail: { width: newWidth, height: newHeight, scale: this.scale }
    }));
  }
  
  /**
   * 設定觸控事件
   */
  setupTouchEvents() {
    // 防止雙指縮放
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 防止長按選單
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // 觸控事件轉換為滑鼠事件（向後相容）
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
    
    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
    
    this.canvas.addEventListener('touchend', (e) => {
      const mouseEvent = new MouseEvent('mouseup', {
        bubbles: true
      });
      this.canvas.dispatchEvent(mouseEvent);
      
      // 也觸發 click 事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true
      });
      this.canvas.dispatchEvent(clickEvent);
    }, { passive: true });
  }
  
  /**
   * 取得觸控/滑鼠在 Canvas 上的座標
   */
  getCanvasPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    // 轉換為 Canvas 內部座標
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;
    
    return { x, y };
  }
  
  /**
   * 設定 iOS 音效解鎖
   */
  setupAudioUnlock() {
    const unlockAudio = () => {
      if (this.audioUnlocked) return;
      
      // 建立 AudioContext
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        }
      }
      
      // 播放靜音音效來解鎖
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.audioUnlocked = true;
          console.log('Audio unlocked for iOS');
        });
      }
      
      // 如果使用 Tone.js
      if (window.Tone && Tone.context.state === 'suspended') {
        Tone.start().then(() => {
          this.audioUnlocked = true;
          console.log('Tone.js audio unlocked for iOS');
        });
      }
      
      this.audioUnlocked = true;
    };
    
    // 在第一次使用者互動時解鎖
    const events = ['touchstart', 'touchend', 'mousedown', 'click'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });
  }
  
  /**
   * 取得 AudioContext（確保已解鎖）
   */
  getAudioContext() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
    }
    return this.audioContext;
  }
  
  /**
   * 播放音效（相容 iOS）
   */
  playSound(frequency = 440, duration = 0.1, type = 'sine') {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    
    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }
  
  /**
   * 檢測是否為行動裝置
   */
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * 檢測是否為 iOS
   */
  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  
  /**
   * 進入全螢幕
   */
  requestFullscreen() {
    const elem = this.canvas;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }
  
  /**
   * 離開全螢幕
   */
  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
  
  /**
   * 清理
   */
  destroy() {
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('orientationchange', this.resizeCanvas);
  }
}

// 匯出給全域使用
if (typeof window !== 'undefined') {
  window.MobileGameHelper = MobileGameHelper;
}
