// Walk a PID's descendant process names. Used by TASK-171's process-tree
// detection to discover whether an AI CLI (copilot.exe / claude.exe / etc.)
// is running inside a pane's shell. Single one-shot query - no polling.
//
// Windows uses wmic (legacy but always present); Unix uses pgrep -P. Both
// return process names that the renderer matches against a known AI list.
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

const MAX_DEPTH = 3;
const QUERY_TIMEOUT_MS = 2500;

async function getDirectChildrenWindows(pid: number): Promise<{ pid: number; name: string }[]> {
  try {
    const { stdout } = await execFileP(
      'wmic',
      ['process', 'where', `(ParentProcessId=${pid})`, 'get', 'Name,ProcessId', '/format:csv'],
      { timeout: QUERY_TIMEOUT_MS, windowsHide: true },
    );
    const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: { pid: number; name: string }[] = [];
    for (const line of lines) {
      // CSV format: Node,Name,ProcessId
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const name = parts[1]?.trim();
      const childPid = parseInt(parts[2]?.trim() ?? '', 10);
      if (!name || !Number.isFinite(childPid) || childPid === pid) continue;
      if (name === 'Name') continue; // header row
      out.push({ pid: childPid, name });
    }
    return out;
  } catch {
    return [];
  }
}

async function getDirectChildrenUnix(pid: number): Promise<{ pid: number; name: string }[]> {
  try {
    const { stdout } = await execFileP('pgrep', ['-P', String(pid), '-l'], {
      timeout: QUERY_TIMEOUT_MS,
    });
    const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    const out: { pid: number; name: string }[] = [];
    for (const line of lines) {
      const m = /^(\d+)\s+(.+)$/.exec(line);
      if (!m) continue;
      const childPid = parseInt(m[1], 10);
      if (!Number.isFinite(childPid)) continue;
      out.push({ pid: childPid, name: m[2] });
    }
    return out;
  } catch {
    return [];
  }
}

const getDirectChildren = process.platform === 'win32'
  ? getDirectChildrenWindows
  : getDirectChildrenUnix;

/**
 * Return process names of all descendants of `rootPid` up to MAX_DEPTH levels
 * deep. Names are returned without path or .exe extension (lowercased for
 * easy matching). Empty array on error/timeout - caller treats that as "no
 * AI process detected" without retrying.
 */
export async function getDescendantNames(rootPid: number): Promise<string[]> {
  if (!Number.isFinite(rootPid) || rootPid <= 0) return [];
  const visited = new Set<number>();
  const names: string[] = [];
  async function walk(pid: number, depth: number): Promise<void> {
    if (depth >= MAX_DEPTH) return;
    if (visited.has(pid)) return;
    visited.add(pid);
    const children = await getDirectChildren(pid);
    for (const c of children) {
      const cleanName = c.name.replace(/\.exe$/i, '').toLowerCase();
      names.push(cleanName);
      await walk(c.pid, depth + 1);
    }
  }
  await walk(rootPid, 0);
  return names;
}
