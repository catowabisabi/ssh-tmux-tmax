import { test, expect } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import type { CopilotSessionSummary } from '../../src/shared/copilot-types';

// Regression: ClawPilot continuation turns send a "Here is the
// conversation:\nuser: ...\nassistant: ..." wrapper instead of the
// "[Clawpilot context: ...]" marker the original detector required. Once
// the marker is sliced out (latestPrompt is truncated to 120 chars) or
// never appended (continuation turns), detectSessionHost returned null
// and the notification surfaced as plain "Copilot - Waiting for Input"
// with the Copilot icon.
//
// TASK-161 sharpening: cwd alone is no longer sufficient. The detector
// now requires EITHER the literal marker OR the continuation-wrapper
// phrase together with a /clawpilot/ cwd. This kills false positives
// for plain Claude Code sessions developed inside the ClawPilot project
// folder itself.

async function readCapturedNotifications(app: any): Promise<{ title: string; body: string }[]> {
  return app.evaluate(() => (global as any).__capturedNotifications as { title: string; body: string }[] || []);
}

async function clearCapturedNotifications(app: any): Promise<void> {
  await app.evaluate(() => { (global as any).__capturedNotifications = []; });
}

async function triggerNotificationViaMain(app: any, session: CopilotSessionSummary): Promise<void> {
  await app.evaluate((_arg: unknown, s: CopilotSessionSummary) => {
    const clear = (global as any).__clearNotificationCooldowns;
    if (typeof clear === 'function') clear();
    const fn = (global as any).__notifyCopilotSession;
    if (typeof fn !== 'function') throw new Error('__notifyCopilotSession not exposed - is TMAX_E2E set?');
    fn(s);
  }, session);
}

function makeSession(overrides: Partial<CopilotSessionSummary> = {}): CopilotSessionSummary {
  return {
    id: 'clawpilot-cwd-detection-session',
    provider: 'copilot',
    status: 'waitingForUser',
    cwd: 'C:/Users/me/OneDrive/Documents/Clawpilot',
    branch: '',
    repository: '',
    // Continuation-turn shape: ClawPilot's wrapper template, no marker.
    summary: 'Here is the conversation:\nuser: hello\nassistant: hi there',
    latestPrompt: 'Here is the conversation:\nuser: hello\nassistant: hi there',
    latestPromptTime: Date.now(),
    messageCount: 2,
    toolCallCount: 0,
    lastActivityTime: Date.now(),
    ...overrides,
  };
}

test('continuation-wrapper prompt + /clawpilot/ cwd labels as ClawPilot', async () => {
  const { app, close } = await launchTmax();
  try {
    await clearCapturedNotifications(app);
    await triggerNotificationViaMain(app, makeSession());
    const captured = await readCapturedNotifications(app);
    expect(captured.length).toBe(1);
    expect(captured[0].title).toContain('ClawPilot');
    expect(captured[0].title).not.toMatch(/^Copilot/);
  } finally {
    await close();
  }
});

test('TASK-161: cwd /clawpilot/ ALONE (no marker, no wrapper) is NOT ClawPilot', async () => {
  // Regression for the case where a developer running plain Claude Code
  // in the ClawPilot project folder was seeing toasts mislabelled as
  // ClawPilot. Match: only cwd hits the /clawpilot/ segment; prompt and
  // summary are ordinary user text.
  const { app, close } = await launchTmax();
  try {
    await clearCapturedNotifications(app);
    await triggerNotificationViaMain(app, makeSession({
      id: 'task-161-plain-cc-in-clawpilot-folder',
      provider: 'claude-code',
      summary: 'when I run claw from dev, I want to see the icon of the app',
      latestPrompt: 'testing this',
    }));
    const captured = await readCapturedNotifications(app);
    expect(captured.length).toBe(1);
    expect(captured[0].title).not.toContain('ClawPilot');
  } finally {
    await close();
  }
});

test('TASK-152: continuation-wrapper body is cleaned to just the LATEST user prompt', async () => {
  // ClawPilot continuation turns prepend "Here is the conversation:\nuser: ...\n
  // assistant: ...\nuser: <NEW>". The toast should show <NEW>, not the whole
  // dump. Use multi-turn fixture so we can assert it picks the LAST user line.
  const { app, close } = await launchTmax();
  try {
    await clearCapturedNotifications(app);
    const dump = [
      'Here is the conversation:',
      'user: how do I add a button',
      'assistant: Add a <button> with onClick.',
      'user: now make it red',
    ].join('\n');
    await triggerNotificationViaMain(app, makeSession({
      id: 'task-152-wrapper-body-strip',
      summary: dump,
      latestPrompt: dump,
    }));
    const captured = await readCapturedNotifications(app);
    expect(captured.length).toBe(1);
    expect(captured[0].body).not.toContain('Here is the conversation');
    expect(captured[0].body).not.toContain('assistant:');
    expect(captured[0].body).toContain('now make it red');
  } finally {
    await close();
  }
});

test('TASK-161 follow-up: wrapper-at-START labels as ClawPilot even outside /clawpilot/ cwd', async () => {
  // ClawPilot can be invoked from any folder. After TASK-161 tightened
  // the detection to require cwd /clawpilot/ for the wrapper path, sessions
  // launched elsewhere stopped being labelled. The wrapper-at-start path
  // restores coverage for those without re-introducing the cwd-alone bug.
  const { app, close } = await launchTmax();
  try {
    await clearCapturedNotifications(app);
    await triggerNotificationViaMain(app, makeSession({
      id: 'task-161-wrapper-at-start-outside-folder',
      cwd: 'C:/projects/some-other-project',
      summary: 'Here is the conversation:\nuser: hello\nassistant: Hello!',
      latestPrompt: 'Here is the conversation:\nuser: hello\nassistant: Hello!',
    }));
    const captured = await readCapturedNotifications(app);
    expect(captured.length).toBe(1);
    expect(captured[0].title).toContain('ClawPilot');
  } finally {
    await close();
  }
});

test('sessions outside the Clawpilot folder still label as Copilot', async () => {
  const { app, close } = await launchTmax();
  try {
    await clearCapturedNotifications(app);
    await triggerNotificationViaMain(app, makeSession({
      id: 'control-non-clawpilot',
      cwd: 'C:/projects/tmax',
      summary: 'hello world',
      latestPrompt: 'hello world',
    }));
    const captured = await readCapturedNotifications(app);
    expect(captured.length).toBe(1);
    expect(captured[0].title).toMatch(/^Copilot/);
    expect(captured[0].title).not.toContain('ClawPilot');
  } finally {
    await close();
  }
});
