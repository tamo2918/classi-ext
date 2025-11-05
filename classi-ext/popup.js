// Classi拡張くん - Popup Script
// ダークモードとPDFオーバーレイのトグルを制御

(function() {
  'use strict';

  const darkModeToggle = document.getElementById('darkModeToggle');
  const pdfOverlayToggle = document.getElementById('pdfOverlayToggle');

  async function getActiveClassiTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('classi.jp')) {
      console.warn('Not on Classi page');
      return null;
    }
    return tab;
  }

  async function updateFeature({ storageKey, action, isEnabled, featureName }) {
    try {
      await chrome.storage.sync.set({ [storageKey]: isEnabled });

      const tab = await getActiveClassiTab();
      if (!tab) {
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        {
          action,
          enabled: isEnabled
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(`Error sending ${featureName} toggle:`, chrome.runtime.lastError);
            return;
          }

          if (response && response.success) {
            console.log(`${featureName} ${isEnabled ? 'enabled' : 'disabled'} successfully`);
          }
        }
      );
    } catch (error) {
      console.error(`Failed to toggle ${featureName}:`, error);
    }
  }

  /**
   * 初期化: 保存された設定を読み込んでUIに反映
   */
  function init() {
    // ストレージから現在の設定を読み込む
    chrome.storage.sync.get(['darkModeEnabled', 'pdfOverlayEnabled'], (result) => {
      const isDarkModeEnabled = result.darkModeEnabled || false;
      const isPdfOverlayEnabled = result.pdfOverlayEnabled !== false;

      darkModeToggle.checked = isDarkModeEnabled;
      pdfOverlayToggle.checked = isPdfOverlayEnabled;
    });
  }

  /**
   * トグルスイッチの変更イベントハンドラー
   */
  darkModeToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    updateFeature({
      storageKey: 'darkModeEnabled',
      action: 'toggleDarkMode',
      isEnabled,
      featureName: 'Dark Mode'
    });
  });

  pdfOverlayToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    updateFeature({
      storageKey: 'pdfOverlayEnabled',
      action: 'togglePdfOverlay',
      isEnabled,
      featureName: 'PDF overlay'
    });
  });

  // ページ読み込み時に初期化
  init();
})();
