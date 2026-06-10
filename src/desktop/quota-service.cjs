const API_BASE_URL = 'https://8s.hk';
const QUOTA_PER_USD = 500000;
const REQUEST_TIMEOUT_MS = 20000;

function quotaToUsd(value) {
  const numeric = Number(value || 0);
  return Number((numeric / QUOTA_PER_USD).toFixed(6));
}

function formatUsd(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '未知';
  }

  return `$${Number(value).toFixed(digits)}`;
}

function formatDateTime(value) {
  if (!value) {
    return '永不过期';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function maskToken(token) {
  if (!token) {
    return '';
  }

  if (token.length <= 14) {
    return `${token.slice(0, 4)}...`;
  }

  return `${token.slice(0, 7)}...${token.slice(-4)}`;
}

async function fetchJson(pathname, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${pathname}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.message || `请求失败：HTTP ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRecentLogs(token) {
  try {
    const payload = await fetchJson('/api/log/token', token);
    const logs = payload?.success && Array.isArray(payload.data) ? payload.data : [];

    return logs
      .slice()
      .reverse()
      .slice(0, 8)
      .map((log) => ({
        createdAt: log.created_at ? new Date(Number(log.created_at) * 1000).toISOString() : null,
        modelName: String(log.model_name || '未知'),
        promptTokens: Number(log.prompt_tokens || 0),
        completionTokens: Number(log.completion_tokens || 0),
        quotaUsd: quotaToUsd(log.quota)
      }));
  } catch {
    return [];
  }
}

async function fetchQuotaSnapshot(token) {
  const payload = await fetchJson('/api/usage/token/', token);

  if (!payload?.code || !payload.data) {
    throw new Error(payload?.message || '查询令牌信息失败');
  }

  const data = payload.data;
  const unlimitedQuota = Boolean(data.unlimited_quota);
  const expiresAt = Number(data.expires_at || 0) === 0
    ? null
    : new Date(Number(data.expires_at) * 1000).toISOString();

  const snapshot = {
    tokenName: String(data.name || '未知'),
    totalUsd: unlimitedQuota ? null : quotaToUsd(data.total_granted),
    remainingUsd: unlimitedQuota ? null : quotaToUsd(data.total_available),
    usedUsd: unlimitedQuota ? null : quotaToUsd(data.total_used),
    expiresAt,
    status: 'fresh',
    updatedAt: new Date().toISOString(),
    unlimitedQuota,
    recentLogs: await fetchRecentLogs(token)
  };

  return snapshot;
}

function buildTooltip({ hasToken, snapshot, loading, error }) {
  if (!hasToken) {
    return 'Token Quota Monitor\n未设置 token';
  }

  if (loading && !snapshot) {
    return 'Token Quota Monitor\n正在查询额度...';
  }

  if (!snapshot) {
    return `Token Quota Monitor\n${error || '暂无额度数据'}`;
  }

  const staleLabel = snapshot.status === 'stale' ? '（缓存）' : '';
  const remaining = snapshot.unlimitedQuota ? '无限制' : formatUsd(snapshot.remainingUsd, 3);
  const total = snapshot.unlimitedQuota ? '无限' : formatUsd(snapshot.totalUsd, 3);
  const used = snapshot.unlimitedQuota ? '不计算' : formatUsd(snapshot.usedUsd, 3);

  return [
    `Token Quota Monitor ${staleLabel}`.trim(),
    `令牌：${snapshot.tokenName}`,
    `剩余：${remaining}`,
    `总额：${total}`,
    `已用：${used}`,
    `有效期：${formatDateTime(snapshot.expiresAt)}`,
    `更新：${formatDateTime(snapshot.updatedAt)}`
  ].join('\n');
}

module.exports = {
  fetchQuotaSnapshot,
  formatDateTime,
  formatUsd,
  maskToken,
  buildTooltip
};
