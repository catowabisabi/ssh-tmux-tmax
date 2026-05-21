import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface LiveSession {
  name: string;
  attached: boolean;
  windows: number;
  cwd: string;
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
  name: '', host: '', port: '22', username: '',
  authType: 'password', password: '', privateKeyPath: '',
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
  const [connecting, setConnecting] = useState<string | null>(null);

  const [hostForm, setHostForm] = useState<HostFormData>(DEFAULT_HOST_FORM);
  const [editingHostId, setEditingHostId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const [sessionName, setSessionName] = useState('');
  const [sessionPath, setSessionPath] = useState('');
  const [sessionFormError, setSessionFormError] = useState<string | null>(null);
  const [sessionFormSaving, setSessionFormSaving] = useState(false);

  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanDone = useRef(false);

  const loadHosts = useCallback(async () => {
    setLoading(true); setError(null);
    try { setHosts((await window.terminalAPI.hostsGet()) as Host[]); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  const loadSessions = useCallback(async (hostId: number) => {
    setLoading(true); setError(null);
    try { setSessions((await window.terminalAPI.tmuxList(hostId)) as TmuxSession[]); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (show) loadHosts(); }, [show, loadHosts]);

  useEffect(() => {
    if (view !== 'sessions') {
      setLiveSessions([]); setScanError(null); scanDone.current = false;
    }
  }, [view]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); setResizing(true);
    const startX = e.clientX; const startW = width;
    const onMove = (ev: MouseEvent) => setWidth(Math.max(220, Math.min(600, startW + startX - ev.clientX)));
    const onUp = () => { setResizing(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  const handleSelectHost = useCallback(async (host: Host) => {
    setSelectedHost(host); setView('sessions'); await loadSessions(host.id);
  }, [loadSessions]);

  const handleConnect = useCallback(async (session: TmuxSession) => {
    if (!selectedHost) return;
    setConnecting(session.name);
    try { await createSshTerminal({ hostId: selectedHost.id, sessionName: session.name, hostName: selectedHost.name }); toggleSshPanel(); }
    catch (e) { setError(`連線失敗：${String(e)}`); }
    finally { setConnecting(null); }
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
      const data = { name: hostForm.name.trim(), host: hostForm.host.trim(), port, username: hostForm.username.trim(),
        authType: hostForm.authType,
        password: hostForm.authType === 'password' ? hostForm.password : undefined,
        privateKeyPath: hostForm.authType === 'key' ? hostForm.privateKeyPath.trim() : undefined };
      if (editingHostId !== null) await window.terminalAPI.hostUpdate(editingHostId, data);
      else await window.terminalAPI.hostCreate(data);
      await loadHosts(); setView('hosts'); setHostForm(DEFAULT_HOST_FORM); setEditingHostId(null);
    } catch (e) { setFormError(String(e)); }
    finally { setFormSaving(false); }
  }, [hostForm, editingHostId, loadHosts]);

  const handleEditHost = useCallback((host: Host) => {
    setEditingHostId(host.id);
    setHostForm({ name: host.name, host: host.host, port: String(host.port), username: host.username,
      authType: host.auth_type, password: '', privateKeyPath: host.private_key_path || '' });
    setFormError(null); setView('edit-host');
  }, []);

  const handleDeleteHost = useCallback(async (host: Host) => {
    if (!confirm(`確定要刪除主機「${host.name}」？`)) return;
    try {
      await window.terminalAPI.hostDelete(host.id); await loadHosts();
      if (selectedHost?.id === host.id) { setSelectedHost(null); setView('hosts'); }
    } catch (e) { setError(String(e)); }
  }, [selectedHost, loadHosts]);

  const handleSaveSession = useCallback(async () => {
    if (!selectedHost) return;
    setSessionFormError(null);
    if (!sessionName.trim()) { setSessionFormError('請輸入 session 名稱'); return; }
    setSessionFormSaving(true);
    try {
      await window.terminalAPI.tmuxCreate({ hostId: selectedHost.id, name: sessionName.trim(), projectPath: sessionPath.trim() || undefined });
      await loadSessions(selectedHost.id); setView('sessions'); setSessionName(''); setSessionPath('');
    } catch (e) { setSessionFormError(String(e)); }
    finally { setSessionFormSaving(false); }
  }, [selectedHost, sessionName, sessionPath, loadSessions]);

  const handleDeleteSession = useCallback(async (session: TmuxSession) => {
    if (!confirm(`確定要刪除 session「${session.name}」？`)) return;
    try { await window.terminalAPI.tmuxDelete(session.id); if (selectedHost) await loadSessions(selectedHost.id); }
    catch (e) { setError(String(e)); }
  }, [selectedHost, loadSessions]);

  const handleScan = useCallback(async () => {
    if (!selectedHost) return;
    setScanning(true); setScanError(null); setLiveSessions([]); scanDone.current = false;
    try { setLiveSessions(await window.terminalAPI.tmuxScanLive(selectedHost.id)); scanDone.current = true; }
    catch (e) { setScanError(`描描失敗：${String(e)}`); }
    finally { setScanning(false); }
  }, [selectedHost]);

  const handleConnectLive = useCallback(async (live: LiveSession) => {
    if (!selectedHost) return;
    setConnecting(live.name);
    try { await createSshTerminal({ hostId: selectedHost.id, sessionName: live.name, hostName: selectedHost.name }); toggleSshPanel(); }
    catch (e) { setError(`連線失敗：${String(e)}`); }
    finally { setConnecting(null); }
  }, [selectedHost, createSshTerminal, toggleSshPanel]);

  const handleKillLive = useCallback(async (live: LiveSession) => {
    if (!selectedHost) return;
    if (!confirm(`確定要關閉遠端 session「${live.name}」？\n此操作無法復原。`)) return;
    try {
      await window.terminalAPI.tmuxKillSession(selectedHost.id, live.name);
      // refresh live list after kill
      setLiveSessions((prev) => prev.filter((s) => s.name !== live.name));
    } catch (e) { setError(`Kill 失敗：${String(e)}`); }
  }, [selectedHost]);

  const handleAddLiveToSaved = useCallback(async (live: LiveSession) => {
    if (!selectedHost) return;
    try { await window.terminalAPI.tmuxCreate({ hostId: selectedHost.id, name: live.name, projectPath: live.cwd !== '~' ? live.cwd : undefined }); }
    catch (_e) { /* already exists */ }
    await loadSessions(selectedHost.id);
  }, [selectedHost, loadSessions]);

  if (!show) return null;

  const renderHosts = () => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-section-header">
        <span>主機列表</span>
        <button className="ssh-panel-btn-icon" title="新增主機"
          onClick={() => { setHostForm(DEFAULT_HOST_FORM); setEditingHostId(null); setFormError(null); setView('add-host'); }}>
          ＋</button>
      </div>
      {loading && <div className="ssh-panel-loading">載入中⋯</div>}
      {error && <div className="ssh-panel-error">{error}</div>}
      {!loading && hosts.length === 0 && (
        <div className="ssh-panel-empty">
          還沒有主機<br />
          <button className="ssh-panel-link"
            onClick={() => { setHostForm(DEFAULT_HOST_FORM); setEditingHostId(null); setFormError(null); setView('add-host'); }}>
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
              <span className="ssh-panel-host-arrow">&rsaquo;</span>
            </button>
            <div className="ssh-panel-host-actions">
              <button className="ssh-panel-btn-sm" onClick={() => handleEditHost(h)} title="編輯">&#9998;</button>
              <button className="ssh-panel-btn-sm ssh-panel-btn-danger" onClick={() => handleDeleteHost(h)} title="刪除">&#10005;</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSessions = () => {
    const savedNames = new Set(sessions.map((s) => s.name));
    return (
      <div className="ssh-panel-content">
        <div className="ssh-panel-back-row">
          <button className="ssh-panel-back" onClick={() => { setView('hosts'); setSelectedHost(null); }}>
            &lsaquo; 主機列表
          </button>
        </div>
        <div className="ssh-panel-section-header">
          <span>
            <span className="ssh-panel-host-chip">{selectedHost?.name}</span>
            <span className="ssh-panel-section-sub"> tmux sessions</span>
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="ssh-panel-btn-icon" title="描描主機上現有的 tmux sessions"
              onClick={handleScan} disabled={scanning}>&#128269;</button>
            <button className="ssh-panel-btn-icon" title="新增 Session"
              onClick={() => { setSessionName(''); setSessionPath(''); setSessionFormError(null); setView('add-session'); }}>
              ＋</button>
          </div>
        </div>
        {loading && <div className="ssh-panel-loading">載入中⋯</div>}
        {error && <div className="ssh-panel-error">{error}</div>}
        {!loading && sessions.length === 0 && !scanDone.current && (
          <div className="ssh-panel-empty">
            還沒有已儲存的 session<br />
            <button className="ssh-panel-link"
              onClick={() => { setSessionName(''); setSessionPath(''); setSessionFormError(null); setView('add-session'); }}>
              手動新增
            </button>
            {' 或點 &#128269; 描描主機'}
          </div>
        )}
        {sessions.length > 0 && (
          <ul className="ssh-panel-list">
            {sessions.map((s) => (
              <li key={s.id} className="ssh-panel-session-item">
                <button className="ssh-panel-session-main" onClick={() => handleConnect(s)} disabled={connecting === s.name}>
                  <span className="ssh-panel-session-icon">&#11041;</span>
                  <span className="ssh-panel-session-info">
                    <span className="ssh-panel-session-name">{s.name}</span>
                    {s.project_path && <span className="ssh-panel-session-path">{s.project_path}</span>}
                  </span>
                  <span className="ssh-panel-connect-label">{connecting === s.name ? '連線中⋯' : '連線'}</span>
                </button>
                <div className="ssh-panel-host-actions">
                  <button className="ssh-panel-btn-sm ssh-panel-btn-danger" onClick={() => handleDeleteSession(s)} title="刪除">&#10005;</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {scanning && (
          <div className="ssh-panel-live-section">
            <div className="ssh-panel-loading">&#128269; 描描主機中⋯</div>
          </div>
        )}
        {scanError && <div className="ssh-panel-error">{scanError}</div>}
        {!scanning && scanDone.current && (
          <div className="ssh-panel-live-section">
            <div className="ssh-panel-live-header">
              {'🖥 主機上現有 Sessions（' + liveSessions.length + '）'}
            </div>
            {liveSessions.length === 0 ? (
              <div className="ssh-panel-empty" style={{ fontSize: 12 }}>主機上沒有任何 tmux session</div>
            ) : (
              <ul className="ssh-panel-list">
                {liveSessions.map((live) => (
                  <li key={live.name} className="ssh-panel-live-item">
                    <div className="ssh-panel-live-info">
                      <span className="ssh-panel-live-name">
                        {live.name}
                        {live.attached && <span className="ssh-panel-live-badge">已連線</span>}
                      </span>
                      <span className="ssh-panel-live-cwd">{live.cwd}</span>
                      <span className="ssh-panel-live-meta">{live.windows} window{live.windows !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="ssh-panel-host-actions">
                      <button className="ssh-panel-btn-sm" title={savedNames.has(live.name) ? '已在清單中' : '加入已儲存清單'}
                        onClick={() => handleAddLiveToSaved(live)}
                        disabled={savedNames.has(live.name)}>
                        {savedNames.has(live.name) ? '已存' : '＋存'}
                      </button>
                      <button className="ssh-panel-btn-sm ssh-panel-btn-connect"
                        onClick={() => handleConnectLive(live)} disabled={connecting === live.name}>
                        {connecting === live.name ? '⋯' : '連線'}
                      </button>
                      <button className="ssh-panel-btn-sm ssh-panel-btn-danger"
                        title="關閉此 tmux session"
                        onClick={() => handleKillLive(live)}>
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHostForm = (isEdit: boolean) => (
    <div className="ssh-panel-content">
      <div className="ssh-panel-back-row">
        <button className="ssh-panel-back" onClick={() => setView('hosts')}>&lsaquo; 主機列表</button>
      </div>
      <div className="ssh-panel-form-title">{isEdit ? '編輯主機' : '新增主機'}</div>
      {formError && <div className="ssh-panel-error">{formError}</div>}
      <div className="ssh-panel-form">
        <label className="ssh-panel-label">名稱</label>
        <input className="ssh-panel-input" value={hostForm.name} placeholder="例如：My Server"
          onChange={(e) => setHostForm((f) => ({ ...f, name: e.target.value }))} />
        <label className="ssh-panel-label">主機位址</label>
        <input className="ssh-panel-input" value={hostForm.host} placeholder="192.168.1.100 或 example.com"
          onChange={(e) => setHostForm((f) => ({ ...f, host: e.target.value }))} />
        <div className="ssh-panel-row">
          <div className="ssh-panel-col">
            <label className="ssh-panel-label">Port</label>
            <input className="ssh-panel-input" type="number" value={hostForm.port} placeholder="22"
              onChange={(e) => setHostForm((f) => ({ ...f, port: e.target.value }))} />
          </div>
          <div className="ssh-panel-col">
            <label className="ssh-panel-label">使用者名稱</label>
            <input className="ssh-panel-input" value={hostForm.username} placeholder="ubuntu"
              onChange={(e) => setHostForm((f) => ({ ...f, username: e.target.value }))} />
          </div>
        </div>
        <label className="ssh-panel-label">驗證方式</label>
        <div className="ssh-panel-radio-group">
          <label className="ssh-panel-radio">
            <input type="radio" value="password" checked={hostForm.authType === 'password'}
              onChange={() => setHostForm((f) => ({ ...f, authType: 'password' }))} />
            密碼
          </label>
          <label className="ssh-panel-radio">
            <input type="radio" value="key" checked={hostForm.authType === 'key'}
              onChange={() => setHostForm((f) => ({ ...f, authType: 'key' }))} />
            SSH 金鑰
          </label>
        </div>
        {hostForm.authType === 'password' ? (
          <>
            <label className="ssh-panel-label">密碼 {isEdit && <span className="ssh-panel-hint">(空白表示不更改)</span>}</label>
            <input className="ssh-panel-input" type="password" value={hostForm.password} placeholder="••••••••"
              onChange={(e) => setHostForm((f) => ({ ...f, password: e.target.value }))} />
          </>
        ) : (
          <>
            <label className="ssh-panel-label">私鑰路徑</label>
            <input className="ssh-panel-input" value={hostForm.privateKeyPath} placeholder="~/.ssh/id_rsa"
              onChange={(e) => setHostForm((f) => ({ ...f, privateKeyPath: e.target.value }))} />
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
        <button className="ssh-panel-back" onClick={() => setView('sessions')}>&lsaquo; Sessions</button>
      </div>
      <div className="ssh-panel-form-title">新增 tmux Session</div>
      {sessionFormError && <div className="ssh-panel-error">{sessionFormError}</div>}
      <div className="ssh-panel-form">
        <label className="ssh-panel-label">Session 名稱</label>
        <input className="ssh-panel-input" value={sessionName} placeholder="my-project"
          onChange={(e) => setSessionName(e.target.value)} />
        <label className="ssh-panel-label">專案路徑 <span className="ssh-panel-hint">(選填)</span></label>
        <input className="ssh-panel-input" value={sessionPath} placeholder="/home/ubuntu/projects/myapp"
          onChange={(e) => setSessionPath(e.target.value)} />
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
    <div className={'ssh-panel' + (resizing ? ' resizing' : '')} style={{ width, minWidth: width }}>
      <div className="ssh-panel-resize" onMouseDown={handleResizeStart} />
      <div className="dir-panel-header">
        <span className="dir-panel-header-title">SSH 連線</span>
        <button className="dir-panel-close" onClick={toggleSshPanel} data-tooltip="關閉">&#10005;</button>
      </div>
      {view === 'hosts' && renderHosts()}
      {view === 'sessions' && renderSessions()}
      {view === 'add-host' && renderHostForm(false)}
      {view === 'edit-host' && renderHostForm(true)}
      {view === 'add-session' && renderSessionForm()}
    </div>
  );
};

export default SshPanel;
