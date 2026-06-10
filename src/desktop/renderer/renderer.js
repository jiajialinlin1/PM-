const elements = {
  statusPill: document.querySelector('#statusPill'),
  remainingUsd: document.querySelector('#remainingUsd'),
  totalUsd: document.querySelector('#totalUsd'),
  usedUsd: document.querySelector('#usedUsd'),
  usedMetric: document.querySelector('#usedMetric'),
  tokenName: document.querySelector('#tokenName'),
  expiresAt: document.querySelector('#expiresAt'),
  updatedAt: document.querySelector('#updatedAt'),
  maskedToken: document.querySelector('#maskedToken'),
  refreshButton: document.querySelector('#refreshButton'),
  showSettingsButton: document.querySelector('#showSettingsButton'),
  settingsPanel: document.querySelector('#settingsPanel'),
  tokenInput: document.querySelector('#tokenInput'),
  saveTokenButton: document.querySelector('#saveTokenButton'),
  clearTokenButton: document.querySelector('#clearTokenButton')
};

let currentState = null;
let hideTimer = null;

elements.refreshButton.addEventListener('click', () => runAction(() => window.quotaAPI.refresh()));
elements.usedMetric.addEventListener('click', () => window.quotaAPI.openUsage());
elements.usedMetric.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    window.quotaAPI.openUsage();
  }
});
elements.showSettingsButton.addEventListener('click', () => {
  elements.settingsPanel.hidden = !elements.settingsPanel.hidden;
  if (!elements.settingsPanel.hidden) {
    elements.tokenInput.focus();
  }
});
elements.saveTokenButton.addEventListener('click', () => saveToken());
elements.clearTokenButton.addEventListener('click', () => runAction(() => window.quotaAPI.clearToken()));
elements.tokenInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    saveToken();
  }
});
document.body.addEventListener('mouseenter', () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
});
document.body.addEventListener('mouseleave', () => {
  hideTimer = setTimeout(() => window.quotaAPI.hide(), 50);
});

window.quotaAPI.onStateChange(render);
window.quotaAPI.getState().then(render);

async function saveToken() {
  await runAction(async () => {
    await window.quotaAPI.saveToken(elements.tokenInput.value);
    elements.tokenInput.value = '';
    elements.settingsPanel.hidden = true;
  });
}

async function runAction(action) {
  setBusy(true);
  try {
    const state = await action();
    if (state) {
      render(state);
    }
  } catch (error) {
    render({
      ...currentState,
      loading: false,
      error: error.message || '操作失败'
    });
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  elements.refreshButton.disabled = isBusy;
  elements.saveTokenButton.disabled = isBusy;
  elements.clearTokenButton.disabled = isBusy;
}

function render(state) {
  currentState = state;
  const snapshot = state.snapshot;

  elements.maskedToken.textContent = state.maskedToken || '未设置';
  elements.remainingUsd.textContent = snapshot
    ? snapshot.unlimitedQuota ? '无限制' : formatUsd(snapshot.remainingUsd, 3)
    : '未知';
  elements.totalUsd.textContent = snapshot
    ? snapshot.unlimitedQuota ? '无限' : formatUsd(snapshot.totalUsd, 3)
    : '未知';
  elements.usedUsd.textContent = snapshot
    ? snapshot.unlimitedQuota ? '不计算' : formatUsd(snapshot.usedUsd, 3)
    : '未知';
  elements.tokenName.textContent = snapshot?.tokenName || '未知';
  elements.expiresAt.textContent = formatDateTime(snapshot?.expiresAt, '永不过期');
  elements.updatedAt.textContent = formatDateTime(snapshot?.updatedAt, '未知');

  renderStatus(state);

  if (!state.hasToken) {
    elements.settingsPanel.hidden = false;
  }
}

function renderStatus(state) {
  elements.statusPill.className = 'status-pill';
  elements.statusPill.title = '';
  if (!state.encryptionAvailable) {
    elements.statusPill.textContent = '加密不可用';
    elements.statusPill.classList.add('error');
    return;
  }

  if (!state.hasToken) {
    elements.statusPill.textContent = '未设置';
    elements.statusPill.classList.add('warn');
    return;
  }

  if (state.loading) {
    elements.statusPill.textContent = '查询中';
    elements.statusPill.classList.add('loading');
    return;
  }

  if (state.error && state.snapshot?.status === 'stale') {
    elements.statusPill.textContent = state.error.includes('限流') ? '限流缓存' : '缓存';
    elements.statusPill.title = `${state.error}。当前显示最近缓存数据，不会继续频繁请求。`;
    elements.statusPill.classList.add('warn');
    return;
  }

  if (state.error) {
    elements.statusPill.textContent = state.error.includes('限流') ? '限流' : '错误';
    elements.statusPill.title = state.error;
    elements.statusPill.classList.add('error');
    return;
  }

  elements.statusPill.textContent = '已更新';
  elements.statusPill.classList.add('ok');
}

function formatUsd(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '未知';
  }

  return `$${Number(value).toFixed(digits)}`;
}

function formatDateTime(value, fallback) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}
