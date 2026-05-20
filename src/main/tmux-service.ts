import { Client } from 'ssh2';

export interface TmuxSessionInfo {
  name: string;
  attached: boolean;
  windows: number;
  created: number;
}

export class TmuxService {
  constructor(private sshClient: Client) {}

  private exec(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.sshClient.exec(cmd, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        let output = '';
        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });
        stream.on('close', () => {
          resolve(output);
        });
stream.on('error', (err: Error) => {
        reject(err);
      });
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
      return {
        name,
        attached: attached === '1',
        windows: parseInt(windows, 10),
        created: parseInt(created, 10),
      };
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

  async attachSession(name: string, detachOthers: boolean = true): Promise<void> {
    // First ensure session exists, create if not
    await this.exec(
      `tmux has-session -t "${name}" 2>/dev/null || tmux new-session -d -s "${name}"`
    );
    // Attach with -d (detach other clients) if requested
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
}