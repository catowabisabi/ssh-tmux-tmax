import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

const DB_PATH = path.join(app.getPath('userData'), 'cato.db');

let db: Database.Database | null = null;

export function initDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'password',
      password_encrypted TEXT,
      private_key_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tmux_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      project_path TEXT,
      start_command TEXT,
      auto_attach INTEGER DEFAULT 1,
      auto_detach_existing INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(host_id, name),
      FOREIGN KEY(host_id) REFERENCES hosts(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}

// ── Host operations ────────────────────────────────────────────────

export interface Host {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password_encrypted: string | null;
  private_key_path: string | null;
  created_at: string;
  updated_at: string;
}

export function createHost(data: Omit<Host, 'id' | 'created_at' | 'updated_at'>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO hosts (name, host, port, username, auth_type, password_encrypted, private_key_path)
    VALUES (@name, @host, @port, @username, @auth_type, @password_encrypted, @private_key_path)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid as number;
}

export function getHosts(): Host[] {
  const db = getDb();
  return db.prepare('SELECT * FROM hosts ORDER BY name').all() as Host[];
}

export function getHost(id: number): Host | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM hosts WHERE id = ?').get(id) as Host | undefined;
}

export function updateHost(id: number, data: Partial<Host>): void {
  const db = getDb();
  const fields = Object.keys(data)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = @${k}`)
    .join(', ');
  if (fields) {
    db.prepare(`UPDATE hosts SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
      .run({ ...data, id });
  }
}

export function deleteHost(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM hosts WHERE id = ?').run(id);
}

// ── Tmux session operations ─────────────────────────────────────────

export interface TmuxSessionRecord {
  id: number;
  host_id: number;
  name: string;
  project_path: string | null;
  start_command: string | null;
  auto_attach: number;
  auto_detach_existing: number;
  created_at: string;
  updated_at: string;
}

export function createTmuxSession(data: Omit<TmuxSessionRecord, 'id' | 'created_at' | 'updated_at'>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tmux_sessions (host_id, name, project_path, start_command, auto_attach, auto_detach_existing)
    VALUES (@host_id, @name, @project_path, @start_command, @auto_attach, @auto_detach_existing)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid as number;
}

export function getTmuxSessions(hostId?: number): TmuxSessionRecord[] {
  const db = getDb();
  if (hostId !== undefined) {
    return db.prepare('SELECT * FROM tmux_sessions WHERE host_id = ? ORDER BY name').all(hostId) as TmuxSessionRecord[];
  }
  return db.prepare('SELECT * FROM tmux_sessions ORDER BY name').all() as TmuxSessionRecord[];
}

export function getTmuxSession(id: number): TmuxSessionRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM tmux_sessions WHERE id = ?').get(id) as TmuxSessionRecord | undefined;
}

export function updateTmuxSession(id: number, data: Partial<TmuxSessionRecord>): void {
  const db = getDb();
  const fields = Object.keys(data)
    .filter((k) => k !== 'id')
    .map((k) => `${k} = @${k}`)
    .join(', ');
  if (fields) {
    db.prepare(`UPDATE tmux_sessions SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
      .run({ ...data, id });
  }
}

export function deleteTmuxSession(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM tmux_sessions WHERE id = ?').run(id);
}

// ── App settings ──────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
}