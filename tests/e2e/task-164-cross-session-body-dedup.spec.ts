import { test, expect } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import type { CopilotSessionSummary } from '../../src/shared/copilot-types';

// TASK-164: ClawPilot spawns two distinct sessions per turn (one Claude Code
// SDK and one Copilot), each with its own session.id. The per-session
// FLICKER_COOLDOWN_MS in copilot-notification.ts is keyed on session.id, so
// it can't suppress this cross-session duplicate. A short content-based
// dedup window collapses near-identical bodies from sibling sessions
// without affecting same-session repeat behavior (handled separately).

async function readCaptured(app: any): Promise<{ title: string; body: string }[]> {
  return app.evaluate(() => (global as any).__capturedNotifications as { title: string; body: string }[] || []);
}

async function clearCaptured(app: any): Promise<void> {
  await app.evaluate(() => { (global as any).__capturedNotifications = []; });
}

async function resetCooldowns(app: any): Promise<void> {
  await app.evaluate(() => {
    const clear = (global as any).__clearNotificationCooldowns;
    if (typeof clear === 'function') clear();
  });
}

// Unlike the TASK-156 spec, do NOT reset cooldowns between calls - we
// need to test cross-call dedup behavior. resetCooldowns is called once
// at the start of each test instead.
async function triggerNoReset(app: any, session: CopilotSessionSummary): Promise<void> {
  await app.evaluate((_arg: unknown, s: CopilotSessionSummary) => {
    const fn = (global as any).__notifyCopilotSession;
    if (typeof fn !== 'function') throw new Error('__notifyCopilotSession not exposed - is TMAX_E2E set?');
    fn(s);
  }, session);
}

function makeSession(overrides: Partial<CopilotSessionSummary> = {}): CopilotSessionSummary {
  return {
    id: 'task-164-default-id',
    provider: 'copilot',
    status: 'waitingForUser',
    cwd: 'C:/projects/tmax',
    branch: 'main',
    repository: 'tmax',
    summary: 'default prompt',
    slug: 'fixture',
    latestPrompt: 'default prompt',
    latestPromptTime: Date.now(),
    messageCount: 1,
    toolCallCount: 0,
    lastActivityTime: Date.now(),
    ...overrides,
  };
}

test('TASK-164: two sessions with identical body within 8s -> only first fires', async () => {
  const { app, close } = await launchTmax();
  try {
    await resetCooldowns(app);
    await clearCaptured(app);

    const sharedBody = 'Here is the conversation:\nuser: write a haiku\nassistant: ...';

    // First session - a Claude Code (provider) variant; this represents the
    // ClawPilot-detected notification that fires first.
    await triggerNoReset(app, makeSession({
      id: 'task-164-clawpilot-half',
      provider: 'claude-code',
      summary: sharedBody,
      latestPrompt: sharedBody,
    }));
    // Second session - the parallel Copilot half with the same body.
    // Different id, different provider, same content - should be deduped.
    await triggerNoReset(app, makeSession({
      id: 'task-164-copilot-half',
      provider: 'copilot',
      summary: sharedBody,
      latestPrompt: sharedBody,
    }));

    const captured = await readCaptured(app);
    expect(captured.length).toBe(1);
  } finally {
    await close();
  }
});

test('TASK-164: two sessions with DIFFERENT bodies both fire', async () => {
  const { app, close } = await launchTmax();
  try {
    await resetCooldowns(app);
    await clearCaptured(app);

    await triggerNoReset(app, makeSession({
      id: 'task-164-session-a',
      summary: 'session A first prompt about login',
      latestPrompt: 'session A first prompt about login',
    }));
    await triggerNoReset(app, makeSession({
      id: 'task-164-session-b',
      summary: 'session B completely different topic',
      latestPrompt: 'session B completely different topic',
    }));

    const captured = await readCaptured(app);
    expect(captured.length).toBe(2);
  } finally {
    await close();
  }
});

test('TASK-164: dedup window is body-keyed - identical bodies from same session still get per-session cooldown', async () => {
  const { app, close } = await launchTmax();
  try {
    await resetCooldowns(app);
    await clearCaptured(app);

    // Two rapid-fire notifications for the SAME session.id with the same
    // body. The per-session flicker cooldown should catch the second one;
    // the cross-session dedup is also a backstop. Either way, only one
    // fires. (Sanity check that adding the cross-session layer didn't
    // break the per-session path.)
    const s = makeSession({ id: 'task-164-same-session-repeat' });
    await triggerNoReset(app, s);
    await triggerNoReset(app, s);

    const captured = await readCaptured(app);
    expect(captured.length).toBe(1);
  } finally {
    await close();
  }
});
