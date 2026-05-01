# OpenClaw Fix Desk Windows

A local repair dashboard for **OpenClaw on Windows**.

一个面向 **Windows 平台 OpenClaw 用户** 的本地修复面板。

It helps users quickly diagnose and repair common OpenClaw problems, especially:

它主要帮助用户快速诊断和处理 OpenClaw 常见问题，尤其是：

- Gateway not running or unhealthy
- Gateway 无法正常运行或状态异常
- OpenAI / Codex login expired or needs relogin
- OpenAI / Codex 登录失效或需要重新登录
- Common local repair flows such as `doctor --repair` + restart
- 常见本地修复流程，例如 `doctor --repair` + 重启
- Quick access to logs and recommended next actions
- 快速查看日志和下一步建议

---

## 1. What this project is | 这个项目是做什么的

**OpenClaw Fix Desk Windows** is a lightweight local web utility.
It is designed for people who already use OpenClaw on Windows and want a faster way to:

**OpenClaw Fix Desk Windows** 是一个轻量级本地 Web 修复工具。
它适合已经在 Windows 上使用 OpenClaw 的用户，用来更快地：

- check whether Gateway is healthy
- 检查 Gateway 是否正常
- repair common local issues
- 修复常见本地问题
- reopen login flows for OpenAI / Codex
- 重新打开 OpenAI / Codex 登录流程
- inspect common error signals from logs
- 检查日志中的常见报错信号
- get a clearer next step instead of manually guessing what to do
- 获得更明确的下一步建议，而不是手动猜测该怎么处理

This is **not** a generic tool for every Windows user.
It is a helper utility for users who already have **Node.js + OpenClaw** installed.

它**不是**一个面向所有 Windows 普通用户的通用软件。
它更准确地说，是给已经安装了 **Node.js + OpenClaw** 的用户准备的辅助修复工具。

---

## 2. Current scope (v0) | 当前版本范围（v0）

### Included now | 当前已包含

- OpenClaw Gateway status diagnosis
- OpenClaw Gateway 状态诊断
- One-click Gateway restart
- 一键重启 Gateway
- Automatic repair flow:
  - `openclaw doctor --repair --yes --non-interactive`
  - `openclaw gateway restart`
- 自动修复流程：
  - `openclaw doctor --repair --yes --non-interactive`
  - `openclaw gateway restart`
- OpenAI / Codex OAuth issue detection
- OpenAI / Codex OAuth 登录问题检测
- One-click terminal relogin flow for OpenAI / Codex
- 一键打开终端重新登录 OpenAI / Codex
- Optional Feishu relink entry
- 可选的 Feishu 重新链接入口
- Basic network reachability checks
- 基础网络连通性检测
- Common log error signal display
- 常见日志报错信号展示
- Suggested next actions after diagnosis
- 诊断后的推荐下一步动作

### Not included yet | 当前还没有做

- Full desktop packaging as a real native Windows app
- 真正原生桌面程序级别的完整封装
- Zero-dependency setup for users who never installed OpenClaw
- 面向完全没装 OpenClaw 用户的零依赖开箱即用体验
- Fully automatic interactive auth flows inside the web page
- 在网页内部完全自动完成交互式认证流程
- Complex config editing or system-level network repair
- 复杂配置修改或系统网络自动修复

---

## 3. Main features | 主要功能

### 3.1 Diagnosis | 诊断

The dashboard can inspect:

面板可以检查：

- whether Gateway appears to be running
- Gateway 是否看起来正在运行
- whether Gateway probe / health looks abnormal
- Gateway 探测 / 健康状态是否异常
- whether OpenAI / Codex auth looks suspicious
- OpenAI / Codex 认证状态是否可疑
- whether network targets are reachable
- 关键网络目标是否可访问
- whether logs contain common failure patterns
- 日志中是否出现常见失败模式

### 3.2 Repair actions | 修复动作

Built-in actions currently include:

当前内置动作包括：

- **Restart Gateway**
- **重启 Gateway**
- **Auto Repair** (`doctor --repair` + restart)
- **自动修复**（`doctor --repair` + restart）
- **Relogin OpenAI / Codex**
- **重新登录 OpenAI / Codex**
- **Relink Feishu** (optional)
- **重新链接 Feishu**（可选）
- **Open logs terminal**
- **打开日志终端**

### 3.3 Interactive terminal flows | 交互式终端流程

Some operations cannot be safely faked inside a web page.
For example:

有些操作不适合假装在网页里自动完成。
例如：

- `openclaw models auth login --provider openai-codex --set-default`
- `openclaw channels login --channel feishu`

So for those cases, this tool opens a PowerShell terminal and runs the correct command.

所以对于这些场景，这个工具会直接帮你打开 PowerShell 终端，并执行正确命令。

---

## 4. Project structure | 项目结构

```text
OpenClaw-Fix-Desk-Windows/
├─ public/                  # Frontend assets | 前端资源
├─ src/                     # Local server logic | 本地服务逻辑
├─ start.cmd                # Start the app | 启动程序
├─ stop.cmd                 # Stop the app | 停止程序
├─ launch-hidden.vbs        # Hidden launch helper | 静默启动辅助
├─ package-portable.ps1     # Build portable package | 打包便携版
├─ PORTABLE-README.txt      # Portable notes | 便携版说明
└─ README.md                # This file | 本说明
```

---

## 5. Requirements | 运行前提

Before using this tool, the machine should already have:

在使用这个工具之前，目标机器最好已经具备：

- **Windows**
- **Node.js installed**
- **OpenClaw installed**
- `openclaw` available in PowerShell / CMD PATH
- Optional: configured OpenClaw channels / auth profiles
- 可选：已经配置好的 OpenClaw 渠道 / 认证资料

If those prerequisites are missing, this tool may still open, but some repair actions will fail.

如果这些前提没有满足，这个工具可能仍然能打开，但部分修复动作会失败。

---

## 6. How to run | 如何启动

### Standard start | 标准启动

Double-click:

双击：

- `start.cmd`

Then open:

然后打开：

- `http://127.0.0.1:41891`

### Hidden start | 静默启动

Double-click:

双击：

- `launch-hidden.vbs`

### Stop | 停止

Double-click:

双击：

- `stop.cmd`

---

## 7. Portable package | 便携版

A portable release zip can be generated with:

可以通过下面的脚本打包便携版：

- `package-portable.ps1`

Generated output:

生成产物：

- `release/OpenClaw-Fix-Desk-Windows-Portable.zip`

This is useful for:

它适合：

- backing up the project
- 备份项目
- moving the tool to another Windows machine
- 移动到另一台 Windows 电脑
- sharing with another OpenClaw user
- 分享给其他 OpenClaw 用户

---

## 8. Best use cases | 最适合的使用场景

This tool is most useful when:

这个工具最适合：

- OpenClaw is already installed
- OpenClaw 已安装
- a user hits a Codex login problem
- 用户遇到 Codex 登录问题
- Gateway seems broken or unhealthy
- Gateway 看起来异常或不可用
- a user wants a faster repair workflow than command hunting
- 用户想要一个比手动找命令更快的修复流程

---

## 9. Known limitations | 已知限制

- It is still a **v0 prototype**.
- 它目前仍然是一个 **v0 原型**。
- It assumes a Windows machine that already uses OpenClaw.
- 它默认目标机器已经在使用 OpenClaw。
- Some diagnosis rules are heuristic, not perfect.
- 一些诊断规则是启发式判断，不是绝对精确。
- Interactive auth must still happen in a real terminal.
- 交互式认证仍然必须在真实终端里完成。
- It is not yet a polished native desktop app.
- 它还不是一个打磨完整的原生桌面应用。

---

## 10. Roadmap ideas | 后续方向

Possible future improvements:

后续可以继续增强：

- better error classification
- 更细的错误分类
- better preflight checks for missing Node / OpenClaw
- 更好的 Node / OpenClaw 缺失前置检查
- stronger UI states for common failures
- 更明显的常见故障 UI 状态
- native desktop packaging (Electron / Tauri)
- 原生桌面封装（Electron / Tauri）
- diagnosis history / repair history
- 诊断历史 / 修复历史
- more provider / channel repair entries
- 更多 provider / channel 修复入口

---

## 11. Why this project exists | 为什么做这个项目

OpenClaw power users often know that most problems are fixable, but the repair path is scattered across commands, logs, and memory.

很多 OpenClaw 重度用户都知道，大多数问题其实都能修，但修复路径往往散落在命令、日志和经验里。

This project exists to turn that scattered repair knowledge into a small practical Windows tool.

这个项目的目的，就是把这些分散的修复经验，整理成一个实用的小型 Windows 工具。

---

## 12. License / publishing note | 许可 / 发布说明

This repository is currently a practical utility project. If you plan to expand it for broader reuse, consider adding an explicit open-source license.

这个仓库目前是一个实用工具项目。如果你计划让更多人复用，建议补充一个明确的开源许可证。
