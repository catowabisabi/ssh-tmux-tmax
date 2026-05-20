import React, { useState, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../state/terminal-store';

interface Host {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password_encrypted: string | null;
  private_key_path: string | null;
}

interface TmuxSession {
  id: number;
  host_id: number;
  name: string;
  project_path: string | null;
  start_command: string | null;
  auto_attach: number;
  auto_detach_existing: number;
}

type PanelView = 'hosts' | 'sessions' | 'add-host' | 'edit-host' | 'add-session';

interface HostFormData {
  name: string;
  host: string;
  port: string;
  username: string;
  authType: 'password' | 'key';
  password: string;
  privateKeyPath: string;
}

const DEFAULT_HOST_FORM: HostFormData = {
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  privateKeyPath: '',
};

const SshPanel: React.FC = () => {
  const show = useTerminalStore((s) => s.showSshPanel);
  const createSshTerminal = useTerminalStore((s) => s.createSshTerminal);
  const toggleSshPanel = useTerminalStore((s) => s.toggleSshPanel);

  const [width, setWidth] = useState(320);
  const [resizing, setResizing] = useState(false);

  const [view, setView] = useState<PanelView>('hosts');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [sessions, setSessions] = useState<TmuxSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null); // session name being connected

  // Host form state
  const [hostForm, setHostForm] = useState<HostFormData>(DEFAULT_HOST_FORM);
  const [editingHostId, setEditingHostId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Session form state
  const [sessionName, setSessionName] = useState('');
  const [sessionPath, setSessionPath] = useState('');
  const [sessionFormError, setSessionFormError] = useState<string | null>(null);
  const [sessionFormSaving, setSessionFormSaving] = useState(false);

  const loadHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.terminalAPI.hostsGet();
      setHosts(result as Host[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async (hostId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.terminalAPI.tmuxList(hostId);
      setSessions(result as TmuxSession[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    loadHosts();
  }, [show, loadHosts]);

  // ── Resize handle ───────────────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      // Panel is on the left side: dragging left = smaller
      const delta = startX - ev.clientX;
      setWidth(Math.max(220, Math.min(600, startW + delta)));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSelectHost = useCallback(async (host: Host) => {
    setSelectedHost(host);
    setView('sessions');
    await loadSessions(host.id);
  }, [loadSessions]);

  const handleConnect = useCallback(async (session: TmuxSession) => {
    if (!selectedHost) return;
    setConnecting(session.name);
    try {
      await createSshTerminal({
        hostId: selectedHost.id,
        sessionName: session.name,
        hostName: selectedHost.name,
      });
      toggleSshPanel();
    } catch (e) {
      setError(`連線失敗：${String(e)}`);
    } finally {
      setConnecting(null);
    }
  }, [selectedHost, createSshTerminal, toggleSshPanel]);

  const handleSaveHost = useCallback(async () => {
    setFormError(null);
    if (!hostForm.name.trim()) { setFormError('請輸入主機名稱'); return; }
    if (!hostForm.host.trim()) { setFormError('請輸入主機位址'); return; }
    if (!hostForm.username.trim()) { setFormError('請輸入使用者名稱'); return; }
    const port = parseInt(hostForm.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) { setFormError('Port 格式不正確'); return; }

    setFormSaving(true);
    try {
      const data = {
        name: hostForm.name.trim(),
        host: hostForm.host.trim(),
        port,
        username: hostForm.username.trim(),
        authType: hostForm.authType,
        password: hostForm.authType === 'password' ? hostForm.password : undefined,
        privateKeyPath: hostForm.authType === 'key' ? hostForm.privateKeyPath.trim() : undefined,
      };
      if (editingHostId !== null) {
        await window.terminalAPI.hostUpdate(editingHostId, data);
      } else {
        await window.terminalAPI.hostCreate(data);
      }
      await loadHosts();
      setView('hosts');
      setHostForm(DEFAULT_HOST_FORM);
      setEditingHostId(null);
    } catch (e) {
      setFormError(String(e));
    } finally {
      setFormSaving(false);
    }
  }, [hostForm, editingHostId, loadHosts]);

  const handleEditHost = useCallback((host: Host) => {
    setEditingHostId(host.id);
    setHostForm({
      name: host.name,
      host: host.host,
      port: String(host.port),
      username: host.username,
      authType: host.auth_type,
      password: '',
      privateKeyPath: host.private_key_path || '',
    });
    setFormError(null);
    setView('edit-host');
  }, []);

  const handleDeleteHost = useCallback(async (host: Host) => {
    if (!confirm(`確定要刪除主機「${host.name}」？`)) return;
    try {
      await window.terminalAPI.hostDelete(host.id);
      await loadHosts();
      if (selectedHost?.id === host.id) {
        setSelectedHost(null);
        setView('hosts');
      }
    } catch (e) {
      setError(String(e));
    }
  }, [selectedHost, loadHosts]);

  const handleSaveSession = useCallback(async () => {
    if (!selectedHost) return;
    setSessionFormError(null);
    if (!sessionName.trim()) { setSessionFormError('請輸入 session 名稱'); return; }
    setSessionFormSaving(true);
    try {
      await window.terminalAPI.tmuxCreate({
        hostId: selectedHost.id,
        name: sessionName.trim(),
        projectPath: sessionPath.trim() || undefined,
      });
      await loadSessions(selectedHost.id);
      setView('sessions');
      setSessionName('');
      setSessionPath('');
    } catch (e) {
      setSessionFormError(String(e));
    } finally {
      setSessionFormSaving(false);
    }
  }, [selectedHost, sessionName, sessionPath, loadSessions]);

  const handleDeleteSession = useCallback(async (session: TmuxSession) => {
    if (!confirm(`確定要刪除 session「${session.name}」？`)) return;
    try {
      await window.terminalAPI.tmuxDelete(session.id);
      if (selectedHost) await loadSessions(selectedHost.id);
    } catch (e) {
      setError(String(e));
    }
  }, [selectedHost, loadSessions]);

  if (!show) return null;

  // ── Render helpers ──────────────────────────────────────────────────
  const renderHosts = () => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-section-header">
        <span>主機列表</span>
        <button
          className="ssh-panel-btn-icon"
          title="新增主機"
          onClick={() => { setHostForm(DEFAULT_HOST_FORM); setEditingHostId(null); setFormError(null); setView('add-host'); }}
        >＋</button>
      </div>
      {loading && <div className="ssh-panel-loading">載入中⋯</div>}
      {error && <div className="ssh-panel-error">{error}</div>}
      {!loading && hosts.length === 0 && (
        <div className="ssh-panel-empty">
          還沒有主機<br />
          <button className="ssh-panel-link" onClick={() => { setHostForm(DEFAULT_HOST_FORM); setEditingHostId(null); setFormError(null); setView('add-host'); }}>
            新增第一台主機
          </button>
        </div>
      )}
      <ul className="ssh-panel-list">
        {hosts.map((h) => (
          <li key={h.id} className="ssh-panel-host-item">
            <button className="ssh-panel-host-main" onClick={() => handleSelectHost(h)}>
              <span className="ssh-panel-host-icon">🖥</span>
              <span className="ssh-panel-host-info">
                <span className="ssh-panel-host-name">{h.name}</span>
                <span className="ssh-panel-host-addr">{h.username}@{h.host}:{h.port}</span>
              </span>
              <span className="ssh-panel-host-arrow">›</span>
            </button>
            <div className="ssh-panel-host-actions">
              <button className="ssh-panel-btn-sm" onClick={() => handleEditHost(h)} title="編輯">✎</button>
              <button className="ssh-panel-btn-sm ssh-panel-btn-danger" onClick={() => handleDeleteHost(h)} title="刪除">✕</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSessions = () => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-back-row">
        <button className="ssh-panel-back" onClick={() => { setView('hosts'); setSelectedHost(null); }}>
          ‹ 主機列表
        </button>
      </div>
      <div className="ssh-panel-section-header">
        <span>
          <span className="ssh-panel-host-chip">{selectedHost?.name}</span>
          <span className="ssh-panel-section-sub"> tmux sessions</span>
        </span>
        <button
          className="ssh-panel-btn-icon"
          title="新增 Session"
          onClick={() => { setSessionName(''); setSessionPath(''); setSessionFormError(null); setView('add-session'); }}
        >＋</button>
      </div>
      {loading && <div className="ssh-panel-loading">載入中⋯</div>}
      {error && <div className="ssh-panel-error">{error}</div>}
      {!loading && sessions.length === 0 && (
        <div className="ssh-panel-empty">
          還沒有 session<br />
          <button className="ssh-panel-link" onClick={() => { setSessionName(''); setSessionPath(''); setSessionFormError(null); setView('add-session'); }}>
            新增 Session
          </button>
        </div>
      )}
      <ul className="ssh-panel-list">
        {sessions.map((s) => (
          <li key={s.id} className="ssh-panel-session-item">
            <button
              className="ssh-panel-session-main"
              onClick={() => handleConnect(s)}
              disabled={connecting === s.name}
            >
              <span className="ssh-panel-session-icon">⬡</span>
              <span className="ssh-panel-session-info">
                <span className="ssh-panel-session-name">{s.name}</span>
                {s.project_path && (
                  <span className="ssh-panel-session-path">{s.project_path}</span>
                )}
              </span>
              <span className="ssh-panel-connect-label">
                {connecting === s.name ? '連線中⋯' : '連線'}
              </span>
            </button>
            <div className="ssh-panel-host-actions">
              <button className="ssh-panel-btn-sm ssh-panel-btn-danger" onClick={() => handleDeleteSession(s)} title="刪除">✕</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderHostForm = (isEdit: boolean) => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-back-row">
        <button className="ssh-panel-back" onClick={() => setView('hosts')}>
          ‹ 主機列表
        </button>
      </div>
      <div className="ssh-panel-form-title">{isEdit ? '編輯主機' : '新增主機'}</div>
      {formError && <div className="ssh-panel-error">{formError}</div>}
      <div className="ssh-panel-form">
        <label className="ssh-panel-label">名稱</label>
        <input className="ssh-panel-input" value={hostForm.name} onChange={e => setHostForm(f => ({ ...f, name: e.target.value }))} placeholder="例如：My Server" />

        <label className="ssh-panel-label">主機位址</label>
        <input className="ssh-panel-input" value={hostForm.host} onChange={e => setHostForm(f => ({ ...f, host: e.target.value }))} placeholder="192.168.1.100 或 example.com" />

        <div className="ssh-panel-row">
          <div className="ssh-panel-col">
            <label className="ssh-panel-label">Port</label>
            <input className="ssh-panel-input" value={hostForm.port} onChange={e => setHostForm(f => ({ ...f, port: e.target.value }))} placeholder="22" type="number" />
          </div>
          <div className="ssh-panel-col">
            <label className="ssh-panel-label">使用者名稱</label>
            <input className="ssh-panel-input" value={hostForm.username} onChange={e => setHostForm(f => ({ ...f, username: e.target.value }))} placeholder="ubuntu" />
          </div>
        </div>

        <label className="ssh-panel-label">驗證方式</label>
        <div className="ssh-panel-radio-group">
          <label className="ssh-panel-radio">
            <input type="radio" value="password" checked={hostForm.authType === 'password'} onChange={() => setHostForm(f => ({ ...f, authType: 'password' }))} />
            密碼
          </label>
          <label className="ssh-panel-radio">
            <input type="radio" value="key" checked={hostForm.authType === 'key'} onChange={() => setHostForm(f => ({ ...f, authType: 'key' }))} />
            SSH 金鑰
          </label>
        </div>

        {hostForm.authType === 'password' ? (
          <>
            <label className="ssh-panel-label">密碼 {isEdit && <span className="ssh-panel-hint">（空白表示不更改）</span>}</label>
            <input className="ssh-panel-input" type="password" value={hostForm.password} onChange={e => setHostForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </>
        ) : (
          <>
            <label className="ssh-panel-label">私鑰路徑</label>
            <input className="ssh-panel-input" value={hostForm.privateKeyPath} onChange={e => setHostForm(f => ({ ...f, privateKeyPath: e.target.value }))} placeholder="~/.ssh/id_rsa" />
          </>
        )}

        <div className="ssh-panel-form-actions">
          <button className="ssh-panel-btn-cancel" onClick={() => setView('hosts')}>取消</button>
          <button className="ssh-panel-btn-primary" onClick={handleSaveHost} disabled={formSaving}>
            {formSaving ? '儲存中⋯' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSessionForm = () => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-back-row">
        <button className="ssh-panel-back" onClick={() => setView('sessions')}>
          ‹ Sessions
        </button>
      </div>
      <div className="ssh-panel-form-title">新增 tmux Session</div>
      {sessionFormError && <div className="ssh-panel-error">{sessionFormError}</div>}
      <div className="ssh-panel-form">
        <label className="ssh-panel-label">Session 名稱</label>
        <input className="ssh-panel-input" value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="my-project" />

        <label className="ssh-panel-label">專案路徑 <span className="ssh-panel-hint">（選填）</span></label>
        <input className="ssh-panel-input" value={sessionPath} onChange={e => setSessionPath(e.target.value)} placeholder="/home/ubuntu/projects/myapp" />

        <div className="ssh-panel-form-actions">
          <button className="ssh-panel-btn-cancel" onClick={() => setView('sessions')}>取消</button>
          <button className="ssh-panel-btn-primary" onClick={handleSaveSession} disabled={sessionFormSaving}>
            {sessionFormSaving ? '儲存中⋯' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`ssh-panel${resizing ? ' resizing' : ''}`} style={{ width, minWidth: width }}>
      {/* Resize handle on the right edge */}
      <div className="ssh-panel-resize" onMouseDown={handleResizeStart} />

      {/* Header */}
      <div className="dir-panel-header">
        <span className="dir-panel-header-title">SSH 連線</span>
        <button className="dir-panel-close" onClick={toggleSshPanel} data-tooltip="關閉">&#10005;</button>
      </div>

      {/* Content */}
      {view === 'hosts' && renderHosts()}
      {view === 'sessions' && renderSessions()}
      {(view === 'add-host') && renderHostForm(false)}
      {(view === 'edit-host') && renderHostForm(true)}
      {view === 'add-session' && renderSessionForm()}
    </div>
  );
};

export default SshPanel;
