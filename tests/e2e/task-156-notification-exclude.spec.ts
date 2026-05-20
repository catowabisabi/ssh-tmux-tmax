import { test, expect } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import type { CopilotSessionSummary } from '../../src/shared/copilot-types';

// TASK-156: case-insensitive substring deny-list applied to AI session
// notifications. Suppressed toasts must NOT be captured (so the suppression
// also covers the OS-show path) and the rule must match either title or body.

const SESSION_ID = 'task-156-exclude-session';
const NOISY_BODY_PHRASE = 'scheduled automation just completed';
const QUIET_BODY = 'real user prompt please respond';

async function readCaptured(app: any): Promise<{ title: string; body: string }[]> {
  return app.evaluate(() => (global as any).__capturedNotifications as { title: string; body: string }[] || []);
}

async function clearCaptured(app: any): Promise<void> {
  await app.evaluate(() => { (global as any).__capturedNotifications = []; });
}

async function setExcludeStrings(app: any, values: string[]): Promise<void> {
  await app.evaluate((_arg: unknown, vals: string[]) => {
    const setter = (global as any).__setNotificationExcludeStrings;
    if (typeof setter !== 'function') throw new Error('__setNotificationExcludeStrings not exposed - is TMAX_E2E set?');
    setter(vals);
  }, values);
}

async function trigger(app: any, session: CopilotSessionSummary): Promise<void> {
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
    id: SESSION_ID,
    provider: 'claude-code',
    status: 'waitingForUser',
    cwd: 'C:/projects/tmax',
    branch: 'main',
    repository: 'tmax',
    summary: QUIET_BODY,
    slug: 'calm-river',
    latestPrompt: QUIET_BODY,
    latestPromptTime: Date.now(),
    messageCount: 1,
    toolCallCount: 0,
    lastActivityTime: Date.now(),
    ...overrides,
  };
}

test('exclude list suppresses notifications whose body contains a configured phrase', async () => {
  const { app, close } = await launchTmax();
  try {
    await setExcludeStrings(app, ['scheduled automation']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      summary: NOISY_BODY_PHRASE,
      latestPrompt: NOISY_BODY_PHRASE,
    }));
    const captured = await readCaptured(app);
    expect(captured.length).toBe(0);
  } finally {
    await close();
  }
});

test('matching is case-insensitive', async () => {
  const { app, close } = await launchTmax();
  try {
    await setExcludeStrings(app, ['SCHEDULED AUTOMATION']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      summary: 'A scheduled automation just completed',
      latestPrompt: 'A scheduled automation just completed',
    }));
    const captured = await readCaptured(app);
    expect(captured.length).toBe(0);
  } finally {
    await close();
  }
});

test('non-matching notifications still fire', async () => {
  const { app, close } = await launchTmax();
  try {
    await setExcludeStrings(app, ['scheduled automation']);

    await clearCaptured(app);
    await trigger(app, makeSession({ id: 'task-156-control-session' }));
    const captured = await readCaptured(app);
    expect(captured.length).toBe(1);
    expect(captured[0].body).toContain(QUIET_BODY);
  } finally {
    await close();
  }
});

test('empty / whitespace-only rules do not suppress everything', async () => {
  const { app, close } = await launchTmax();
  try {
    // Mimic a textarea where the user has an empty line, a whitespace line,
    // and one real phrase that does NOT match the test body.
    await setExcludeStrings(app, ['', '   ', 'unrelated-needle']);

    await clearCaptured(app);
    await trigger(app, makeSession({ id: 'task-156-blank-rules-session' }));
    const captured = await readCaptured(app);
    expect(captured.length).toBe(1);
  } finally {
    await close();
  }
});

test('exclude list matches against title too (e.g. agent label)', async () => {
  const { app, close } = await launchTmax();
  try {
    // The title for a ClawPilot-detected session contains "ClawPilot - ...".
    // A user who silences ClawPilot entirely should be able to type
    // "clawpilot" and never see another one.
    await setExcludeStrings(app, ['clawpilot']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      id: 'task-156-title-match-session',
      latestPrompt: '<clawpilot>some context</clawpilot>\nplease answer',
    }));
    const captured = await readCaptured(app);
    expect(captured.length).toBe(0);
  } finally {
    await close();
  }
});

test('TASK-155: slash-delimited entries are treated as regex', async () => {
  const { app, close } = await launchTmax();
  try {
    // Match anything that looks like "build #<n>" (e.g. build automation chatter).
    await setExcludeStrings(app, ['/build #\\d+/']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      id: 'task-155-regex-match-session',
      summary: 'CI build #42 just completed',
      latestPrompt: 'CI build #42 just completed',
    }));
    expect((await readCaptured(app)).length).toBe(0);

    // Sanity: a body that doesn't match the regex still fires.
    await clearCaptured(app);
    await trigger(app, makeSession({ id: 'task-155-regex-nomatch-session' }));
    expect((await readCaptured(app)).length).toBe(1);
  } finally {
    await close();
  }
});

test('TASK-155: invalid regex is ignored gracefully (does not break other rules)', async () => {
  const { app, close } = await launchTmax();
  try {
    // First entry is an invalid regex (unclosed group). Second is a valid
    // substring that should still match.
    await setExcludeStrings(app, ['/[unclosed/', 'scheduled automation']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      id: 'task-155-invalid-regex-session',
      summary: NOISY_BODY_PHRASE,
      latestPrompt: NOISY_BODY_PHRASE,
    }));
    expect((await readCaptured(app)).length).toBe(0);
  } finally {
    await close();
  }
});

test('clearing the list re-enables notifications', async () => {
  const { app, close } = await launchTmax();
  try {
    await setExcludeStrings(app, ['scheduled automation']);

    await clearCaptured(app);
    await trigger(app, makeSession({
      id: 'task-156-toggle-session-a',
      summary: NOISY_BODY_PHRASE,
      latestPrompt: NOISY_BODY_PHRASE,
    }));
    expect((await readCaptured(app)).length).toBe(0);

    await setExcludeStrings(app, []);

    await clearCaptured(app);
    await trigger(app, makeSession({
      id: 'task-156-toggle-session-b',
      summary: NOISY_BODY_PHRASE,
      latestPrompt: NOISY_BODY_PHRASE,
    }));
    expect((await readCaptured(app)).length).toBe(1);
  } finally {
    await close();
  }
});
