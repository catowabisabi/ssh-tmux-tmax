---
id: TASK-157
title: Reduce idle CPU from session-watcher polling
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:03'
updated_date: '2026-05-17 14:05'
labels:
  - performance
  - ai-sessions
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Both copilot-session-watcher.ts and claude-code-session-watcher.ts run chokidar with usePolling: true, interval: 500. With many session files on disk that means tmax stat()s every matched file twice a second forever, even when the user is doing nothing. Result: ~4-6% CPU per tmax instance at idle. The polling-mode choice is deliberate (chokidar's native watcher is unreliable on Windows / WSL), but the cost scales with the user's session count, which has grown over time. Want to keep watchers reliable while cutting the idle tax.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Idle CPU of a packaged tmax with no terminals open and no AI sessions in attention state drops measurably compared to current main (target: under 1% on a quiet machine)
- [x] #2 Copilot and Claude Code session updates still propagate to the AI Sessions list when files change in real time
- [x] #3 No regression in startup boot scan time or new-session detection latency
- [x] #4 Solution documented in code comments where polling parameters live
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace usePolling: true on the full glob with a hybrid two-tier strategy in both copilot-session-watcher.ts and claude-code-session-watcher.ts:\n   - Tier A: native chokidar (usePolling: false) on the PARENT directory only, catching add/unlink/change events. Cheap; zero stat-storm at idle.\n   - Tier B: self-managed 1s mtime poll over a small 'hot' Map<filePath, lastMtime> — only files seen via tier A add/change events. Entries auto-expire when mtime has been stable past HOT_WINDOW_MS (5 min) so the hot set stays tiny on an idle machine.\n2. Tier C (existing 10s stale-check timer) augmented to re-stat loaded sessions and re-promote any whose mtime advanced. Covers the cold->hot transition when a dormant session resumes activity.\n3. WSL bypass: if basePath looks like a wsl.localhost share, fall back to the old full-glob usePolling behavior (native watching over the network share isn't reliable). Preserves wsl-session-manager.ts behavior exactly with zero changes there.\n4. Add WHY comments at each polling parameter explaining the trade-off.\n5. Verify the existing tests/e2e/issue-2-rename-watcher.spec.ts still passes (it exercises the full chain: workspace.yaml write triggers onEventsChanged).\n6. typecheck + the targeted watcher spec.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Agent work merged into main worktree (2026-05-17). Files now in src/main/copilot-session-watcher.ts and src/main/claude-code-session-watcher.ts. Three-tier architecture (native chokidar + hot-poll + stale sweep). Awaiting user verification of idle CPU drop.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cut idle CPU from ~4-6% to ~0.9% (under 2.5% peak) by replacing usePolling-on-full-glob with a three-tier strategy in copilot-session-watcher.ts and claude-code-session-watcher.ts.

Architecture:
- Tier A - native chokidar on the parent directory only (no per-file polling), catches add/unlink/change cheaply.
- Tier B - 1s mtime poll over a hot set of recently-active files, auto-expiring entries after HOT_WINDOW_MS (5m) of stability.
- Tier C - existing 10s stale-sweep keeps cold->hot transitions covered for dormant sessions that wake up.

WSL bypass keeps the old full-glob usePolling behavior for wsl.localhost shares where native watching is unreliable. WHY comments at each polling-parameter site explain the trade-offs.

Verified by user via Task Manager: tmax processes at 0.9% CPU at idle, 2.5% peak (down from 4-6%).
<!-- SECTION:FINAL_SUMMARY:END -->
