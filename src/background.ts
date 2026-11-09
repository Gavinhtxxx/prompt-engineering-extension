type OpenMode = 'sidePanel' | 'popup';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 720;

let popupWindowId: number | null = null;

async function getOpenMode(): Promise<OpenMode> {
  const { gestalt_settings } = await chrome.storage.local.get('gestalt_settings');
  const mode = (gestalt_settings as { appearance?: { openMode?: OpenMode } } | undefined)?.appearance?.openMode;
  return mode === 'popup' ? 'popup' : 'sidePanel';
}

function createPopup() {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  }, (w) => {
    if (w?.id !== undefined) popupWindowId = w.id;
  });
}

function openPopupWindow() {
  if (popupWindowId === null) {
    createPopup();
    return;
  }
  chrome.windows.update(popupWindowId, { focused: true }, () => {
    if (chrome.runtime.lastError) {
      popupWindowId = null;
      createPopup();
    }
  });
}

chrome.windows.onRemoved.addListener((id) => {
  if (id === popupWindowId) popupWindowId = null;
});

async function openApp(windowId?: number) {
  if ((await getOpenMode()) === 'popup') {
    openPopupWindow();
  } else if (windowId !== undefined) {
    chrome.sidePanel.open({ windowId }).catch(() => {});
  }
}

/**
 * 同步两种打开方式下的面板状态：
 * - sidePanel：启用面板，并把图标点击交给 Chrome 原生 openPanelOnActionClick（不受用户手势时序限制）
 * - popup：禁用面板（Chrome 会自动关闭已打开的面板），图标点击由 onClicked 接管弹小窗
 */
function syncPanelMode(mode: OpenMode) {
  const sidePanelMode = mode !== 'popup';
  try {
    chrome.sidePanel
      .setOptions({ path: 'index.html', enabled: sidePanelMode })
      .catch(() => {});
  } catch { /* 忽略旧版本 API 差异 */ }
  try {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: sidePanelMode })
      .catch(() => {});
  } catch { /* 忽略旧版本 API 差异 */ }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.gestalt_settings) return;
  const read = (v: unknown): OpenMode =>
    (v as { appearance?: { openMode?: OpenMode } } | undefined)?.appearance?.openMode === 'popup' ? 'popup' : 'sidePanel';
  const { oldValue, newValue } = changes.gestalt_settings;
  // 首次写入（oldValue 为空）不触发，避免覆盖用户手动开关的窗口状态
  if (oldValue === undefined || read(oldValue) === read(newValue)) return;

  const next = read(newValue);
  syncPanelMode(next);
  if (next === 'popup') {
    openPopupWindow();
  } else if (popupWindowId !== null) {
    chrome.windows.remove(popupWindowId, () => {
      void chrome.runtime.lastError;
      popupWindowId = null;
    });
  }
});

void getOpenMode().then(syncPanelMode);
chrome.runtime.onStartup.addListener(() => {
  void getOpenMode().then(syncPanelMode);
});

chrome.action.onClicked.addListener(() => {
  void getOpenMode().then((mode) => {
    if (mode === 'popup') openPopupWindow();
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: 'gestalt-generate',
      title: '用 Gestalt 生成提示词',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'gestalt-generate' && info.selectionText) {
    chrome.storage.local.set({ gestalt_pending_text: info.selectionText });
    void openApp(info.windowId);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'generate-prompt') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      void openApp(tabs[0]?.windowId);
    });
  }
});
