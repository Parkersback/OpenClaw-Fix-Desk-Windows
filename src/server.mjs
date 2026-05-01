import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exec as execCallback, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 41891);

const NETWORK_TARGETS = [
  { id: 'openai', label: 'OpenAI API', url: 'https://api.openai.com/v1/models' },
  { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1/models' },
  { id: 'docs', label: 'OpenClaw Docs', url: 'https://docs.openclaw.ai' },
  { id: 'github', label: 'GitHub', url: 'https://github.com/openclaw/openclaw' },
];

const ACTIONS = {
  'restart-gateway': {
    label: '重启 Gateway',
    kind: 'local-repair',
    followUpHint: '已在后台发起 Gateway 重启，面板会自动复检。',
    run: () => queuePowerShell('openclaw gateway restart'),
  },
  'auto-repair': {
    label: '自动修复（doctor + restart）',
    kind: 'local-repair',
    followUpHint: '已在后台发起 doctor repair 和 Gateway 重启，面板会自动复检。',
    run: () => queuePowerShell('openclaw doctor --repair --yes --non-interactive; openclaw gateway restart'),
  },
  'relogin-openai': {
    label: '重新登录 OpenAI/Codex',
    kind: 'interactive',
    followUpHint: '终端里完成登录后，回到面板点“重新诊断”或等待自动复检。',
    run: () =>
      openTerminalWorkflow(
        'relogin-openai',
        [
          'Write-Host "OpenClaw Fix Desk · OpenAI/Codex 重新登录" -ForegroundColor Cyan',
          'Write-Host ""',
          'Write-Host "将运行: openclaw models auth login --provider openai-codex --set-default"',
          'Write-Host ""',
          'openclaw models auth login --provider openai-codex --set-default',
        ].join('\n'),
      ),
  },
  'relink-feishu': {
    label: '重新链接 Feishu',
    kind: 'interactive',
    followUpHint: '扫码或重新连接完成后，回到面板点“重新诊断”或等待自动复检。',
    run: () =>
      openTerminalWorkflow(
        'relink-feishu',
        [
          'Write-Host "OpenClaw Fix Desk · Feishu 重新链接" -ForegroundColor Cyan',
          'Write-Host ""',
          'Write-Host "将运行: openclaw channels login --channel feishu"',
          'Write-Host ""',
          'openclaw channels login --channel feishu',
        ].join('\n'),
      ),
  },
  'open-logs': {
    label: '打开日志终端',
    kind: 'interactive',
    followUpHint: '新终端会打开最近日志，方便看常见报错。',
    run: () =>
      openTerminalWorkflow(
        'open-logs',
        [
          'Write-Host "OpenClaw Fix Desk · 最近日志" -ForegroundColor Cyan',
          'Write-Host ""',
          'openclaw logs --plain --limit 300',
        ].join('\n'),
      ),
  },
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function sendText(res, statusCode, data, type = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': type });
  res.end(data);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runShell(command, { timeoutMs = 30000, maxBuffer = 4 * 1024 * 1024 } = {}) {
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await exec(command, {
      timeout: timeoutMs,
      maxBuffer,
      windowsHide: true,
      shell: process.env.ComSpec || 'cmd.exe',
    });
    return {
      ok: true,
      code: 0,
      signal: null,
      stdout,
      stderr,
      command,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      code: typeof error.code === 'number' ? error.code : -1,
      signal: error.signal ?? null,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? error.message ?? String(error),
      command,
      durationMs: Date.now() - startedAt,
      timedOut: Boolean(error.killed),
    };
  }
}

async function runPowerShell(script, options = {}) {
  const escaped = script.replace(/"/g, '`"');
  return runShell(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${escaped}"`, options);
}

async function readJsonCommand(command, timeoutMs = 30000) {
  const result = await runPowerShell(`${command} | Out-String`, { timeoutMs });
  const raw = (result.stdout || '').trim();
  try {
    return { ok: true, data: JSON.parse(raw), result };
  } catch (error) {
    return { ok: false, data: null, raw, parseError: error.message, result };
  }
}

async function queuePowerShell(script) {
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return {
    ok: true,
    queued: true,
    code: 0,
    signal: null,
    stdout: `已在后台执行: ${script}`,
    stderr: '',
    command: script,
    pid: child.pid,
    durationMs: 0,
  };
}

function relevantLogLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      /(refresh_token_reused|token refresh failed|sign in again|missing or expired|connect timeout|fetch failed|ENOTFOUND|ETIMEDOUT|ECONN|ECONNRESET|oauth|unauthorized|gateway|doctor|repair|failed|error|pairing required|websocket)/i.test(
        line,
      ),
    )
    .slice(-30);
}

function pickCodexProfiles(modelData) {
  return modelData?.auth?.oauth?.profiles?.filter((item) => item.provider === 'openai-codex') ?? [];
}

function summarizeGateway(result) {
  const raw = [result.stdout || '', result.stderr || ''].join('\n');
  return {
    running: /running/i.test(raw) && !/not running/i.test(raw),
    rpcOk: /RPC probe:\s+ok/i.test(raw) || /probe:\s+ok/i.test(raw) || /healthy/i.test(raw),
    listening: /Listening:\s+(.+)/i.exec(raw)?.[1]?.trim() ?? null,
    raw,
  };
}

function summarizeChannels(channelJson) {
  const data = channelJson?.data ?? {};
  const feishu = data.channels?.feishu ?? null;
  const account = data.channelAccounts?.feishu?.[0] ?? null;
  return {
    configured: Boolean(feishu?.configured),
    running: Boolean(feishu?.running),
    probeOk: account?.probe?.ok ?? feishu?.probe?.ok ?? null,
    botName: account?.probe?.botName ?? feishu?.probe?.botName ?? null,
    lastError: account?.lastError ?? feishu?.lastError ?? null,
    reconnectAttempts: account?.reconnectAttempts ?? 0,
    raw: data,
  };
}

function summarizeModels(modelJson, logSignals) {
  const data = modelJson?.data ?? {};
  const codexProfiles = pickCodexProfiles(data);
  const suspiciousProfiles = codexProfiles.filter(
    (item) => item.status !== 'ok' || (typeof item.remainingMs === 'number' && item.remainingMs < 0),
  );
  const refreshFailure = logSignals.some((line) => /refresh_token_reused|token refresh failed|sign in again|oauth|unauthorized/i.test(line));
  return {
    defaultModel: data?.defaultModel ?? null,
    codexProfiles,
    suspiciousProfiles,
    refreshFailure,
    hasAuthProblem: suspiciousProfiles.length > 0 || refreshFailure || codexProfiles.length === 0,
    raw: data,
  };
}

function headCheck(target) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const client = target.url.startsWith('https:') ? https : http;
    const request = client.request(
      target.url,
      {
        method: 'HEAD',
        headers: { 'user-agent': 'OpenClaw-Fix-Desk-Windows/0.1' },
      },
      (response) => {
        response.resume();
        resolve({
          id: target.id,
          label: target.label,
          url: target.url,
          ok: true,
          status: response.statusCode ?? null,
          ms: Date.now() - startedAt,
        });
      },
    );

    request.setTimeout(8000, () => request.destroy(new Error('timeout')));
    request.on('error', (error) => {
      resolve({
        id: target.id,
        label: target.label,
        url: target.url,
        ok: false,
        status: null,
        ms: Date.now() - startedAt,
        error: error.message,
      });
    });
    request.end();
  });
}

function summarizeNetwork(networkResults) {
  const failed = networkResults.filter((item) => !item.ok);
  return {
    targets: networkResults,
    failed,
    anyFailed: failed.length > 0,
  };
}

function buildSummary(issues) {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    if (counts[issue.severity] !== undefined) counts[issue.severity] += 1;
  }

  return {
    totalIssues: issues.length,
    counts,
    headline:
      issues.length === 0
        ? '当前未发现明显故障'
        : counts.critical > 0
          ? `发现 ${counts.critical} 个严重问题，建议先处理 Gateway 或登录状态。`
          : counts.warning > 0
            ? `发现 ${counts.warning} 个待处理问题，建议按顺序修复。`
            : '发现轻微波动，建议观察。',
    recommendedActions: Array.from(new Set(issues.flatMap((issue) => issue.actions || []))).slice(0, 5),
  };
}

function compareReports(beforeReport, afterReport) {
  const beforeIssues = beforeReport?.issues ?? [];
  const afterIssues = afterReport?.issues ?? [];
  const beforeMap = new Map(beforeIssues.map((issue) => [issue.id, issue]));
  const afterMap = new Map(afterIssues.map((issue) => [issue.id, issue]));
  return {
    resolved: beforeIssues.filter((issue) => !afterMap.has(issue.id)),
    persistent: afterIssues.filter((issue) => beforeMap.has(issue.id)),
    newIssues: afterIssues.filter((issue) => !beforeMap.has(issue.id)),
    beforeCount: beforeIssues.length,
    afterCount: afterIssues.length,
  };
}

function classifyIssues({ gateway, channels, models, network, logSignals }) {
  const issues = [];

  if (!gateway.running || !gateway.rpcOk) {
    issues.push({
      id: 'gateway-down',
      severity: 'critical',
      title: 'Gateway 运行异常',
      detail: 'OpenClaw Gateway 没有正常运行，或者探测结果异常。',
      actions: ['restart-gateway', 'auto-repair', 'open-logs'],
    });
  }

  if (models.hasAuthProblem) {
    const reason = models.refreshFailure
      ? '最近日志里出现了 Token refresh failed、refresh_token_reused、需要重新登录等信号。'
      : models.codexProfiles.length === 0
        ? '未发现可用的 openai-codex OAuth profile。'
        : '检测到 Codex OAuth profile 状态异常。';
    issues.push({
      id: 'openai-auth',
      severity: 'warning',
      title: 'OpenAI / Codex 登录可能失效',
      detail: reason,
      actions: ['relogin-openai', 'open-logs'],
    });
  }

  if (network.anyFailed) {
    issues.push({
      id: 'network',
      severity: 'warning',
      title: '网络连通性异常',
      detail: `失败目标: ${network.failed.map((item) => item.label).join('、')}`,
      actions: ['open-logs'],
    });
  }

  if (channels.configured && (!channels.running || channels.probeOk === false || channels.lastError)) {
    issues.push({
      id: 'feishu-relink',
      severity: 'warning',
      title: 'Feishu 通路异常',
      detail: channels.lastError || 'Feishu 当前未正常 running 或 probe 失败。',
      actions: ['relink-feishu', 'restart-gateway', 'open-logs'],
    });
  }

  const commonErrorLine = logSignals.find((line) => /(error|failed|timeout|unauthorized|pairing required|doctor)/i.test(line));
  if (commonErrorLine) {
    issues.push({
      id: 'common-log-errors',
      severity: issues.length === 0 ? 'info' : 'warning',
      title: '日志中发现常见报错信号',
      detail: commonErrorLine.slice(0, 180),
      actions: ['open-logs'],
    });
  }

  return issues;
}

async function openTerminalWorkflow(name, body) {
  const scriptPath = path.join(os.tmpdir(), `openclaw-fix-desk-${name}-${Date.now()}.ps1`);
  const script = [
    '$Host.UI.RawUI.WindowTitle = "OpenClaw Fix Desk"',
    'Clear-Host',
    body,
    'Write-Host ""',
    'Write-Host "按任意键关闭此窗口..." -ForegroundColor DarkGray',
    '$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")',
  ].join('\n');
  await fs.writeFile(scriptPath, script, 'utf8');
  const child = spawn(
    'powershell.exe',
    ['-NoExit', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    },
  );
  child.unref();
  return {
    ok: true,
    queued: true,
    code: 0,
    signal: null,
    stdout: `已打开交互终端：${scriptPath}`,
    stderr: '',
    command: scriptPath,
    pid: child.pid,
    durationMs: 0,
  };
}

async function runDiagnosis() {
  const [gatewayResult, channelJson, modelJson, logsResult, networkResults] = await Promise.all([
    runPowerShell('openclaw gateway status 2>&1 | Out-String', { timeoutMs: 30000 }),
    readJsonCommand('openclaw channels status --json --probe 2>$null', 30000),
    readJsonCommand('openclaw models status --json 2>$null', 30000),
    runPowerShell('openclaw logs --plain --limit 400 2>&1 | Out-String', { timeoutMs: 30000 }),
    Promise.all(NETWORK_TARGETS.map((target) => headCheck(target))),
  ]);

  const logSignals = relevantLogLines([logsResult.stdout || '', logsResult.stderr || '', gatewayResult.stderr || ''].join('\n'));
  const gateway = summarizeGateway(gatewayResult);
  const channels = summarizeChannels(channelJson);
  const models = summarizeModels(modelJson, logSignals);
  const network = summarizeNetwork(networkResults);
  const issues = classifyIssues({ gateway, channels, models, network, logSignals });

  return {
    generatedAt: new Date().toISOString(),
    healthy: issues.length === 0,
    summary: buildSummary(issues),
    gateway,
    channels,
    models,
    network,
    issues,
    logSignals,
    actions: Object.fromEntries(
      Object.entries(ACTIONS).map(([id, item]) => [
        id,
        { label: item.label, kind: item.kind ?? 'local-repair', followUpHint: item.followUpHint ?? null },
      ]),
    ),
  };
}

async function safeRunDiagnosis(fallbackReport = null) {
  try {
    return await runDiagnosis();
  } catch (error) {
    return fallbackReport ?? {
      generatedAt: new Date().toISOString(),
      healthy: false,
      summary: {
        totalIssues: 1,
        counts: { critical: 1, warning: 0, info: 0 },
        headline: `复检失败: ${error.message}`,
        recommendedActions: ['open-logs'],
      },
      gateway: { running: false, rpcOk: false, listening: null, raw: '' },
      channels: { configured: false, running: false, probeOk: null, botName: null, lastError: null, reconnectAttempts: 0, raw: {} },
      models: { defaultModel: null, codexProfiles: [], suspiciousProfiles: [], refreshFailure: false, hasAuthProblem: false, raw: {} },
      network: { targets: [], failed: [], anyFailed: true },
      issues: [{ id: 'recheck-failed', severity: 'critical', title: '复检失败', detail: error.message, actions: ['open-logs'] }],
      logSignals: [],
      actions: Object.fromEntries(
        Object.entries(ACTIONS).map(([id, item]) => [
          id,
          { label: item.label, kind: item.kind ?? 'local-repair', followUpHint: item.followUpHint ?? null },
        ]),
      ),
    };
  }
}

function iconForSeverity(severity) {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟠';
    default:
      return '🔵';
  }
}

function renderHomeHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenClaw Fix Desk Windows</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;
}

async function serveStatic(req, res, pathname) {
  if (pathname === '/') {
    sendText(res, 200, renderHomeHtml(), 'text/html; charset=utf-8');
    return;
  }

  const filePath = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const type =
      ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
          ? 'application/javascript; charset=utf-8'
          : 'text/plain; charset=utf-8';
    sendText(res, 200, data, type);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/diagnose') {
    const report = await runDiagnosis();
    sendJson(res, 200, report);
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/action/')) {
    const actionId = pathname.replace('/api/action/', '');
    const action = ACTIONS[actionId];
    if (!action) {
      sendJson(res, 404, { ok: false, error: `Unknown action: ${actionId}` });
      return;
    }

    const beforeReport = await safeRunDiagnosis();
    const result = await action.run();
    if (action.kind === 'local-repair') await sleep(5000);
    const report = await safeRunDiagnosis(beforeReport);
    const comparison = compareReports(beforeReport, report);
    sendJson(res, 200, {
      ok: result.ok,
      actionId,
      label: action.label,
      kind: action.kind ?? 'local-repair',
      followUpHint: action.followUpHint ?? null,
      result,
      beforeReport,
      report,
      comparison,
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/meta') {
    sendJson(res, 200, {
      name: 'OpenClaw Fix Desk Windows',
      version: '0.1.0',
      port: PORT,
      severities: {
        critical: iconForSeverity('critical'),
        warning: iconForSeverity('warning'),
        info: iconForSeverity('info'),
      },
    });
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenClaw Fix Desk Windows listening on http://127.0.0.1:${PORT}`);
});
