import { test, expect } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// TASK-153: regression for the loadSession first-prompt fallback (TASK-151).
// Before TASK-151, the fallback was gated on `workspace.name === id`, which
// silently skipped it for every fresh session that parseWorkspace had given
// a repository/cwd-derived name to. As a result, the sidebar showed the
// repo name instead of the user's first prompt until Copilot CLI got around
// to writing `summary:` into workspace.yaml.
//
// These tests drive a fresh CopilotSessionMonitor against a fixture sessions
// directory via the TMAX_E2E global hook __scanCopilotSessionsAtPath, so the
// real loadSession code path runs end-to-end without depending on the user's
// actual ~/.copilot tree.

interface ScannedSummary {
  id: string;
  summary?: string;
  cwd?: string;
  repository?: string;
}

async function scanAt(app: any, basePath: string): Promise<ScannedSummary[]> {
  return app.evaluate(async (_arg: unknown, p: string) => {
    const fn = (global as any).__scanCopilotSessionsAtPath;
    if (typeof fn !== 'function') throw new Error('__scanCopilotSessionsAtPath not exposed - is TMAX_E2E set?');
    return await fn(p);
  }, basePath);
}

function writeUserMessage(eventsPath: string, text: string): void {
  // events.jsonl format: one JSON event per line, the parser looks for
  // `type: "user.message"` (or equivalent) with a text/content field. Use
  // the shape parseSessionEvents in main expects - mirrored from the
  // production sessions on disk.
  const evt = {
    type: 'user.message',
    timestamp: new Date().toISOString(),
    message: { role: 'user', content: text },
    text,
  };
  writeFileSync(eventsPath, JSON.stringify(evt) + '\n');
}

function makeFixture(opts: {
  sessionId: string;
  workspaceYaml: string;
  firstPrompt?: string;
}): string {
  const base = mkdtempSync(join(tmpdir(), 'tmax-loadsession-fixture-'));
  const sessionDir = join(base, opts.sessionId);
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(join(sessionDir, 'workspace.yaml'), opts.workspaceYaml);
  if (opts.firstPrompt !== undefined) {
    writeUserMessage(join(sessionDir, 'events.jsonl'), opts.firstPrompt);
  }
  return base;
}

const FIRST_PROMPT = 'help me set up a dev container for this repo';

test('loadSession: workspace.yaml without summary -> first prompt becomes summary', async () => {
  const fixturePath = makeFixture({
    sessionId: 'task-153-no-summary-session',
    workspaceYaml: [
      'cwd: C:/projects/tmax',
      'branch: main',
      'repository: tmax',
      'name: tmax',
    ].join('\n') + '\n',
    firstPrompt: FIRST_PROMPT,
  });
  const { app, close } = await launchTmax();
  try {
    const sessions = await scanAt(app, fixturePath);
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('task-153-no-summary-session');
    expect(sessions[0].summary).toContain(FIRST_PROMPT.slice(0, 30));
  } finally {
    await close();
    try { rmSync(fixturePath, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

test('loadSession: workspace.yaml with repository AND no summary -> first prompt still wins', async () => {
  // Pre-TASK-151 the `workspace.name === id` gate was the bug; this test
  // is the explicit regression for that. workspace.name is derived from
  // `repository` so it differs from `id`, which used to keep the fallback
  // dormant.
  const fixturePath = makeFixture({
    sessionId: 'task-153-with-repo-no-summary-session',
    workspaceYaml: [
      'cwd: C:/projects/some-repo',
      'branch: feature-x',
      'repository: some-repo',
      'name: some-repo',
    ].join('\n') + '\n',
    firstPrompt: FIRST_PROMPT,
  });
  const { app, close } = await launchTmax();
  try {
    const sessions = await scanAt(app, fixturePath);
    expect(sessions.length).toBe(1);
    expect(sessions[0].summary).toContain(FIRST_PROMPT.slice(0, 30));
    // Belt-and-suspenders: ensure the bug case (repo name leaking into the
    // summary) doesn't sneak back in.
    expect(sessions[0].summary).not.toBe('some-repo');
  } finally {
    await close();
    try { rmSync(fixturePath, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

test('loadSession: workspace.yaml with explicit summary wins over first prompt', async () => {
  // Sanity test for the inverse case: when workspace.yaml has its own
  // summary the fallback should NOT run.
  const explicitSummary = 'a deliberate summary the user picked';
  const fixturePath = makeFixture({
    sessionId: 'task-153-explicit-summary-session',
    workspaceYaml: [
      'cwd: C:/projects/tmax',
      'branch: main',
      'repository: tmax',
      'name: tmax',
      `summary: ${explicitSummary}`,
    ].join('\n') + '\n',
    firstPrompt: FIRST_PROMPT,
  });
  const { app, close } = await launchTmax();
  try {
    const sessions = await scanAt(app, fixturePath);
    expect(sessions.length).toBe(1);
    expect(sessions[0].summary).toBe(explicitSummary);
    expect(sessions[0].summary).not.toContain(FIRST_PROMPT.slice(0, 20));
  } finally {
    await close();
    try { rmSync(fixturePath, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});
