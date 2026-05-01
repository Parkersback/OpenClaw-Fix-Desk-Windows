# OpenClaw Fix Desk Windows v0.1

这是一个给 Windows 用的本地修复面板，专门处理 OpenClaw 常见问题。

## 当前 v0 范围

- OpenClaw Gateway 运行状态检查
- 一键重启 Gateway
- 自动修复（`openclaw doctor --repair --yes --non-interactive` + `openclaw gateway restart`）
- OpenAI / Codex OAuth 失效检测
- 一键打开 PowerShell 终端重新登录 OpenAI / Codex
- 可选的 Feishu 重新链接入口
- 网络连通性检测
- 最近关键日志信号展示
- 常见报错诊断和推荐下一步动作

## 启动

双击：

- `start.cmd`

默认打开：

- `http://127.0.0.1:41891`

## 停止

双击：

- `stop.cmd`

## 说明

这是一个本地 Web 形式的桌面工具，不依赖额外 npm 包。

某些修复动作必须进入交互式终端，例如：

- `openclaw models auth login --provider openai-codex --set-default`
- `openclaw channels login --channel feishu`

所以 v0 会直接帮你打开 PowerShell，并跑正确命令，而不是假装在网页里能完全自动完成。

## 运行前提

- 机器上已经安装 Node.js
- `openclaw` 命令可在 PowerShell / CMD 中直接使用

## 后续可加

- 更细的错误分类
- 真正桌面化封装（Electron / Tauri）
- 历史诊断记录
- 自动复检历史
- 更多 provider / channel 修复入口
