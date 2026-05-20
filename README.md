<p align="center">
  <img src="assets/icon.png" alt="Tmux Control Center logo" width="128" />
</p>

<h1 align="center">Tmux Control Center</h1>

<p align="center">A cross-platform desktop terminal manager with SSH remote tmux session management — connect to your servers, discover live sessions, and manage multiple terminals in one window.</p>

![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white) ![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white) ![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black) ![Electron](https://img.shields.io/badge/Electron-30-47848F) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6) ![React](https://img.shields.io/badge/React-18-61DAFB)

> **Built on top of [tmax](https://github.com/InbarR/tmax)** — extended with SSH connectivity, remote tmux session management, and live session discovery.

---

## What is this?

Tmux Control Center started as a fork of [tmax](https://github.com/InbarR/tmax), a powerful multi-terminal Electron app. The main addition is a built-in **SSH panel** that lets you:

- Save and manage SSH host credentials (password or private key)
- Define named tmux sessions per host
- **Auto-discover all live tmux sessions** running on a remote host with one click
- Connect with one click — the app SSHes in and automatically attaches to the tmux session
- Work in the same tiling terminal UI you're already in, with a blue `SSH` badge marking remote panes

If you work with remote Linux servers and use tmux, this is for you.

---

## Features

### SSH & Remote tmux (new in this fork)

- **SSH Panel** — open with the `🔗 SSH` button in the status bar, or via Command Palette
- Add hosts with name, IP/hostname, port, username, and password or SSH key path
- Define named tmux sessions per host (with optional project path)
- **🔍 Live Session Scanner** — scans all running tmux sessions on the remote host and shows their current working directories. Save any discovered session to your list or connect directly
- One-click connect — SSHes in and runs `tmux attach-session` automatically
- Remote panes show a blue `SSH` badge in the title bar
- Credentials stored locally in a SQLite database

### Terminal Management (from tmax)

**Multiple Terminals in One View**
- Tiling layout with horizontal/vertical splits (binary tree, like tmux)
- Floating panels that can be dragged, resized, and maximized
- Status indicators per pane (green = active, grey = idle, red = error)
- Focused pane highlighted with green-tinted title bar

**Workspaces**
- Each workspace tab keeps its own pane layout and color tint
- Drag workspace tabs to reorder; state saved across restarts
- Multi-select panes with Ctrl+click to act on several at once
- Move panes between workspaces from the pane menu or Command Palette

**AI Sessions Panel**
- Monitor GitHub Copilot and Claude Code sessions in real-time (`Ctrl+Shift+C`)
- Shows session status, summary, branch, repo, message/tool counts
- Click a session to resume it in a new terminal pane
- Cross-session prompt search (`Ctrl+Shift+Y`) with `foo AND bar` syntax

**File Explorer**
- Sidebar file tree for the focused terminal's working directory (`Ctrl+Shift+X`)
- Single-click file preview, double-click to open in editor
- WSL filesystem support

**Keyboard-Driven Workflow**
- Command Palette (`Ctrl+Shift+P`) with every action searchable
- Jump to any terminal by name (`Ctrl+Shift+G`)
- Fully configurable keybindings

**Appearance**
- 12 built-in theme presets (Catppuccin, Tokyo Night, Dracula, Nord, Gruvbox, and more)
- Windows 11 Mica/Acrylic transparency
- Font picker with all installed monospace fonts

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- **Windows**: [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with "Desktop development with C++" workload
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential`, `python3`, `libx11-dev`, `libxkbfile-dev`

### Install & Run

```bash
git clone https://github.com/catowabisabi/ssh-tmux-tmax.git
cd ssh-tmux-tmax
npm install
npm start
```

### Build Installer

```bash
npm run build
# Output: out/make/ (Squirrel .exe on Windows, .dmg on macOS, .deb on Linux)
```

---

## How to Use SSH

1. Click the **🔗 SSH** button in the bottom status bar (or open Command Palette → "SSH 連線面板")
2. Click **＋** to add a host — enter the hostname, port, username, and either a password or path to your private key
3. Click the host name to see its tmux sessions, then click **＋** to add a named session
4. Click **連線** — the app will SSH in and attach to the tmux session automatically
5. The terminal pane opens with a blue `SSH` badge in the title bar

## How to Use Live Session Scanner

1. Open the SSH Panel and select a host
2. Click the **🔍** button next to the session list header
3. The app opens a temporary SSH connection and runs `tmux list-panes -a` on the remote host
4. All live sessions appear with their name, attached status, window count, and current working directory
5. Click **＋存** to save a session to your named list, or **連線** to connect immediately

---

## Architecture

```
src/
  main/           Electron main process
    main.ts                 Window creation, IPC handlers
    pty-manager.ts          Local PTY lifecycle (node-pty)
    ssh-manager.ts          SSH connections (ssh2)
    tmux-service.ts         Remote tmux commands + live session discovery
    db.ts                   SQLite database (hosts, tmux sessions)
    credential-store.ts     Encrypted credential storage
    config-store.ts         App config persistence
    ...                     AI session monitoring, git, file explorer
  preload/        Secure IPC bridge (contextBridge)
  renderer/       React UI
    state/          Zustand store + layout engine
    components/     TerminalPanel, SshPanel, CopilotPanel,
                    FileExplorer, Settings, CommandPalette, etc.
    hooks/          Keybindings, drag & drop
    styles/         Global CSS
  shared/         IPC channel constants, shared types
```

**Key IPC flows for SSH:**

```
Renderer → preload.tmuxScanLive(hostId)
  → IPC TMUX_SCAN_LIVE
    → main: temp ssh2 Client → TmuxService.listLiveSessions()
      → tmux list-panes -a → parse → return TmuxLiveSession[]
  → Renderer displays live session list
```

---

## License

MIT

This project is based on [tmax](https://github.com/InbarR/tmax) by [InbarR](https://github.com/InbarR), also licensed under MIT.
