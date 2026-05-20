import { test, expect } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Regression for the user-reported "first prompt updates title, but /rename
// doesn't" case. The original /rename test (issue-2-rename-watcher) seeded
// workspace.yaml with an explicit `summary:` field, so it never exercised the
// state real Copilot sessions are in: no `summary:` line at all, only `name:`
// (auto-generated from the first prompt) and `user_named: false`. After my
// loadSession fix, the sidebar derives its title from the first prompt in
// events.jsonl; this test then writes a /rename-style update (`name: yoo4`,
// `user_named: true`) and asserts the sidebar follows through.

const TEST_GUID_PREFIX = 'test-task-154';
const SESSION_BASE = join(homedir(), '.copilot', 'session-state');

function makeTestSession(): { guid: string; dir: string; cleanup: () => void } {
  const guid = `${TEST_GUID_PREFIX}-${Math.random().toString(36).slice(2, 10)}`;
  const dir = join(SESSION_BASE, guid);
  mkdirSync(dir, { recursive: true });
  return {
    guid,
    dir,
    cleanup: () => {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    },
  };
}

function writeWorkspaceYaml(dir: string, fields: Record<string, string | boolean>): void {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(join(dir, 'workspace.yaml'), lines.join('\n') + '\n');
}

function writeEventsJsonlWithPrompt(dir: string, prompt: string): void {
  // The parser reads `data.content` from user.message events.
  const event = {
    type: 'user.message',
    timestamp: new Date().toISOString(),
    data: { content: prompt },
  };
  writeFileSync(join(dir, 'events.jsonl'), JSON.stringify(event) + '\n');
}

test('first prompt populates summary, then /rename overrides it', async () => {
  const fixture = makeTestSession();
  const { window, close } = await launchTmax();
  try {
    await window.waitForFunction(() => !!(window as any).__terminalStore, null, { timeout: 15_000 });
    await window.waitForFunction(() => {
      const s = (window as any).__terminalStore.getState();
      return s.copilotSqliteActive === true || s.copilotSessions.length > 0;
    }, null, { timeout: 15_000 });
    await window.waitForTimeout(2_000);

    // Step 1: seed a session with NO `summary:` line (matches a real fresh
    // Copilot CLI session before the SDK writes a summary, which it often
    // never does - it writes `name:` instead). Repository is set so the
    // pre-fix parseWorkspace would derive workspace.name from it.
    //
    // Write events.jsonl FIRST so that whichever file chokidar picks up
    // first, the prompt is already on disk when loadSession runs. This
    // avoids racing the watcher: if workspace.yaml lands first and events
    // doesn't exist yet, the first loadSession call sees no prompt to fall
    // back to and the session is stamped with summary=''. The followup
    // change event then has to flip it - which works in theory but the
    // chokidar `add` for events.jsonl was timing out in practice.
    writeEventsJsonlWithPrompt(fixture.dir, 'hiiiiiiiiiiiii');
    writeWorkspaceYaml(fixture.dir, {
      cwd: 'C:/projects/task-154-fixture',
      branch: 'main',
      repository: 'fixture/repo',
      user_named: false,
      created_at: new Date().toISOString(),
    });

    // First-prompt fallback should populate summary from events.jsonl.
    await expect.poll(
      async () => window.evaluate((guid) => {
        const s = (window as any).__terminalStore.getState();
        const ours = s.copilotSessions.find((x: any) => x.id === guid);
        return ours?.summary ?? null;
      }, fixture.guid),
      { timeout: 15_000, intervals: [200, 500, 1000] },
    ).toBe('hiiiiiiiiiiiii');

    // Step 2: simulate /rename. The CLI overwrites workspace.yaml with the
    // chosen name plus `user_named: true`, but does NOT add a `summary:`
    // field. parseWorkspace's user_named branch should set
    // workspace.summary = workspace.name, and loadSession's first-prompt
    // fallback should skip (summary is now truthy).
    writeWorkspaceYaml(fixture.dir, {
      cwd: 'C:/projects/task-154-fixture',
      branch: 'main',
      repository: 'fixture/repo',
      name: 'yoo4',
      user_named: true,
      created_at: new Date().toISOString(),
    });

    await expect.poll(
      async () => window.evaluate((guid) => {
        const s = (window as any).__terminalStore.getState();
        const ours = s.copilotSessions.find((x: any) => x.id === guid);
        return ours?.summary ?? null;
      }, fixture.guid),
      { timeout: 15_000, intervals: [200, 500, 1000] },
    ).toBe('yoo4');
  } finally {
    fixture.cleanup();
    await close();
  }
});
