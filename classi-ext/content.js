// Classi拡張くん - Content Script
// PDFリンクをクリックしたときにオーバーレイで表示する

(function() {
  'use strict';

  // PDFのURLパターン
  const PDF_URL_PATTERN = /\/api\/cbank\/.*\/download\/pdf$/;

  // オーバーレイ管理
  let overlayElement = null;
  let isPdfOverlayEnabled = false;

  /**
   * PDFオーバーレイを作成して表示
   */
  function showPDFOverlay(pdfUrl) {
    if (!isPdfOverlayEnabled) {
      return;
    }

    // 既存のオーバーレイがあれば削除
    if (overlayElement) {
      overlayElement.remove();
    }

    // オーバーレイコンテナを作成
    overlayElement = document.createElement('div');
    overlayElement.className = 'classi-pdf-overlay';
    overlayElement.innerHTML = `
      <div class="classi-pdf-modal">
        <div class="classi-pdf-header">
          <span class="classi-pdf-title">PDF プレビュー</span>
          <button class="classi-pdf-close-btn" aria-label="閉じる">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="classi-pdf-content">
          <iframe src="${pdfUrl}" class="classi-pdf-iframe"></iframe>
        </div>
      </div>
    `;

    // body に追加
    document.body.appendChild(overlayElement);

    // 閉じるボタンのイベントリスナー
    const closeBtn = overlayElement.querySelector('.classi-pdf-close-btn');
    closeBtn.addEventListener('click', closePDFOverlay);

    // オーバーレイの背景クリックで閉じる
    overlayElement.addEventListener('click', (e) => {
      if (e.target === overlayElement) {
        closePDFOverlay();
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', handleEscKey);

    // bodyのスクロールを無効化
    document.body.style.overflow = 'hidden';
  }

  /**
   * PDFオーバーレイを閉じる
   */
  function closePDFOverlay() {
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }

    // bodyのスクロールを復元
    document.body.style.overflow = '';

    // ESCキーのイベントリスナーを削除
    document.removeEventListener('keydown', handleEscKey);
  }

  /**
   * ESCキーのハンドラー
   */
  function handleEscKey(e) {
    if (e.key === 'Escape') {
      closePDFOverlay();
    }
  }

  /**
   * PDFリンクかどうかをチェック
   */
  function isPDFLink(url) {
    return PDF_URL_PATTERN.test(url);
  }

  /**
   * リンクのクリックイベントを処理
   */
  function handleLinkClick(e) {
    if (!isPdfOverlayEnabled) {
      return;
    }

    const target = e.target.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href || !isPDFLink(href)) return;

    // デフォルトの動作（新しいタブで開く）をキャンセル
    e.preventDefault();
    e.stopPropagation();

    // 相対URLを絶対URLに変換
    const absoluteUrl = new URL(href, window.location.origin).href;

    // オーバーレイでPDFを表示
    showPDFOverlay(absoluteUrl);
  }

  /**
   * PDFオーバーレイを有効化
   */
  function enablePdfOverlay() {
    if (isPdfOverlayEnabled) return;
    document.addEventListener('click', handleLinkClick, true);
    isPdfOverlayEnabled = true;
    console.log('Classi拡張くん: PDF overlay enabled');
  }

  /**
   * PDFオーバーレイを無効化
   */
  function disablePdfOverlay() {
    if (!isPdfOverlayEnabled) return;
    document.removeEventListener('click', handleLinkClick, true);
    closePDFOverlay();
    isPdfOverlayEnabled = false;
    console.log('Classi拡張くん: PDF overlay disabled');
  }

  /**
   * ストレージから設定を取得して適用
   */
  function loadPdfOverlaySetting() {
    chrome.storage.sync.get(['pdfOverlayEnabled'], (result) => {
      const enabled = result.pdfOverlayEnabled !== false;

      if (typeof result.pdfOverlayEnabled === 'undefined') {
        chrome.storage.sync.set({ pdfOverlayEnabled: enabled });
      }

      if (enabled) {
        enablePdfOverlay();
      } else {
        disablePdfOverlay();
      }
    });
  }

  /**
   * 初期化
   */
  function init() {
    loadPdfOverlaySetting();
    console.log('Classi拡張くん: Content script loaded');
  }

  // DOMContentLoadedまたはすぐに実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * メッセージリスナー（ポップアップからの指示を受ける）
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'togglePdfOverlay') {
      const isEnabled = message.enabled !== false;
      if (isEnabled) {
        enablePdfOverlay();
      } else {
        disablePdfOverlay();
      }
      sendResponse({ success: true });
      return;
    }

    if (message.action === 'getPdfOverlayStatus') {
      sendResponse({ enabled: isPdfOverlayEnabled });
    }
  });
})();

// ==========================================
// Dark Mode Feature using Dark Reader
// ==========================================
(function() {
  'use strict';

  // Dark Readerが利用可能かチェック
  if (typeof DarkReader === 'undefined') {
    console.error('Dark Reader library is not loaded');
    return;
  }

  const proxyDarkReaderFetch = (url) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'darkreaderFetch', url }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }
        if (!response) {
          reject(new Error('Empty proxy response'));
          return;
        }
        if (!response.ok) {
          reject(new Error(response.error || `Proxy failed for ${url}`));
          return;
        }

        const headers = new Headers();
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              headers.append(key, value);
            }
          });
        }

        try {
          resolve(
            new Response(response.body ?? undefined, {
              status: response.status,
              statusText: response.statusText,
              headers
            })
          );
        } catch (error) {
          reject(error);
        }
      });
    });

  if (typeof DarkReader.setFetchMethod === 'function') {
    DarkReader.setFetchMethod((url) =>
      fetch(url)
        .catch(() => proxyDarkReaderFetch(url))
        .catch(() =>
          new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          })
        )
    );
  }

  // ダークモードの設定
  const DARK_MODE_CONFIG = {
    brightness: 100,
    contrast: 90,
    sepia: 10
  };

  /**
   * ダークモードを有効化
   */
  function enableDarkMode() {
    try {
      DarkReader.enable(DARK_MODE_CONFIG);
      console.log('Dark Mode: Enabled');
    } catch (error) {
      console.error('Failed to enable dark mode:', error);
    }
  }

  /**
   * ダークモードを無効化
   */
  function disableDarkMode() {
    try {
      DarkReader.disable();
      console.log('Dark Mode: Disabled');
    } catch (error) {
      console.error('Failed to disable dark mode:', error);
    }
  }

  /**
   * ストレージから設定を読み込んで適用
   */
  function loadAndApplySettings() {
    chrome.storage.sync.get(['darkModeEnabled'], (result) => {
      const isDarkModeEnabled = result.darkModeEnabled || false;

      if (isDarkModeEnabled) {
        enableDarkMode();
      } else {
        disableDarkMode();
      }
    });
  }

  /**
   * メッセージリスナー（ポップアップからの指示を受ける）
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleDarkMode') {
      const isEnabled = message.enabled;

      if (isEnabled) {
        enableDarkMode();
      } else {
        disableDarkMode();
      }

      sendResponse({ success: true });
    } else if (message.action === 'getDarkModeStatus') {
      const isEnabled = DarkReader.isEnabled();
      sendResponse({ enabled: isEnabled });
    }

    return true; // 非同期レスポンスを許可
  });

  // 初期化: 保存された設定を読み込んで適用
  loadAndApplySettings();

  console.log('Classi拡張くん: Dark Mode feature loaded');
})();
