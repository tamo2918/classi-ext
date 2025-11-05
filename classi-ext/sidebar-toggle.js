// Classi サイドバー折りたたみ機能 - macOS Dock風

(function() {
  'use strict';

  // 校内グループページでのみ実行
  if (!window.location.href.includes('platform.classi.jp/group2')) {
    return;
  }

  // 状態管理
  let sidebarCollapsed = false;
  let mouseHoverTimeout = null;
  let isAnimating = false;

  // ストレージキー
  const STORAGE_KEY = 'classi_sidebar_collapsed';

  // DOM要素の参照
  let sidebar = null;
  let openButton = null;
  let collapseButton = null;

  // 保存された状態を読み込む
  async function loadSidebarState() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      return result[STORAGE_KEY] !== undefined ? result[STORAGE_KEY] : true; // デフォルトは折りたたみ
    } catch (error) {
      console.log('Failed to load sidebar state:', error);
      return true;
    }
  }

  // 状態を保存
  async function saveSidebarState(collapsed) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: collapsed });
    } catch (error) {
      console.log('Failed to save sidebar state:', error);
    }
  }

  // サイドバーを展開
  function expandSidebar() {
    if (!sidebar || !sidebarCollapsed || isAnimating) return;

    isAnimating = true;
    sidebarCollapsed = false;

    sidebar.classList.remove('sidebar-collapsed');
    document.body.classList.remove('sidebar-is-collapsed');

    // アニメーション完了後
    setTimeout(() => {
      isAnimating = false;
    }, 350);

    saveSidebarState(false);
  }

  // サイドバーを折りたたむ
  function collapseSidebar() {
    if (!sidebar || sidebarCollapsed || isAnimating) return;

    isAnimating = true;
    sidebarCollapsed = true;

    sidebar.classList.add('sidebar-collapsed');
    document.body.classList.add('sidebar-is-collapsed');

    // アニメーション完了後
    setTimeout(() => {
      isAnimating = false;
    }, 350);

    saveSidebarState(true);
  }

  // トグル
  function toggleSidebar() {
    if (sidebarCollapsed) {
      expandSidebar();
    } else {
      collapseSidebar();
    }
  }

  // 左端の開くボタンを作成
  function createOpenButton() {
    openButton = document.createElement('button');
    openButton.className = 'sidebar-open-button';
    openButton.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    `;
    openButton.title = 'サイドバーを開く (Cmd+B)';
    document.body.appendChild(openButton);

    // クリックで展開
    openButton.addEventListener('click', () => {
      expandSidebar();
    });
  }

  // 折りたたみボタンを作成
  function createCollapseButton() {
    collapseButton = document.createElement('button');
    collapseButton.className = 'sidebar-collapse-button';
    collapseButton.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
      </svg>
    `;
    collapseButton.title = 'サイドバーを閉じる (Cmd+B)';

    collapseButton.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseSidebar();
    });

    // サイドバー内に追加
    if (sidebar) {
      sidebar.appendChild(collapseButton);
    }
  }

  // サイドバー外クリックで閉じる
  function setupClickOutside() {
    document.addEventListener('click', (e) => {
      if (!sidebarCollapsed && sidebar && !sidebar.contains(e.target)) {
        // サイドバー外をクリックしたら閉じる
        // ただし、開くボタンは除外
        if (!openButton.contains(e.target)) {
          collapseSidebar();
        }
      }
    });
  }

  // キーボードショートカット
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ESCキーで閉じる
      if (e.key === 'Escape' && !sidebarCollapsed) {
        collapseSidebar();
        return;
      }

      // Cmd+B / Ctrl+B でトグル
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    });
  }

  // サイドバーが存在するまで待機
  function waitForSidebar() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const sidebarElement = document.querySelector('.mod-group-sidebar');
        if (sidebarElement) {
          clearInterval(checkInterval);
          resolve(sidebarElement);
        }
      }, 100);

      // 10秒後にタイムアウト
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 10000);
    });
  }

  // 初期化
  async function init() {
    console.log('Classi Sidebar Toggle: Initializing...');

    // サイドバー要素が読み込まれるまで待機
    sidebar = await waitForSidebar();

    if (!sidebar) {
      console.log('Classi Sidebar Toggle: Sidebar not found');
      return;
    }

    // CSSを読み込み
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('sidebar-toggle.css');
    document.head.appendChild(link);

    // 保存された状態を読み込み
    const savedState = await loadSidebarState();
    sidebarCollapsed = savedState;

    // 初期状態を適用
    if (sidebarCollapsed) {
      sidebar.classList.add('sidebar-collapsed');
      document.body.classList.add('sidebar-is-collapsed');
    }

    // UI要素を作成
    createOpenButton();
    createCollapseButton();

    // イベントリスナーを設定
    setupClickOutside();
    setupKeyboardShortcuts();

    console.log('Classi Sidebar Toggle: Initialized successfully!');
    console.log('Tip: ⌘+B (Cmd+B) または Ctrl+B でサイドバーをトグルできます');
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
