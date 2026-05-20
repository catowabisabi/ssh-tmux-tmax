import { test, expect, Page } from '@playwright/test';
import { launchTmax } from './fixtures/launch';
import type { CopilotSessionSummary } from '../../src/shared/copilot-types';

// AI Sessions sidebar: sort + group sanity checks.
//   1. Alphabetical group order sorts by the visible group label
//      (the disambiguated leaf folder name) rather than the full
//      lowercased cwd, so the user-visible order matches the labels.
//   2. The column header bar above the list drives within-group sorting
//      (Title / Activity / Prompts), with click-to-flip-direction.
//   3. The old SORT submenu is gone in both grouped and ungrouped state.

function makeSession(overrides: Partial<CopilotSessionSummary>): CopilotSessionSummary {
  return {
    id: 'fixture-default-id',
    provider: 'copilot',
    status: 'idle',
    cwd: 'C:/fixture/default',
    branch: 'main',
    repository: 'fixture',
    summary: 'fixture summary',
    slug: 'fixture',
    latestPrompt: 'fixture summary',
    latestPromptTime: Date.now(),
    messageCount: 1,
    toolCallCount: 0,
    lastActivityTime: Date.now(),
    ...overrides,
  };
}

// Replace the store's copilotSessions with our fixtures and lock the load
// paths so nothing wipes them mid-test (real session monitor on disk would
// otherwise keep pushing real sessions in).
async function seedSessionsAndOpenPanel(
  window: Page,
  sessions: CopilotSessionSummary[],
  config: { aiGroupByRepo?: boolean; aiSessionListSortMode?: string; aiGroupByRepoOrder?: string },
): Promise<void> {
  // Wait for the initial load to settle (same pattern as issue-2-rename-sync).
  await window.waitForFunction(() => {
    const w = window as any;
    const s = w.__terminalStore.getState();
    const now = s.copilotSessions.length;
    const last = w.__lastCopilotCount;
    const stableSince = w.__stableSince || 0;
    if (now !== last) {
      w.__lastCopilotCount = now;
      w.__stableSince = Date.now();
      return false;
    }
    return Date.now() - stableSince > 600;
  }, null, { timeout: 20_000, polling: 200 });

  await window.evaluate(({ sessions, config }) => {
    const store = (window as any).__terminalStore;
    // Force lifecycle overrides to 'active' so the lifecycle filter keeps
    // them in the visible 'active' tab regardless of disk-age heuristics.
    const lifecycleOverrides: Record<string, string> = {};
    for (const s of sessions) lifecycleOverrides[s.id] = 'active';
    store.setState({
      loadCopilotSessions: async () => { /* test no-op */ },
      loadClaudeCodeSessions: async () => { /* test no-op */ },
      setCopilotSessions: () => { /* test no-op */ },
      autoArchiveStaleSessions: () => { /* test no-op */ },
      // Disk watcher pushes via these on every change; no-op them so real
      // sessions can't leak back in after we seed.
      addCopilotSession: () => { /* test no-op */ },
      updateCopilotSession: () => { /* test no-op */ },
      removeCopilotSession: () => { /* test no-op */ },
      addClaudeCodeSession: () => { /* test no-op */ },
      updateClaudeCodeSession: () => { /* test no-op */ },
      removeClaudeCodeSession: () => { /* test no-op */ },
      copilotSessions: sessions,
      claudeCodeSessions: [],
      copilotSessionsTotal: sessions.length,
      claudeCodeSessionsTotal: 0,
      sessionNameOverrides: {},
      sessionLifecycleOverrides: lifecycleOverrides,
      sessionPinned: {},
      showCopilotPanel: true,
      config: { ...store.getState().config, ...config },
    });
  }, { sessions, config });

  // Wait for the panel to render. In grouped mode groups auto-collapse on
  // initial mount; click each group header to expand so .ai-session-item
  // rows are present in the DOM for assertions.
  await window.waitForSelector('.copilot-panel .ai-session-sort-header', { timeout: 5_000 });
  if (config.aiGroupByRepo) {
    await window.waitForSelector('.copilot-panel .ai-session-group-header', { timeout: 5_000 });
    // Expand every collapsed group so child rows render.
    await window.evaluate(() => {
      const headers = document.querySelectorAll('.copilot-panel .ai-session-group-header.collapsed');
      headers.forEach((h) => (h as HTMLElement).click());
    });
  }
  await window.waitForSelector('.copilot-panel .ai-session-item', { timeout: 5_000 });
}

// Helper: read our fixture rows in order from the rendered list. Filters
// out real on-disk sessions that leak in via the session watcher.
async function readFixtureSummaries(window: Page, pattern: RegExp): Promise<string[]> {
  const rowSummaries = await window.$$eval(
    '.copilot-panel .ai-session-item .ai-session-name',
    (els) => els.map((e) => (e as HTMLElement).innerText.trim()),
  );
  return rowSummaries.filter((s) => pattern.test(s));
}

async function clickHeader(window: Page, column: 'title' | 'activity' | 'prompts'): Promise<void> {
  await window.click(`.copilot-panel .ai-session-sort-header-col[data-column="${column}"]`);
}

// Re-seed copilotSessions to the given fixtures. Useful between clicks when
// the disk watcher has had a chance to push real sessions back in. Keeps the
// no-op handler set in place from the initial seed.
async function reSeedFixtures(window: Page, sessions: CopilotSessionSummary[]): Promise<void> {
  await window.evaluate(({ sessions }) => {
    const store = (window as any).__terminalStore;
    const lifecycleOverrides: Record<string, string> = {};
    for (const s of sessions) lifecycleOverrides[s.id] = 'active';
    store.setState({
      copilotSessions: sessions,
      claudeCodeSessions: [],
      sessionLifecycleOverrides: lifecycleOverrides,
      copilotSessionsTotal: sessions.length,
      claudeCodeSessionsTotal: 0,
    });
  }, { sessions });
  // Re-expand any collapsed groups so child rows render.
  await window.evaluate(() => {
    const headers = document.querySelectorAll('.copilot-panel .ai-session-group-header.collapsed');
    headers.forEach((h) => (h as HTMLElement).click());
  });
}

async function readActiveHeader(window: Page): Promise<{ column: string; glyph: string } | null> {
  return window.evaluate(() => {
    const active = document.querySelector(
      '.copilot-panel .ai-session-sort-header-col.active',
    ) as HTMLElement | null;
    if (!active) return null;
    const column = active.getAttribute('data-column') || '';
    const glyph = (active.querySelector('.ai-session-sort-header-glyph') as HTMLElement | null)?.innerText.trim() ?? '';
    return { column, glyph };
  });
}

test('Title column sorts groups by the visible label, not the hidden cwd', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'zulu-1',  cwd: 'C:/a/sortspec-fixture-zulu',       repository: 'zulu-fixture',  lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'alpha-1', cwd: 'C:/z/sortspec-fixture-alpha',      repository: 'alpha-fixture', lastActivityTime: Date.now() - 2000 }),
      makeSession({ id: 'mike-1',  cwd: 'D:/m/sortspec-fixture-mike',       repository: 'mike-fixture',  lastActivityTime: Date.now() - 3000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'title-asc',
    });
    await reSeedFixtures(window, sessions);

    const headers = await window.$$eval('.copilot-panel .ai-session-group-name', (els) =>
      els.map((e) => (e as HTMLElement).innerText.trim()),
    );
    const knownLabel = /sortspec-fixture-/i;
    const ours = headers.filter((h) => knownLabel.test(h));
    expect(ours.length).toBe(3);
    const expected = [...ours].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    expect(ours).toEqual(expected);
    const iAlpha = headers.findIndex((h) => /sortspec-fixture-alpha/i.test(h));
    const iZulu = headers.findIndex((h) => /sortspec-fixture-zulu/i.test(h));
    expect(iAlpha).toBeGreaterThanOrEqual(0);
    expect(iZulu).toBeGreaterThanOrEqual(0);
    expect(iAlpha).toBeLessThan(iZulu);
  } finally {
    await close();
  }
});

test('most-prompts sort mode orders sessions by messageCount descending', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'low',  cwd: 'C:/projects/promptsort', summary: 'low prompts',  messageCount: 3,  lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'high', cwd: 'C:/projects/promptsort', summary: 'high prompts', messageCount: 42, lastActivityTime: Date.now() - 5000 }),
      makeSession({ id: 'mid',  cwd: 'C:/projects/promptsort', summary: 'mid prompts',  messageCount: 12, lastActivityTime: Date.now() - 3000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'prompts-desc',
      aiGroupByRepoOrder: 'activity',
    });

    const ours = await readFixtureSummaries(window, /^(low|mid|high) prompts$/);
    expect(ours).toEqual(['high prompts', 'mid prompts', 'low prompts']);
  } finally {
    await close();
  }
});

test('clicking the Title header sorts by title asc; clicking again flips to desc', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'banana', cwd: 'C:/projects/titlesort', summary: 'banana session',    messageCount: 5, lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'apple',  cwd: 'C:/projects/titlesort', summary: 'apple session',     messageCount: 7, lastActivityTime: Date.now() - 2000 }),
      makeSession({ id: 'cherry', cwd: 'C:/projects/titlesort', summary: 'cherry session',    messageCount: 3, lastActivityTime: Date.now() - 3000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });

    await clickHeader(window, 'title');
    await reSeedFixtures(window, sessions);
    let active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'title', glyph: '↑' });

    let ours = await readFixtureSummaries(window, /^(apple|banana|cherry) session$/);
    expect(ours).toEqual(['apple session', 'banana session', 'cherry session']);

    await clickHeader(window, 'title');
    await reSeedFixtures(window, sessions);
    active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'title', glyph: '↓' });

    ours = await readFixtureSummaries(window, /^(apple|banana|cherry) session$/);
    expect(ours).toEqual(['cherry session', 'banana session', 'apple session']);
  } finally {
    await close();
  }
});

test('clicking the Activity header flips direction and shows the right glyph', async () => {
  const { window, close } = await launchTmax();
  try {
    const now = Date.now();
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'old',    cwd: 'C:/projects/actsort', summary: 'oldest actsort',  messageCount: 1, lastActivityTime: now - 60_000 }),
      makeSession({ id: 'newest', cwd: 'C:/projects/actsort', summary: 'newest actsort',  messageCount: 1, lastActivityTime: now - 1_000 }),
      makeSession({ id: 'mid',    cwd: 'C:/projects/actsort', summary: 'middle actsort',  messageCount: 1, lastActivityTime: now - 30_000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });

    // Activity is already the default column; sanity-check the header reflects it.
    let active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'activity', glyph: '↓' });
    let ours = await readFixtureSummaries(window, /actsort$/);
    expect(ours).toEqual(['newest actsort', 'middle actsort', 'oldest actsort']);

    // Click flips to asc.
    await clickHeader(window, 'activity');
    await reSeedFixtures(window, sessions);
    active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'activity', glyph: '↑' });
    ours = await readFixtureSummaries(window, /actsort$/);
    expect(ours).toEqual(['oldest actsort', 'middle actsort', 'newest actsort']);

    // Click again restores desc.
    await clickHeader(window, 'activity');
    await reSeedFixtures(window, sessions);
    active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'activity', glyph: '↓' });
    ours = await readFixtureSummaries(window, /actsort$/);
    expect(ours).toEqual(['newest actsort', 'middle actsort', 'oldest actsort']);
  } finally {
    await close();
  }
});

test('clicking the Prompts header sorts highest-count first, then flips to lowest-first', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'low',  cwd: 'C:/projects/promptflip', summary: 'low promptflip',  messageCount: 2,  lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'high', cwd: 'C:/projects/promptflip', summary: 'high promptflip', messageCount: 50, lastActivityTime: Date.now() - 2000 }),
      makeSession({ id: 'mid',  cwd: 'C:/projects/promptflip', summary: 'mid promptflip',  messageCount: 11, lastActivityTime: Date.now() - 3000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });

    await clickHeader(window, 'prompts');
    await reSeedFixtures(window, sessions);
    let active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'prompts', glyph: '↓' });
    let ours = await readFixtureSummaries(window, /promptflip$/);
    expect(ours).toEqual(['high promptflip', 'mid promptflip', 'low promptflip']);

    await clickHeader(window, 'prompts');
    await reSeedFixtures(window, sessions);
    active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'prompts', glyph: '↑' });
    ours = await readFixtureSummaries(window, /promptflip$/);
    expect(ours).toEqual(['low promptflip', 'mid promptflip', 'high promptflip']);
  } finally {
    await close();
  }
});

test('inactive column headers do not render a direction glyph', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'menu-fixture', cwd: 'C:/projects/menu-fixture', summary: 'menu fixture' }),
    ];
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });

    const glyphs = await window.$$eval(
      '.copilot-panel .ai-session-sort-header-col',
      (els) => els.map((el) => {
        const col = el.getAttribute('data-column') || '';
        const g = (el.querySelector('.ai-session-sort-header-glyph') as HTMLElement | null)?.innerText.trim() ?? '';
        return { col, g };
      }),
    );
    const map = Object.fromEntries(glyphs.map((x) => [x.col, x.g]));
    expect(map.activity).toBe('↓');
    expect(map.title).toBe('');
    expect(map.prompts).toBe('');
  } finally {
    await close();
  }
});

test('column header bar is visible in both grouped and ungrouped modes', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'menu-fixture', cwd: 'C:/projects/menu-fixture', summary: 'menu fixture' }),
    ];

    // Ungrouped.
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });
    await expect(window.locator('.copilot-panel .ai-session-sort-header')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="title"]')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="activity"]')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="prompts"]')).toBeVisible();

    // Grouped.
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'time-desc',
      aiGroupByRepoOrder: 'alpha',
    });
    await expect(window.locator('.copilot-panel .ai-session-sort-header')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="title"]')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="activity"]')).toBeVisible();
    await expect(window.locator('.copilot-panel .ai-session-sort-header-col[data-column="prompts"]')).toBeVisible();
  } finally {
    await close();
  }
});

test('the old SORT submenu is no longer in the overflow menu (grouped or ungrouped)', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'menu-fixture', cwd: 'C:/projects/menu-fixture', summary: 'menu fixture' }),
    ];

    // Ungrouped first.
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'time-desc',
    });
    await window.click('.copilot-panel button[data-tooltip="More actions"]');
    await window.waitForSelector('.copilot-panel .context-menu', { timeout: 2_000 });
    let menuText = await window.$eval(
      '.copilot-panel .context-menu',
      (el) => (el as HTMLElement).innerText,
    );
    expect(menuText).not.toContain('newest first');
    expect(menuText).not.toContain('oldest first');
    expect(menuText).not.toContain('most prompts');
    expect(menuText).not.toMatch(/^\s*sort\s*$/im);
    // Group-by and Cleanup rows are still here.
    expect(menuText).toMatch(/group by repo/i);
    expect(menuText).toMatch(/cleanup/i);
    // Close the menu.
    await window.keyboard.press('Escape').catch(() => {});
    await window.click('.copilot-panel button[data-tooltip="More actions"]').catch(() => {});

    // Grouped.
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'time-desc',
      aiGroupByRepoOrder: 'alpha',
    });
    await window.click('.copilot-panel button[data-tooltip="More actions"]');
    await window.waitForSelector('.copilot-panel .context-menu', { timeout: 2_000 });
    menuText = await window.$eval(
      '.copilot-panel .context-menu',
      (el) => (el as HTMLElement).innerText,
    );
    expect(menuText).not.toContain('newest first');
    expect(menuText).not.toContain('oldest first');
    expect(menuText).not.toContain('most prompts');
    // Group order submenu is gone too - the column header bar drives group order now.
    expect(menuText).not.toMatch(/group order/i);
    expect(menuText).not.toContain('alphabetical');
  } finally {
    await close();
  }
});

test('grouped + Prompts column orders groups by sum of messageCount', async () => {
  const { window, close } = await launchTmax();
  try {
    // Three groups; sums chosen so each sort direction yields a clear order.
    // Group A sum = 10 (3+7), Group B sum = 50 (50), Group C sum = 20 (5+15).
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'a1', cwd: 'C:/grpsort/alpha-grpsort',   summary: 'a1 grpsort', messageCount: 3,  lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'a2', cwd: 'C:/grpsort/alpha-grpsort',   summary: 'a2 grpsort', messageCount: 7,  lastActivityTime: Date.now() - 2000 }),
      makeSession({ id: 'b1', cwd: 'C:/grpsort/bravo-grpsort',   summary: 'b1 grpsort', messageCount: 50, lastActivityTime: Date.now() - 3000 }),
      makeSession({ id: 'c1', cwd: 'C:/grpsort/charlie-grpsort', summary: 'c1 grpsort', messageCount: 5,  lastActivityTime: Date.now() - 4000 }),
      makeSession({ id: 'c2', cwd: 'C:/grpsort/charlie-grpsort', summary: 'c2 grpsort', messageCount: 15, lastActivityTime: Date.now() - 5000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'prompts-desc',
    });

    const readHeaders = async () => window.$$eval(
      '.copilot-panel .ai-session-group-name',
      (els) => els.map((e) => (e as HTMLElement).innerText.trim()),
    );

    await reSeedFixtures(window, sessions);
    let headers = await readHeaders();
    let ours = headers.filter((h) => /-grpsort/i.test(h));
    // desc: bravo (50) > charlie (20) > alpha (10).
    expect(ours[0]).toMatch(/bravo-grpsort/i);
    expect(ours[1]).toMatch(/charlie-grpsort/i);
    expect(ours[2]).toMatch(/alpha-grpsort/i);

    // Flip to prompts-asc and assert reversed group order.
    await clickHeader(window, 'prompts');
    await reSeedFixtures(window, sessions);
    headers = await readHeaders();
    ours = headers.filter((h) => /-grpsort/i.test(h));
    expect(ours[0]).toMatch(/alpha-grpsort/i);
    expect(ours[1]).toMatch(/charlie-grpsort/i);
    expect(ours[2]).toMatch(/bravo-grpsort/i);
  } finally {
    await close();
  }
});

test('grouped + Title column orders groups alphabetically, flips on second click', async () => {
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'm1', cwd: 'C:/grptitle/mike-grptitle',  summary: 'm1 grptitle', messageCount: 1, lastActivityTime: Date.now() - 1000 }),
      makeSession({ id: 'a1', cwd: 'C:/grptitle/alpha-grptitle', summary: 'a1 grptitle', messageCount: 1, lastActivityTime: Date.now() - 2000 }),
      makeSession({ id: 'z1', cwd: 'C:/grptitle/zulu-grptitle',  summary: 'z1 grptitle', messageCount: 1, lastActivityTime: Date.now() - 3000 }),
    ];

    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: true,
      aiSessionListSortMode: 'title-asc',
    });

    const readHeaders = async () => window.$$eval(
      '.copilot-panel .ai-session-group-name',
      (els) => els.map((e) => (e as HTMLElement).innerText.trim()),
    );

    await reSeedFixtures(window, sessions);
    let headers = await readHeaders();
    let ours = headers.filter((h) => /-grptitle/i.test(h));
    expect(ours[0]).toMatch(/alpha-grptitle/i);
    expect(ours[1]).toMatch(/mike-grptitle/i);
    expect(ours[2]).toMatch(/zulu-grptitle/i);

    // Click flips to desc -> reversed alpha order.
    await clickHeader(window, 'title');
    await reSeedFixtures(window, sessions);
    headers = await readHeaders();
    ours = headers.filter((h) => /-grptitle/i.test(h));
    expect(ours[0]).toMatch(/zulu-grptitle/i);
    expect(ours[1]).toMatch(/mike-grptitle/i);
    expect(ours[2]).toMatch(/alpha-grptitle/i);
  } finally {
    await close();
  }
});

test('config value "activity" migrates in-memory to time-desc without rewriting config', async () => {
  // Old config key value -> the active column lights up as Activity / desc.
  // We never write the new value back unless the user clicks, so the
  // persisted config string stays exactly 'activity'.
  const { window, close } = await launchTmax();
  try {
    const sessions: CopilotSessionSummary[] = [
      makeSession({ id: 'mig-fixture', cwd: 'C:/projects/mig', summary: 'mig fixture' }),
    ];
    await seedSessionsAndOpenPanel(window, sessions, {
      aiGroupByRepo: false,
      aiSessionListSortMode: 'activity',
    });

    const active = await readActiveHeader(window);
    expect(active).toEqual({ column: 'activity', glyph: '↓' });

    // Persisted config still reads 'activity' (silent migration only).
    const persisted = await window.evaluate(() => {
      return (window as any).__terminalStore.getState().config.aiSessionListSortMode;
    });
    expect(persisted).toBe('activity');
  } finally {
    await close();
  }
});
