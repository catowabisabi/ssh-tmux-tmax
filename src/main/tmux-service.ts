import { Client } from 'ssh2';

export interface TmuxSessionInfo {
  name: string;
  attached: boolean;
  windows: number;
  created: number;
}

export interface TmuxLiveSession {
  name: string;
  attached: boolean;
  windows: number;
  cwd: string;
}

export class TmuxService {
  constructor(private sshClient: Client) {}

  private exec(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.sshClient.exec(cmd, (err, stream) => {
        if (err) { reject(err); return; }
        let output = '';
        stream.on('data', (data: Buffer) => { output += data.toString(); });
        stream.on('close', () => { resolve(output); });
        stream.on('error', (err: Error) => { reject(err); });
      });
    });
  }

  async listSessions(): Promise<TmuxSessionInfo[]> {
    const output = await this.exec(
      'tmux list-sessions -F "#{session_name}|#{session_attached}|#{session_windows}|#{session_created}" 2>/dev/null || echo ""'
    );
    if (!output.trim()) return [];
    return output.trim().split('\n').map((line) => {
      const [name, attached, windows, created] = line.split('|');
      return { name, attached: attached === '1', windows: parseInt(windows, 10), created: parseInt(created, 10) };
    });
  }

  async hasSession(name: string): Promise<boolean> {
    const output = await this.exec(
      `tmux has-session -t "${name}" 2>/dev/null && echo "exists" || echo ""`
    );
    return output.trim() === 'exists';
  }

  async createSession(name: string, path?: string): Promise<boolean> {
    const exists = await this.hasSession(name);
    if (exists) return false;
    const cwd = path || '~';
    await this.exec(`tmux new-session -d -s "${name}" -c "${cwd}"`);
    return true;
  }

  async attachSession(name: string, detachOthers = true): Promise<void> {
    await this.exec(
      `tmux has-session -t "${name}" 2>/dev/null || tmux new-session -d -s "${name}"`
    );
    const cmd = detachOthers
      ? `tmux attach-session -d -t "${name}"`
      : `tmux attach-session -t "${name}"`;
    await this.exec(cmd);
  }

  async killSession(name: string): Promise<void> {
    await this.exec(`tmux kill-session -t "${name}" 2>/dev/null || true`);
  }

  async renameSession(oldName: string, newName: string): Promise<void> {
    await this.exec(`tmux rename-session -t "${oldName}" "${newName}"`);
  }

  async sendKeys(sessionName: string, keys: string): Promise<void> {
    await this.exec(`tmux send-keys -t "${sessionName}" "${keys}" Enter`);
  }

  /**
   * List all live tmux sessions on the remote host with their current working
   * directories. Deduplication (first pane per session) is done in TypeScript.
   */
  async listLiveSessions(): Promise<TmuxLiveSession[]> {
    const cmd =
      'tmux list-panes -a -F "#{session_name}|#{session_attached}|#{session_windows}|#{pane_current_path}" 2>/dev/null || echo ""';
    const output = await this.exec(cmd);
    if (!output.trim()) return [];

    const seen = new Set<string>();
    const results: TmuxLiveSession[] = [];

    for (const line of output.trim().split('\n')) {
      if (!line.includes('|')) continue;
      const p = line.split('|');
      const name = p[0] ?? '';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      results.push({
        name,
        attached: p[1] === '1',
        windows: parseInt(p[2] ?? '0', 10),
        cwd: (p[3] ?? '~').trim(),
      });
    }
    return results;
  }
}
