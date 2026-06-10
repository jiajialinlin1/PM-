const elements = {
  closeButton: document.querySelector('#closeButton'),
  statusBanner: document.querySelector('#statusBanner'),
  remainingUsd: document.querySelector('#remainingUsd'),
  totalUsd: document.querySelector('#totalUsd'),
  usedUsd: document.querySelector('#usedUsd'),
  tokenName: document.querySelector('#tokenName'),
  expiresAt: document.querySelector('#expiresAt'),
  updatedAt: document.querySelector('#updatedAt'),
  maskedToken: document.querySelector('#maskedToken'),
  refreshButton: document.querySelector('#refreshButton'),
  showSettingsButton: document.querySelector('#showSettingsButton'),
  settingsPanel: document.querySelector('#settingsPanel'),
  tokenInput: document.querySelector('#tokenInput'),
  saveTokenButton: document.querySelector('#saveTokenButton'),
  clearTokenButton: document.querySelector('#clearTokenButton'),
  logsList: document.querySelector('#logsList')
};

let currentState = null;

elements.closeButton.addEventListener('click', () => window.quotaAPI.hide());
elements.refreshButton.addEventListener('click', () => runAction(() => window.quotaAPI.refresh()));
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

  renderBanner(state);
  renderLogs(snapshot?.recentLogs || []);

  if (!state.hasToken) {
    elements.settingsPanel.hidden = false;
  }
}

function renderBanner(state) {
  elements.statusBanner.className = 'banner';

  if (!state.encryptionAvailable) {
    elements.statusBanner.textContent = '系统加密能力不可用，无法保存 token';
    elements.statusBanner.classList.add('error');
    return;
  }

  if (!state.hasToken) {
    elements.statusBanner.textContent = '请先设置 token，应用会将它加密保存在本机。';
    elements.statusBanner.classList.add('warn');
    return;
  }

  if (state.loading) {
    elements.statusBanner.textContent = '正在查询额度...';
    return;
  }

  if (state.error && state.snapshot?.status === 'stale') {
    elements.statusBanner.textContent = `${state.error}。当前显示最近缓存数据，不会继续频繁请求。`;
    elements.statusBanner.classList.add('warn');
    return;
  }

  if (state.error) {
    elements.statusBanner.textContent = state.error;
    elements.statusBanner.classList.add('error');
    return;
  }

  elements.statusBanner.textContent = '额度数据已更新。';
  elements.statusBanner.classList.add('ok');
}

function renderLogs(logs) {
  if (!logs.length) {
    elements.logsList.innerHTML = '<div class="empty">暂无最近调用记录</div>';
    return;
  }

  elements.logsList.replaceChildren(...logs.map((log) => {
    const item = document.createElement('article');
    item.className = 'log-item';

    const main = document.createElement('div');
    main.className = 'log-main';

    const model = document.createElement('strong');
    model.textContent = log.modelName || '未知模型';

    const quota = document.createElement('span');
    quota.textContent = formatUsd(log.quotaUsd, 6);

    const meta = document.createElement('div');
    meta.className = 'log-meta';
    meta.textContent = `${formatDateTime(log.createdAt, '未知时间')} · 提示 ${log.promptTokens || 0} · 补全 ${log.completionTokens || 0}`;

    main.append(model, quota);
    item.append(main, meta);
    return item;
  }));
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
