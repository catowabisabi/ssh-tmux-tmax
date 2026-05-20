import { contextBridge, ipcRenderer, clipboard } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { DiffMode, DiffResult, AnnotatedFile } from '../shared/diff-types';
import type { RepoWorktrees } from '../shared/worktree-types';

export interface PtyDiag {
  pid: number;
  writeCount: number;
  lastWriteTime: number;
  dataCount: number;
  lastDataTime: number;
  dataBytes: number;
}

export interface TerminalAPI {
  createPty(opts: {
    id: string;
    shellPath: string;
    args: string[];
    cwd: string;
    env?: Record<string, string>;
    cols: number;
    rows: number;
    wslDistro?: string;
  }): Promise<{ id: string; pid: number }>;
  writePty(id: string, data: string): void;
  resizePty(id: string, cols: number, rows: number): Promise<void>;
  killPty(id: string): Promise<void>;
  onPtyData(cb: (id: string, data: string) => void): () => void;
  onPtyExit(cb: (id: string, exitCode: number | undefined) => void): () => void;
  getConfig(): Promise<Record<string, unknown>>;
  setConfig(key: string, value: unknown): Promise<void>;
  clipboardRead(): string;
  clipboardReadHTML(): string;
  clipboardWrite(text: string): void;
  clipboardHasImage(): boolean;
  clipboardSaveImage(): Promise<string>;
  imageReadAsDataUrl(filePath: string): Promise<string | null>;
  resolveClipboardImageBasename(basename: string): Promise<string | null>;
  getAppVersion(): Promise<string>;
  getVersionUpdate(): Promise<{ status: string; current: string; latest?: string; url?: string; error?: string; releaseNotes?: string } | null>;
  checkForUpdates(): void;
  restartAndUpdate(): void;
  getChangelog(): Promise<string>;
  onUpdateStatusChanged(cb: (info: { status: string; current: string; latest?: string; url?: string; error?: string; releaseNotes?: string }) => void): () => void;
  getPtyDiag(id: string): Promise<PtyDiag | null>;
  diagLog(event: string, data?: Record<string, unknown>): void;
  getDiagLogPath(): Promise<string>;
  readDiagLogTail(maxBytes?: number): Promise<string>;
  getSystemFonts(): Promise<string[]>;
  // ── Keybindings file (TASK-39) ────────────────────────────────────
  getKeybindings(): Promise<{ key: string; action: string }[]>;
  openKeybindingsFile(): Promise<void>;
  openConfigFile(): Promise<void>;
  resetKeybindings(): Promise<{ key: string; action: string }[]>;
  onKeybindingsChanged(cb: (bindings: { key: string; action: string }[]) => void): () => void;
  // ── Transparency ──────────────────────────────────────────────────
  setBackgroundMaterial(material: string): Promise<void>;
  getPlatformSupportsMaterial(): Promise<boolean>;
  // ── Diff editor ──────────────────────────────────────────────────
  diffResolveGitRoot(cwd: string): Promise<string>;
  diffGetDiff(cwd: string, mode: DiffMode): Promise<DiffResult>;
  diffGetAnnotatedFile(cwd: string, filePath: string, mode: DiffMode): Promise<AnnotatedFile>;
  // ── File explorer ────────────────────────────────────────────────
  fileList(dirPath: string, wslDistro?: string): Promise<{ name: string; isDirectory: boolean; path: string }[]>;
  fileRead(filePath: string, wslDistro?: string): Promise<string | null>;
  fileReveal(filePath: string, wslDistro?: string): Promise<{ ok: boolean; error?: string }>;
  fileRename(oldPath: string, newName: string, wslDistro?: string): Promise<{ ok: boolean; newPath?: string; error?: string }>;
  fileDelete(filePath: string, wslDistro?: string): Promise<{ ok: boolean; error?: string }>;
  // ── Git worktree ──────────────────────────────────────────────────
  listWorktrees(cwd: string): Promise<RepoWorktrees>;
  createWorktree(repoPath: string, branchName: string, baseBranch: string): Promise<{ success: boolean; worktreePath?: string; error?: string }>;
  deleteWorktree(repoPath: string, worktreePath: string): Promise<{ success: boolean; error?: string }>;
  getBranches(repoPath: string): Promise<string[]>;
  // ── Session name overrides sync (TASK-71) ─────────────────────────
  syncSessionNameOverrides(overrides: Record<string, string>): void;
  // ── Cross-window session-file change broadcast (TASK-163) ─────────
  onSessionFileChanged(cb: () => void): () => void;
  // ── Session save/load ─────────────────────────────────────────────
  saveSession(data: unknown): Promise<void>;
  loadSession(): Promise<unknown>;
  // ── Child process tree query (TASK-171) ────────────────────────────
  getPtyChildProcesses(ptyId: string): Promise<string[]>;
  // ── Shell path opening ─────────────────────────────────────────────
  openPath(filePath: string): Promise<void>;
  // ── Detached windows ──────────────────────────────────────────────
  closeDetached(id: string): Promise<void>;
  onDetachedClosed(cb: (id: string) => void): () => void;
  // ── SSH / Tmux Session Management ─────────────────────────────────
  sshCreate(opts: { hostId: number; sessionName: string; cols: number; rows: number }): Promise<{ id: string }>;
  sshWrite(id: string, data: string): void;
  sshResize(id: string, cols: number, rows: number): Promise<void>;
  sshKill(id: string): Promise<void>;
  onSshReady(cb: (id: string) => void): () => void;
  onSshError(cb: (id: string, err: string) => void): () => void;
  hostsGet(): Promise<{ id: number; name: string; host: string; port: number; username: string; auth_type: string; password_encrypted: string | null; private_key_path: string | null }[]>;
  hostCreate(data: { name: string; host: string; port: number; username: string; password?: string; authType: 'password' | 'key'; privateKeyPath?: string }): Promise<{ id: number }>;
  hostUpdate(id: number, data: { name?: string; host?: string; port?: number; username?: string; password?: string; authType?: 'password' | 'key'; privateKeyPath?: string }): Promise<void>;
  hostDelete(id: number): Promise<void>;
  tmuxList(hostId: number): Promise<{ id: number; host_id: number; name: string; project_path: string | null; start_command: string | null; auto_attach: number; auto_detach_existing: number }[]>;
  tmuxCreate(data: { hostId: number; name: string; projectPath?: string; autoAttach?: boolean; autoDetachExisting?: boolean }): Promise<{ id: number }>;
  tmuxDelete(id: number): Promise<void>;
  tmuxRename(id: number, newName: string): Promise<void>;
  tmuxScanLive(hostId: number): Promise<{ name: string; attached: boolean; windows: number; cwd: string }[]>;
}

const terminalAPI: TerminalAPI = {
  createPty(opts) {
    return ipcRenderer.invoke(IPC.PTY_CREATE, opts);
  },

  writePty(id, data) {
    ipcRenderer.send(IPC.PTY_WRITE, id, data);
  },

  resizePty(id, cols, rows) {
    return ipcRenderer.invoke(IPC.PTY_RESIZE, id, cols, rows);
  },

  killPty(id) {
    return ipcRenderer.invoke(IPC.PTY_KILL, id);
  },

  onPtyData(cb) {
    const listener = (_event: Electron.IpcRendererEvent, id: string, data: string) => {
      cb(id, data);
    };
    ipcRenderer.on(IPC.PTY_DATA, listener);
    return () => {
      ipcRenderer.removeListener(IPC.PTY_DATA, listener);
    };
  },

  onPtyExit(cb) {
    const listener = (_event: Electron.IpcRendererEvent, id: string, exitCode: number | undefined) => {
      cb(id, exitCode);
    };
    ipcRenderer.on(IPC.PTY_EXIT, listener);
    return () => {
      ipcRenderer.removeListener(IPC.PTY_EXIT, listener);
    };
  },

  getConfig() {
    return ipcRenderer.invoke(IPC.CONFIG_GET);
  },

  setConfig(key, value) {
    return ipcRenderer.invoke(IPC.CONFIG_SET, key, value);
  },

  clipboardRead() {
    return clipboard.readText();
  },

  clipboardReadHTML() {
    return clipboard.readHTML();
  },

  clipboardWrite(text: string) {
    clipboard.writeText(text);
  },

  clipboardHasImage() {
    return !clipboard.readImage().isEmpty();
  },

  clipboardSaveImage() {
    const png = clipboard.readImage().toPNG();
    const base64 = png.toString('base64');
    return ipcRenderer.invoke(IPC.CLIPBOARD_SAVE_IMAGE, base64);
  },

  imageReadAsDataUrl(filePath: string) {
    return ipcRenderer.invoke(IPC.IMAGE_READ_DATA_URL, filePath);
  },

  resolveClipboardImageBasename(basename: string) {
    return ipcRenderer.invoke(IPC.RESOLVE_CLIPBOARD_BASENAME, basename);
  },

  openConfigFile() {
    return ipcRenderer.invoke(IPC.CONFIG_OPEN);
  },

  // ── Keybindings file (TASK-39) ──────────────────────────────────────
  getKeybindings() {
    return ipcRenderer.invoke(IPC.KEYBINDINGS_GET);
  },
  openKeybindingsFile() {
    return ipcRenderer.invoke(IPC.KEYBINDINGS_OPEN_FILE);
  },
  resetKeybindings() {
    return ipcRenderer.invoke(IPC.KEYBINDINGS_RESET);
  },
  onKeybindingsChanged(cb: (bindings: { key: string; action: string }[]) => void) {
    const handler = (_e: unknown, bindings: { key: string; action: string }[]) => cb(bindings);
    ipcRenderer.on(IPC.KEYBINDINGS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.KEYBINDINGS_CHANGED, handler);
  },

  openPath(filePath: string) {
    return ipcRenderer.invoke(IPC.OPEN_PATH, filePath);
  },

  saveSession(data: unknown) {
    return ipcRenderer.invoke(IPC.SESSION_SAVE, data);
  },

  loadSession(): Promise<unknown> {
    return ipcRenderer.invoke(IPC.SESSION_LOAD);
  },

  // ── Detached windows ──────────────────────────────────────────────
  detachTerminal(id: string) {
    return ipcRenderer.invoke(IPC.DETACH_CREATE, id);
  },

  closeDetached(id: string) {
    return ipcRenderer.invoke(IPC.DETACH_CLOSE, id);
  },

  focusDetached(id: string) {
    return ipcRenderer.invoke(IPC.DETACH_FOCUS, id);
  },

  onDetachedClosed(cb: (id: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => {
      cb(id);
    };
    ipcRenderer.on(IPC.DETACH_CLOSED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.DETACH_CLOSED, listener);
    };
  },

  // ── Copilot session APIs ──────────────────────────────────────────
  listCopilotSessions(limit?: number) {
    return ipcRenderer.invoke(IPC.COPILOT_LIST_SESSIONS, limit);
  },

  getCopilotSession(id: string) {
    return ipcRenderer.invoke(IPC.COPILOT_GET_SESSION, id);
  },

  searchCopilotSessions(query: string) {
    return ipcRenderer.invoke(IPC.COPILOT_SEARCH_SESSIONS, query);
  },

  startCopilotWatching() {
    return ipcRenderer.invoke(IPC.COPILOT_START_WATCHING);
  },

  stopCopilotWatching() {
    return ipcRenderer.invoke(IPC.COPILOT_STOP_WATCHING);
  },

  getCopilotPrompts(id: string) {
    return ipcRenderer.invoke(IPC.COPILOT_GET_PROMPTS, id);
  },
  searchCopilotPrompts(query: string) {
    return ipcRenderer.invoke(IPC.COPILOT_SEARCH_PROMPTS, query);
  },

  invalidateSessionCaches() {
    return ipcRenderer.invoke(IPC.AI_INVALIDATE_CACHES);
  },

  onCopilotSessionUpdated(cb: (session: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, session: unknown) => {
      cb(session);
    };
    ipcRenderer.on(IPC.COPILOT_SESSION_UPDATED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.COPILOT_SESSION_UPDATED, listener);
    };
  },

  onCopilotSessionAdded(cb: (session: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, session: unknown) => {
      cb(session);
    };
    ipcRenderer.on(IPC.COPILOT_SESSION_ADDED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.COPILOT_SESSION_ADDED, listener);
    };
  },

  onCopilotSessionRemoved(cb: (sessionId: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, sessionId: string) => {
      cb(sessionId);
    };
    ipcRenderer.on(IPC.COPILOT_SESSION_REMOVED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.COPILOT_SESSION_REMOVED, listener);
    };
  },

  // ── Claude Code session APIs ───────────────────────────────────────
  listClaudeCodeSessions(limit?: number) {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_LIST_SESSIONS, limit);
  },

  getClaudeCodeSession(id: string) {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_GET_SESSION, id);
  },

  searchClaudeCodeSessions(query: string) {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_SEARCH_SESSIONS, query);
  },

  startClaudeCodeWatching() {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_START_WATCHING);
  },

  stopClaudeCodeWatching() {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_STOP_WATCHING);
  },

  getClaudeCodePrompts(id: string) {
    return ipcRenderer.invoke(IPC.CLAUDE_CODE_GET_PROMPTS, id);
  },

  onClaudeCodeSessionUpdated(cb: (session: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, session: unknown) => {
      cb(session);
    };
    ipcRenderer.on(IPC.CLAUDE_CODE_SESSION_UPDATED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.CLAUDE_CODE_SESSION_UPDATED, listener);
    };
  },

  onClaudeCodeSessionAdded(cb: (session: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, session: unknown) => {
      cb(session);
    };
    ipcRenderer.on(IPC.CLAUDE_CODE_SESSION_ADDED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.CLAUDE_CODE_SESSION_ADDED, listener);
    };
  },

  onClaudeCodeSessionRemoved(cb: (sessionId: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, sessionId: string) => {
      cb(sessionId);
    };
    ipcRenderer.on(IPC.CLAUDE_CODE_SESSION_REMOVED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.CLAUDE_CODE_SESSION_REMOVED, listener);
    };
  },

  // ── Version check APIs ──────────────────────────────────────────
  getAppVersion() {
    return ipcRenderer.invoke(IPC.VERSION_GET_APP_VERSION);
  },

  getVersionUpdate() {
    return ipcRenderer.invoke(IPC.VERSION_GET_UPDATE);
  },

  checkForUpdates() {
    ipcRenderer.send(IPC.VERSION_CHECK_NOW);
  },

  restartAndUpdate() {
    ipcRenderer.send(IPC.VERSION_RESTART_AND_UPDATE);
  },

  getChangelog(): Promise<string> {
    return ipcRenderer.invoke(IPC.VERSION_GET_CHANGELOG);
  },

  getPtyDiag(id: string) {
    return ipcRenderer.invoke(IPC.PTY_GET_DIAG, id);
  },

  diagLog(event: string, data?: Record<string, unknown>) {
    ipcRenderer.send(IPC.DIAG_LOG, event, data);
  },

  getDiagLogPath() {
    return ipcRenderer.invoke(IPC.DIAG_GET_LOG_PATH);
  },

  readDiagLogTail(maxBytes) {
    return ipcRenderer.invoke(IPC.DIAG_READ_TAIL, maxBytes);
  },

  getSystemFonts() {
    return ipcRenderer.invoke(IPC.GET_SYSTEM_FONTS);
  },

  onUpdateStatusChanged(cb: (info: { status: string; current: string; latest?: string; url?: string; error?: string }) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, info: { status: string; current: string; latest?: string; url?: string; error?: string }) => {
      cb(info);
    };
    ipcRenderer.on(IPC.VERSION_UPDATE_STATUS, listener);
    return () => {
      ipcRenderer.removeListener(IPC.VERSION_UPDATE_STATUS, listener);
    };
  },

  // ── Transparency ────────────────────────────────────────────────
  setBackgroundMaterial(material: string) {
    return ipcRenderer.invoke(IPC.SET_BACKGROUND_MATERIAL, material);
  },

  getPlatformSupportsMaterial(): Promise<boolean> {
    return ipcRenderer.invoke(IPC.GET_PLATFORM_SUPPORTS_MATERIAL);
  },

  // ── Diff editor ──────────────────────────────────────────────────
  diffResolveGitRoot(cwd: string) {
    return ipcRenderer.invoke(IPC.DIFF_RESOLVE_GIT_ROOT, cwd);
  },

  diffGetDiff(cwd: string, mode: DiffMode) {
    return ipcRenderer.invoke(IPC.DIFF_GET_DIFF, cwd, mode);
  },

  diffGetAnnotatedFile(cwd: string, filePath: string, mode: DiffMode) {
    return ipcRenderer.invoke(IPC.DIFF_GET_ANNOTATED_FILE, cwd, filePath, mode);
  },

  // ── File explorer ──────────────────────────────────────────────
  fileList(dirPath: string, wslDistro?: string) {
    return ipcRenderer.invoke(IPC.FILE_LIST, dirPath, wslDistro);
  },

  fileRead(filePath: string, wslDistro?: string) {
    return ipcRenderer.invoke(IPC.FILE_READ, filePath, wslDistro);
  },

  fileReveal(filePath: string, wslDistro?: string) {
    return ipcRenderer.invoke(IPC.FILE_REVEAL, filePath, wslDistro);
  },

  fileRename(oldPath: string, newName: string, wslDistro?: string) {
    return ipcRenderer.invoke(IPC.FILE_RENAME, oldPath, newName, wslDistro);
  },

  fileDelete(filePath: string, wslDistro?: string) {
    return ipcRenderer.invoke(IPC.FILE_DELETE, filePath, wslDistro);
  },

  // ── Git worktree ──────────────────────────────────────────────────
  listWorktrees(cwd: string) {
    return ipcRenderer.invoke(IPC.GIT_LIST_WORKTREES, cwd);
  },
  createWorktree(repoPath: string, branchName: string, baseBranch: string) {
    return ipcRenderer.invoke(IPC.GIT_CREATE_WORKTREE, repoPath, branchName, baseBranch);
  },
  deleteWorktree(repoPath: string, worktreePath: string) {
    return ipcRenderer.invoke(IPC.GIT_DELETE_WORKTREE, repoPath, worktreePath);
  },
  getBranches(repoPath: string) {
    return ipcRenderer.invoke(IPC.GIT_GET_BRANCHES, repoPath);
  },

  // ── Session name overrides sync (TASK-71) ─────────────────────────
  syncSessionNameOverrides(overrides: Record<string, string>) {
    ipcRenderer.send(IPC.SESSION_NAME_OVERRIDES_SYNC, overrides);
  },

  // ── Cross-window session-file change broadcast (TASK-163) ─────────
  onSessionFileChanged(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on(IPC.SESSION_FILE_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.SESSION_FILE_CHANGED, listener);
    };
  },

  // ── Child process tree query (TASK-171) ────────────────────────────
  getPtyChildProcesses(ptyId: string) {
    return ipcRenderer.invoke(IPC.PTY_GET_CHILD_PROCESSES, ptyId);
  },

  // ── SSH / Tmux Session Management ─────────────────────────────────
  sshCreate(opts) {
    return ipcRenderer.invoke(IPC.SSH_CREATE, opts);
  },
  sshWrite(id, data) {
    ipcRenderer.send(IPC.PTY_WRITE, id, data);
  },
  sshResize(id, cols, rows) {
    return ipcRenderer.invoke(IPC.PTY_RESIZE, id, cols, rows);
  },
  sshKill(id) {
    return ipcRenderer.invoke(IPC.PTY_KILL, id);
  },
  onSshReady(cb) {
    const listener = (_event: Electron.IpcRendererEvent, id: string) => cb(id);
    ipcRenderer.on(IPC.SSH_READY, listener);
    return () => ipcRenderer.removeListener(IPC.SSH_READY, listener);
  },
  onSshError(cb) {
    const listener = (_event: Electron.IpcRendererEvent, id: string, err: string) => cb(id, err);
    ipcRenderer.on(IPC.SSH_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC.SSH_ERROR, listener);
  },
  hostsGet() {
    return ipcRenderer.invoke(IPC.HOSTS_GET);
  },
  hostCreate(data) {
    return ipcRenderer.invoke(IPC.HOST_CREATE, data);
  },
  hostUpdate(id, data) {
    return ipcRenderer.invoke(IPC.HOST_UPDATE, id, data);
  },
  hostDelete(id) {
    return ipcRenderer.invoke(IPC.HOST_DELETE, id);
  },
  tmuxList(hostId) {
    return ipcRenderer.invoke(IPC.TMUX_LIST, hostId);
  },
  tmuxCreate(data) {
    return ipcRenderer.invoke(IPC.TMUX_CREATE, data);
  },
  tmuxDelete(id) {
    return ipcRenderer.invoke(IPC.TMUX_DELETE, id);
  },
  tmuxRename(id, newName) {
    return ipcRenderer.invoke(IPC.TMUX_RENAME, id, newName);
  },
  tmuxScanLive(hostId) {
    return ipcRenderer.invoke(IPC.TMUX_SCAN_LIVE, hostId);
  },
};

contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);
contextBridge.exposeInMainWorld('platformInfo', {
  platform: process.platform,
  homeDir: require('os').homedir(),
  // Main passes --tmax-is-dev=true|false via webPreferences.additionalArguments.
  // This is authoritative (main has app.isPackaged) where process.defaultApp
  // can vary depending on how electron is launched.
  isDev: process.argv.includes('--tmax-is-dev=true'),
});
guments.
  // This is authoritative (main has app.isPackaged) where process.defaultApp
  // can vary depending on how electron is launched.
  isDev: process.argv.includes('--tmax-is-dev=true'),
});
