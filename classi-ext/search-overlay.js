// Classi Spotlight風検索オーバーレイ

(function() {
  'use strict';

  // 校内グループページでのみ実行
  if (!window.location.href.includes('platform.classi.jp/group2')) {
    return;
  }

  // 既存の検索ボタンを非表示
  function hideOriginalSearchButton() {
    const style = document.createElement('style');
    style.textContent = `
      .group-action-link[ng-click*="clickSearchGroupButton"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // CSRFトークンを取得
  function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }

    // メタタグからも試す
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    return null;
  }

  // 検索APIを呼び出し
  async function searchGroups(keyword, page = 1) {
    try {
      const params = new URLSearchParams({
        keyword: keyword,
        page: page
      });

      const response = await fetch(
        `https://platform.classi.jp/api/v2/groups/search?${params}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json, text/plain, */*',
            'x-xsrf-token': getCSRFToken()
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Search API error:', error);
      return { total: 0, results: [] };
    }
  }

  // キーワードをハイライト
  function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text;

    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // 日付をフォーマット
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    }
  }

  // 検索結果アイテムのHTML生成
  function createResultItem(result, keyword) {
    const { group, message } = result;
    const text = message.body.text || '';
    const previewText = text.substring(0, 200);
    const highlightedText = highlightKeyword(previewText, keyword);

    const attachCount = message.body.attach ? message.body.attach.length : 0;
    const commentCount = message.comment_count || 0;
    const likeCount = message.like_count || 0;

    const div = document.createElement('div');
    div.className = 'classi-search-result-item';
    div.innerHTML = `
      <div class="classi-search-result-header">
        <span class="classi-search-result-group">${group.name}</span>
        <span class="classi-search-result-author">${message.user.name}</span>
        <span class="classi-search-result-date">${formatDate(message.created_at)}</span>
      </div>
      <div class="classi-search-result-text">${highlightedText}${text.length > 200 ? '...' : ''}</div>
      <div class="classi-search-result-meta">
        ${attachCount > 0 ? `<span class="classi-search-result-meta-item">📎 ${attachCount}</span>` : ''}
        ${commentCount > 0 ? `<span class="classi-search-result-meta-item">💬 ${commentCount}</span>` : ''}
        ${likeCount > 0 ? `<span class="classi-search-result-meta-item">👍 ${likeCount}</span>` : ''}
      </div>
    `;

    // クリック時に該当の投稿に遷移
    div.addEventListener('click', () => {
      const url = `https://platform.classi.jp/group2/${group.id}#message-${message.id}`;
      window.location.href = url;
    });

    return div;
  }

  // 検索結果を表示
  function displayResults(data, keyword, resultsContainer) {
    resultsContainer.innerHTML = '';

    if (data.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="classi-search-no-results">
          <div class="classi-search-no-results-icon">🔍</div>
          <div class="classi-search-no-results-text">検索結果が見つかりませんでした</div>
          <div class="classi-search-no-results-hint">別のキーワードで試してみてください</div>
        </div>
      `;
      return;
    }

    data.results.forEach(result => {
      const item = createResultItem(result, keyword);
      resultsContainer.appendChild(item);
    });

    // 合計件数を表示（オプション）
    if (data.total > data.results.length) {
      const moreInfo = document.createElement('div');
      moreInfo.style.cssText = 'padding: 12px; text-align: center; color: #999; font-size: 12px;';
      moreInfo.textContent = `他 ${data.total - data.results.length} 件の結果`;
      resultsContainer.appendChild(moreInfo);
    }
  }

  // 検索を実行
  let searchTimeout = null;
  function performSearch(keyword, resultsContainer) {
    // デバウンス処理
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!keyword.trim()) {
      resultsContainer.innerHTML = '';
      return;
    }

    // ローディング表示
    resultsContainer.innerHTML = `
      <div class="classi-search-loading">
        <div class="classi-search-spinner"></div>
        <div style="margin-top: 12px;">検索中...</div>
      </div>
    `;

    searchTimeout = setTimeout(async () => {
      const data = await searchGroups(keyword);
      displayResults(data, keyword, resultsContainer);
    }, 300);
  }

  // オーバーレイを作成
  function createSearchOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'classi-search-overlay';

    overlay.innerHTML = `
      <div class="classi-search-container">
        <div class="classi-search-input-wrapper">
          <svg class="classi-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text"
                 class="classi-search-input"
                 placeholder="キーワード、投稿者名で検索..."
                 autocomplete="off"
                 spellcheck="false">
          <div class="classi-search-shortcut">
            <kbd>ESC</kbd>
          </div>
        </div>
        <div class="classi-search-results"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.classi-search-input');
    const resultsContainer = overlay.querySelector('.classi-search-results');

    // 入力時に検索
    input.addEventListener('input', (e) => {
      performSearch(e.target.value, resultsContainer);
    });

    // オーバーレイのクリックで閉じる
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSearchOverlay();
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeSearchOverlay();
      }
    });

    return overlay;
  }

  // 右下の浮遊検索ボタン（FAB）を作成
  function createSearchFAB() {
    const fab = document.createElement('button');
    fab.className = 'classi-search-fab';
    fab.innerHTML = `
      <svg class="classi-search-fab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    `;

    fab.addEventListener('click', openSearchOverlay);
    document.body.appendChild(fab);

    return fab;
  }

  // オーバーレイ参照
  let searchOverlay = null;

  // 検索オーバーレイを開く
  function openSearchOverlay() {
    if (!searchOverlay) {
      searchOverlay = createSearchOverlay();
    }

    searchOverlay.classList.add('active');
    const input = searchOverlay.querySelector('.classi-search-input');

    // フォーカスを当てる（少し遅延）
    setTimeout(() => {
      input.focus();
    }, 100);
  }

  // 検索オーバーレイを閉じる
  function closeSearchOverlay() {
    if (searchOverlay) {
      searchOverlay.classList.remove('active');
      const input = searchOverlay.querySelector('.classi-search-input');
      input.value = '';
      const resultsContainer = searchOverlay.querySelector('.classi-search-results');
      resultsContainer.innerHTML = '';
    }
  }

  // キーボードショートカット（Cmd+K / Ctrl+K）
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;

    if (modifierKey && e.key === 'k') {
      e.preventDefault();
      openSearchOverlay();
    }
  });

  // 初期化
  function init() {
    console.log('Classi Search Overlay: Initializing...');

    // CSSを読み込み
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('search-overlay.css');
    document.head.appendChild(link);

    // 既存の検索ボタンを非表示
    hideOriginalSearchButton();

    // FABボタンを作成
    createSearchFAB();

    console.log('Classi Search Overlay: Initialized successfully!');
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
