const statusLabels = {
  planned: '待规划',
  building: '开发中',
  shipped: '已上线'
};

const priorityLabels = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级'
};

const state = {
  features: [],
  feedback: []
};

const elements = {
  healthStatus: document.querySelector('#healthStatus'),
  health: document.querySelector('.health'),
  featureForm: document.querySelector('#featureForm'),
  feedbackForm: document.querySelector('#feedbackForm'),
  featureList: document.querySelector('#featureList'),
  feedbackList: document.querySelector('#feedbackList'),
  plannedCount: document.querySelector('#plannedCount'),
  buildingCount: document.querySelector('#buildingCount'),
  shippedCount: document.querySelector('#shippedCount')
};

elements.featureForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  await request('/api/features', {
    method: 'POST',
    body: {
      title: form.get('title'),
      description: form.get('description'),
      priority: form.get('priority')
    }
  });

  event.currentTarget.reset();
  await loadData();
});

elements.feedbackForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  await request('/api/feedback', {
    method: 'POST',
    body: {
      author: form.get('author'),
      message: form.get('message'),
      source: 'manual'
    }
  });

  event.currentTarget.reset();
  await loadData();
});

await boot();

async function boot() {
  try {
    await request('/api/health');
    elements.healthStatus.textContent = 'Connected';
    elements.health.classList.add('is-ok');
  } catch {
    elements.healthStatus.textContent = 'Offline';
  }

  await loadData();
}

async function loadData() {
  const [{ features }, { feedback }] = await Promise.all([
    request('/api/features'),
    request('/api/feedback')
  ]);

  state.features = features;
  state.feedback = feedback;

  renderMetrics();
  renderFeatures();
  renderFeedback();
}

function renderMetrics() {
  elements.plannedCount.textContent = countFeatures('planned');
  elements.buildingCount.textContent = countFeatures('building');
  elements.shippedCount.textContent = countFeatures('shipped');
}

function countFeatures(status) {
  return state.features.filter((feature) => feature.status === status).length;
}

function renderFeatures() {
  if (!state.features.length) {
    elements.featureList.innerHTML = '<div class="empty">还没有功能，先添加一个核心能力。</div>';
    return;
  }

  elements.featureList.replaceChildren(
    ...state.features.map((feature) => {
      const article = document.createElement('article');
      article.className = 'item';

      const header = document.createElement('div');
      header.className = 'item-title';

      const title = document.createElement('h3');
      title.textContent = feature.title;

      const status = document.createElement('select');
      status.className = 'status-select';
      status.setAttribute('aria-label', `更新 ${feature.title} 状态`);
      status.innerHTML = Object.entries(statusLabels)
        .map(([value, label]) => `<option value="${value}">${label}</option>`)
        .join('');
      status.value = feature.status;
      status.addEventListener('change', async () => {
        await request(`/api/features/${feature.id}/status`, {
          method: 'PATCH',
          body: { status: status.value }
        });
        await loadData();
      });

      const description = document.createElement('p');
      description.textContent = feature.description || '暂无描述';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `
        <span class="pill">${statusLabels[feature.status]}</span>
        <span class="pill">${priorityLabels[feature.priority]}</span>
      `;

      header.append(title, status);
      article.append(header, description, meta);
      return article;
    })
  );
}

function renderFeedback() {
  if (!state.feedback.length) {
    elements.feedbackList.innerHTML = '<div class="empty">还没有反馈，记录一次访谈或用户信号。</div>';
    return;
  }

  elements.feedbackList.replaceChildren(
    ...state.feedback.map((feedback) => {
      const article = document.createElement('article');
      article.className = 'item';
      article.innerHTML = `
        <div class="item-title">
          <h3>${escapeHtml(feedback.author)}</h3>
          <span class="pill">${escapeHtml(feedback.source)}</span>
        </div>
        <p>${escapeHtml(feedback.message)}</p>
      `;
      return article;
    })
  );
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Request failed');
  }

  return payload;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
