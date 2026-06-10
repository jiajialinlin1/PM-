const path = require('node:path');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  safeStorage,
  screen
} = require('electron');
const { buildTooltip, fetchQuotaSnapshot, maskToken } = require('./quota-service.cjs');
const { createStore } = require('./storage.cjs');

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const WINDOW_WIDTH = 390;
const WINDOW_HEIGHT = 560;

let tray;
let popover;
let store;
let refreshTimer;

const state = {
  hasToken: false,
  maskedToken: '',
  snapshot: null,
  loading: false,
  error: '',
  encryptionAvailable: false
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showPopover();
  });
}

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }

  store = createStore(app, safeStorage);
  state.encryptionAvailable = safeStorage.isEncryptionAvailable();
  loadPersistedState();
  createTray();
  createPopover();
  registerIpc();
  updateTray();

  if (state.hasToken) {
    refreshQuota();
  } else {
    showPopover();
  }

  refreshTimer = setInterval(() => refreshQuota(), REFRESH_INTERVAL_MS);
});

app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

function loadPersistedState() {
  const token = readStoredToken();
  const cache = store.getCache();

  state.hasToken = Boolean(token);
  state.maskedToken = token ? maskToken(token) : '';
  state.snapshot = token ? cache || null : null;
  state.error = token ? '' : '请先设置 token';
}

function readStoredToken() {
  try {
    return store.getToken();
  } catch {
    state.error = '无法解密已保存 token，请重新设置';
    return '';
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.svg'));
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => togglePopover());
  tray.on('right-click', () => {
    const menu = Menu.buildFromTemplate([
      { label: '刷新额度', click: () => refreshQuota(true) },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ]);
    tray.popUpContextMenu(menu);
  });
}

function createPopover() {
  popover = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#101216',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  popover.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  popover.on('blur', () => {
    if (!popover.webContents.isDevToolsOpened()) {
      popover.hide();
    }
  });
}

function registerIpc() {
  ipcMain.handle('quota:get-state', () => getPublicState());
  ipcMain.handle('quota:hide', () => {
    popover.hide();
  });
  ipcMain.handle('quota:save-token', async (_event, token) => {
    const cleanToken = String(token || '').trim();
    if (!cleanToken.startsWith('sk-') || cleanToken.length < 20) {
      throw new Error('请输入有效的 sk- token');
    }

    store.saveToken(cleanToken);
    state.hasToken = true;
    state.maskedToken = maskToken(cleanToken);
    state.error = '';
    state.snapshot = store.getCache();
    emitState();
    await refreshQuota(true);
    return getPublicState();
  });
  ipcMain.handle('quota:clear-token', () => {
    store.clearToken();
    state.hasToken = false;
    state.maskedToken = '';
    state.snapshot = null;
    state.error = '请先设置 token';
    state.loading = false;
    updateTray();
    emitState();
    return getPublicState();
  });
  ipcMain.handle('quota:refresh', async () => {
    await refreshQuota(true);
    return getPublicState();
  });
}

async function refreshQuota(showWindowOnMissingToken = false) {
  const token = readStoredToken();
  if (!token) {
    state.hasToken = false;
    state.maskedToken = '';
    state.error = '请先设置 token';
    state.loading = false;
    updateTray();
    emitState();
    if (showWindowOnMissingToken) {
      showPopover();
    }
    return;
  }

  state.hasToken = true;
  state.maskedToken = maskToken(token);
  state.loading = true;
  state.error = '';
  updateTray();
  emitState();

  try {
    const snapshot = await fetchQuotaSnapshot(token);
    state.snapshot = snapshot;
    state.error = '';
    store.saveCache(snapshot);
  } catch (error) {
    const cache = store.getCache();
    state.snapshot = cache ? { ...cache, status: 'stale' } : null;
    state.error = error.message || '查询失败';
  } finally {
    state.loading = false;
    updateTray();
    emitState();
  }
}

function togglePopover() {
  if (popover.isVisible()) {
    popover.hide();
  } else {
    showPopover();
  }
}

function showPopover() {
  if (!tray || !popover) {
    return;
  }

  positionPopover();
  popover.show();
  popover.focus();
  emitState();

  if (state.hasToken) {
    refreshQuota();
  }
}

function positionPopover() {
  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y
  });
  const workArea = display.workArea;
  const x = Math.min(
    Math.max(Math.round(trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2), workArea.x + 8),
    workArea.x + workArea.width - WINDOW_WIDTH - 8
  );
  const y = Math.round(trayBounds.y + trayBounds.height + 6);

  popover.setBounds({ x, y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT });
}

function updateTray() {
  if (!tray) {
    return;
  }

  const title = state.snapshot && !state.snapshot.unlimitedQuota
    ? `$${Number(state.snapshot.remainingUsd || 0).toFixed(2)}`
    : '';
  tray.setTitle(title);
  tray.setToolTip(buildTooltip(state));
}

function emitState() {
  if (!popover || popover.webContents.isDestroyed()) {
    return;
  }

  popover.webContents.send('quota:state', getPublicState());
}

function getPublicState() {
  return {
    hasToken: state.hasToken,
    maskedToken: state.maskedToken,
    snapshot: state.snapshot,
    loading: state.loading,
    error: state.error,
    encryptionAvailable: state.encryptionAvailable
  };
}
