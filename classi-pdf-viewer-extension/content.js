// Classi PDF Viewer - Content Script
// PDFリンクをクリックしたときにオーバーレイで表示する

(function() {
  'use strict';

  // PDFのURLパターン
  const PDF_URL_PATTERN = /\/api\/cbank\/.*\/download\/pdf$/;

  // オーバーレイが既に存在するかチェック
  let overlayElement = null;

  /**
   * PDFオーバーレイを作成して表示
   */
  function showPDFOverlay(pdfUrl) {
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
   * イベントリスナーを設定
   */
  function init() {
    // ページ全体でクリックイベントをキャプチャ
    document.addEventListener('click', handleLinkClick, true);

    console.log('Classi PDF Viewer: Content script loaded');
  }

  // DOMContentLoadedまたはすぐに実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
