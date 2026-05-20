import { Client, ClientChannel } from 'ssh2';
import { EventEmitter } from 'events';

export interface SshSession {
  id: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface SshCallbacks {
  onData: (id: string, data: string) => void;
  onExit: (id: string, exitCode: number | undefined) => void;
  onReady: (id: string) => void;
  onError: (id: string, err: Error) => void;
}

export class SshManager extends EventEmitter {
  private clients = new Map<string, Client>();
  private streams = new Map<string, ClientChannel>();

  constructor(private callbacks: SshCallbacks) {
    super();
  }

  connect(session: SshSession): void {
    const { id, host, port, username, password, privateKey } = session;

    const client = new Client();
    this.clients.set(id, client);

    client.on('ready', () => {
      this.handleReady(id, client);
    });

    client.on('error', (err) => {
      this.callbacks.onError(id, err);
    });

    client.on('close', () => {
      this.cleanup(id);
    });

    const connectOpts: {
      host: string;
      port: number;
      username: string;
      readyTimeout: number;
      password?: string;
      privateKey?: string;
    } = {
      host,
      port,
      username,
      readyTimeout: 20000,
    };

    if (password) {
      connectOpts.password = password;
    } else if (privateKey) {
      connectOpts.privateKey = privateKey;
    }

    client.connect(connectOpts);
  }

  private handleReady(id: string, client: Client): void {
    client.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        this.callbacks.onError(id, err);
        return;
      }

      this.streams.set(id, stream);

      stream.on('data', (data: Buffer) => {
        this.callbacks.onData(id, data.toString());
      });

      stream.on('close', () => {
        this.callbacks.onExit(id, undefined);
        this.cleanup(id);
      });

stream.on('error', (err: Error) => {
      this.callbacks.onError(id, err);
    });

      this.callbacks.onReady(id);
    });
  }

  write(id: string, data: string): void {
    const stream = this.streams.get(id);
    if (stream) {
      stream.write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const stream = this.streams.get(id);
    if (stream) {
      // setWindow(rows, cols, width, height)
      stream.setWindow(rows, cols, 0, 0);
    }
  }

  disconnect(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.end();
      this.cleanup(id);
    }
  }

  disconnectAll(): void {
    for (const [id] of this.clients) {
      this.disconnect(id);
    }
  }

  isConnected(id: string): boolean {
    return this.clients.has(id);
  }

  private cleanup(id: string): void {
    this.clients.delete(id);
    this.streams.delete(id);
  }
}