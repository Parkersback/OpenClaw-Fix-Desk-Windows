const actionLabels = {
  'restart-gateway': '重启 Gateway',
  'auto-repair': '自动修复（doctor + restart）',
  'relogin-openai': '重新登录 OpenAI/Codex',
  'relink-feishu': '重新链接 Feishu',
  'open-logs': '打开日志终端',
};

const state = {
  loading: false,
  data: null,
  lastAction: null,
  autoRefresh: true,
};

const app = document.querySelector('#app');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function badgeClass(ok) {
  return ok ? 'ok' : 'bad';
}

function severityEmoji(severity) {
  if (severity === 'critical') return '🔴';
  if (severity === 'warning') return '🟠';
  return '🔵';
}

function actionButton(id, ghost = true) {
  return `<button class="${ghost ? 'ghost' : ''}" data-action="${id}">${escapeHtml(actionLabels[id] || id)}</button>`;
}

function issueActions(issue) {
  return (issue.actions || []).map((id) => actionButton(id)).join('');
}

function networkRows(data) {
  return data.network.targets
    .map(
      (item) => `
      <div class="row-item">
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <div class="sub">${escapeHtml(item.url)}</div>
        </div>
        <div class="pill ${badgeClass(item.ok)}">${item.ok ? `OK · ${item.status ?? '-'} · ${item.ms}ms` : `失败 · ${escapeHtml(item.error || '')}`}</div>
      </div>`,
    )
    .join('');
}

function profileRows(data) {
  const profiles = data.models.codexProfiles || [];
  if (!profiles.length) {
    return '<div class="empty">未发现 openai-codex OAuth profile</div>';
  }
  return profiles
    .map(
      (item) => `
      <div class="row-item">
        <div>
          <strong>${escapeHtml(item.label || item.profileId)}</strong>
          <div class="sub">status: ${escapeHtml(item.status)}${typeof item.remainingMs === 'number' ? ` · remainingMs: ${item.remainingMs}` : ''}</div>
        </div>
        <div class="pill ${item.status === 'ok' && Number(item.remainingMs) >= 0 ? 'ok' : 'warn'}">${escapeHtml(item.status)}</div>
      </div>`,
    )
    .join('');
}

function comparisonBlock(lastAction) {
  if (!lastAction?.comparison) return '';
  const { resolved = [], persistent = [], newIssues = [], beforeCount = 0, afterCount = 0 } = lastAction.comparison;
  return `
    <div class="compare-grid">
      <div class="mini-card">
        <div class="mini-label">修复前后</div>
        <div class="mini-value">${beforeCount} → ${afterCount}</div>
      </div>
      <div class="mini-card">
        <div class="mini-label">已解决</div>
        <div class="mini-value">${resolved.length}</div>
        <div class="sub">${resolved.length ? escapeHtml(resolved.map((item) => item.title).join('、')) : '暂无'}</div>
      </div>
      <div class="mini-card">
        <div class="mini-label">仍存在</div>
        <div class="mini-value">${persistent.length}</div>
        <div class="sub">${persistent.length ? escapeHtml(persistent.map((item) => item.title).join('、')) : '暂无'}</div>
      </div>
      <div class="mini-card">
        <div class="mini-label">新增</div>
        <div class="mini-value">${newIssues.length}</div>
        <div class="sub">${newIssues.length ? escapeHtml(newIssues.map((item) => item.title).join('、')) : '暂无'}</div>
      </div>
    </div>`;
}

function recommendedActions(data) {
  const ids = data.summary?.recommendedActions || [];
  if (!ids.length) return '<div class="empty">当前没有特别推荐的下一步动作</div>';
  return ids.map((id) => actionButton(id)).join('');
}

function render() {
  if (!state.data) {
    app.innerHTML = `
      <main class="shell">
        <section class="hero card">
          <h1>OpenClaw Fix Desk Windows</h1>
          <p>本地修复面板加载中…</p>
        </section>
      </main>`;
    return;
  }

  const data = state.data;
  const issuesHtml = data.issues.length
    ? data.issues
        .map(
          (issue) => `
          <div class="issue card severity-${issue.severity}">
            <div class="issue-head">
              <div>
                <h3>${severityEmoji(issue.severity)} ${escapeHtml(issue.title)}</h3>
                <p>${escapeHtml(issue.detail)}</p>
              </div>
            </div>
            <div class="actions inline">${issueActions(issue)}</div>
          </div>`,
        )
        .join('')
    : '<div class="card"><div class="okline">✅ 当前未发现明显故障</div></div>';

  const lastAction = state.lastAction
    ? `
      <section class="card">
        <h2>最近动作</h2>
        <div class="row-item">
          <div>
            <strong>${escapeHtml(state.lastAction.label)}</strong>
            <div class="sub">${state.lastAction.ok ? '动作已执行，结果已复检' : '动作执行失败或部分失败'}</div>
          </div>
          <div class="pill ${badgeClass(state.lastAction.ok)}">${state.lastAction.ok ? 'OK' : 'FAIL'}</div>
        </div>
        ${state.lastAction.followUpHint ? `<div class="notice">${escapeHtml(state.lastAction.followUpHint)}</div>` : ''}
        ${comparisonBlock(state.lastAction)}
        <pre>${escapeHtml((state.lastAction.stdout || '') + (state.lastAction.stderr ? '\n' + state.lastAction.stderr : ''))}</pre>
      </section>`
    : '';

  app.innerHTML = `
    <main class="shell">
      <section class="hero card">
        <div>
          <h1>OpenClaw Fix Desk Windows</h1>
          <p>桌面上的 OpenClaw 常见问题修复台。先诊断，再修，再复检。</p>
          <div class="sub">最近诊断: ${escapeHtml(data.generatedAt)}</div>
          <div class="headline">${escapeHtml(data.summary?.headline || '')}</div>
        </div>
        <div class="actions">
          <button data-action="diagnose">重新诊断</button>
          <button class="ghost" data-action="restart-gateway">重启 Gateway</button>
          <button class="ghost" data-action="auto-repair">自动修复</button>
          <button class="ghost" data-action="toggle-auto-refresh">${state.autoRefresh ? '自动复检：开' : '自动复检：关'}</button>
        </div>
      </section>

      <section class="grid top-grid">
        <div class="card stat">
          <div class="label">当前问题数</div>
          <div class="value">${data.summary?.totalIssues ?? data.issues.length}</div>
          <div class="sub">critical ${data.summary?.counts?.critical ?? 0} · warning ${data.summary?.counts?.warning ?? 0} · info ${data.summary?.counts?.info ?? 0}</div>
        </div>
        <div class="card stat">
          <div class="label">Gateway</div>
          <div class="value">${data.gateway.running && data.gateway.rpcOk ? '正常' : '异常'}</div>
          <div class="sub">${escapeHtml(data.gateway.listening || '未探测到监听地址')}</div>
        </div>
        <div class="card stat">
          <div class="label">OpenAI / Codex</div>
          <div class="value">${data.models.hasAuthProblem ? '待处理' : '正常'}</div>
          <div class="sub">${escapeHtml(data.models.defaultModel || '-')}</div>
        </div>
        <div class="card stat">
          <div class="label">网络</div>
          <div class="value">${data.network.anyFailed ? '有异常' : '正常'}</div>
          <div class="sub">${data.network.failed.length ? escapeHtml(data.network.failed.map((i) => i.label).join('、')) : '关键目标均可达'}</div>
        </div>
      </section>

      <section class="card">
        <div class="section-head">
          <h2>建议下一步</h2>
        </div>
        <div class="actions">${recommendedActions(data)}</div>
      </section>

      <section>
        <h2>问题列表</h2>
        ${issuesHtml}
      </section>

      <section class="grid two-col">
        <div class="card">
          <div class="section-head">
            <h2>快捷动作</h2>
          </div>
          <div class="actions stack">
            <button data-action="relogin-openai">重新登录 OpenAI/Codex</button>
            <button data-action="relink-feishu">重新链接 Feishu</button>
            <button data-action="restart-gateway">重启 Gateway</button>
            <button data-action="auto-repair">自动修复（doctor + restart）</button>
            <button data-action="open-logs">打开日志终端</button>
          </div>
        </div>

        <div class="card">
          <div class="section-head">
            <h2>Feishu 状态</h2>
          </div>
          <div class="row-item">
            <div><strong>configured</strong></div>
            <div class="pill ${badgeClass(data.channels.configured)}">${data.channels.configured}</div>
          </div>
          <div class="row-item">
            <div><strong>running</strong></div>
            <div class="pill ${badgeClass(data.channels.running)}">${data.channels.running}</div>
          </div>
          <div class="row-item">
            <div><strong>probe</strong></div>
            <div class="pill ${data.channels.probeOk === false ? 'bad' : 'ok'}">${data.channels.probeOk === null ? '-' : data.channels.probeOk}</div>
          </div>
          <div class="sub">${escapeHtml(data.channels.botName || '-')}${data.channels.lastError ? ` · ${escapeHtml(data.channels.lastError)}` : ''}</div>
        </div>
      </section>

      <section class="grid two-col">
        <div class="card">
          <h2>网络探测</h2>
          <div class="list">${networkRows(data)}</div>
        </div>
        <div class="card">
          <h2>Codex OAuth Profiles</h2>
          <div class="list">${profileRows(data)}</div>
        </div>
      </section>

      <section class="card">
        <h2>最近关键信号</h2>
        ${data.logSignals.length ? `<pre>${escapeHtml(data.logSignals.join('\n'))}</pre>` : '<div class="empty">最近没有命中关键错误模式</div>'}
      </section>

      ${lastAction}
    </main>`;

  app.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.action;
      if (id === 'diagnose') {
        await loadDiagnosis();
        return;
      }
      if (id === 'toggle-auto-refresh') {
        state.autoRefresh = !state.autoRefresh;
        render();
        return;
      }
      if (id === 'auto-repair' && !confirm('这会执行 openclaw doctor --repair 并重启 gateway，继续吗？')) {
        return;
      }
      await runAction(id);
    });
  });
}

async function loadDiagnosis() {
  state.loading = true;
  render();
  try {
    const response = await fetch('/api/diagnose');
    state.data = await response.json();
  } catch (error) {
    state.data = {
      generatedAt: new Date().toISOString(),
      summary: { totalIssues: 1, counts: { critical: 1, warning: 0, info: 0 }, headline: error.message, recommendedActions: [] },
      issues: [
        {
          severity: 'critical',
          title: '面板无法加载诊断结果',
          detail: error.message,
          actions: [],
        },
      ],
      gateway: { running: false, rpcOk: false, listening: null },
      channels: { configured: false, running: false, probeOk: null, botName: null, lastError: null },
      models: { hasAuthProblem: false, defaultModel: null, codexProfiles: [] },
      network: { anyFailed: true, failed: [], targets: [] },
      logSignals: [],
    };
  }
  state.loading = false;
  render();
}

async function runAction(actionId) {
  const response = await fetch(`/api/action/${actionId}`, { method: 'POST' });
  const payload = await response.json();
  state.lastAction = {
    label: payload.label || actionLabels[actionId] || actionId,
    ok: Boolean(payload.ok),
    stdout: payload.result?.stdout || '',
    stderr: payload.result?.stderr || '',
    followUpHint: payload.followUpHint || '',
    kind: payload.kind || 'local-repair',
    comparison: payload.comparison || null,
  };
  state.data = payload.report;
  render();

  if ((payload.kind || 'local-repair') === 'local-repair') {
    setTimeout(() => {
      loadDiagnosis();
    }, 6000);
  }
}

setInterval(() => {
  if (!state.autoRefresh || document.hidden) return;
  loadDiagnosis();
}, 15000);

loadDiagnosis();
