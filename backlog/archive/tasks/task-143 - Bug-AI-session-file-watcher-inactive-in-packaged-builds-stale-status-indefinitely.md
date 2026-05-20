---
id: TASK-143
title: >-
  Bug: AI session file watcher inactive in packaged builds, stale status
  indefinitely
status: Done
assignee:
  - '@claude'
created_date: '2026-05-08 17:21'
updated_date: '2026-05-08 17:26'
labels:
  - bug
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In packaged tmax (after tmax-swap), the Claude Code (and likely Copilot) session-state file watchers don't fire after launch. claudeCodeSessions in the store never updates lastActivityTime / status, so any feature downstream of session status is broken: TASK-140 shimmer never triggers, last-prompt bars stay stale, lifecycle auto-archive can over-fire on sessions that look idle but aren't.\n\nDev (npm start) works correctly - shimmer fires, status flips to waitingForUser as Claude finishes turns, lastActivityTime stays within seconds of now while a session is active. Packaged: same code path, freshest session shows ageS in the thousands.\n\nReproducer: tmax-swap, launch packaged tmax, run Claude Code, ask any question, wait for the response. Run in DevTools:\n  JSON.stringify(__terminalStore.getState().claudeCodeSessions.map(s=>({id:s.id.slice(0,8),ageS:Math.round((Date.now()-s.lastActivityTime)/1000)})).sort((a,b)=>a.ageS-b.ageS).slice(0,3),null,2)\nFreshest ageS will be hundreds-to-thousands of seconds.\n\nLikely areas to investigate:\n- claude-code-session-watcher.ts: chokidar watch path / glob differences when running from packaged Electron (cwd, sandbox, asar).\n- copilot-session-watcher.ts: same.\n- main.ts watcher initialization order in packaged build.\n- IPC bridge: maybe events fire in main but never reach the renderer due to a binding lost in the packaged build.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Identify why chokidar / file watcher fires in dev but not in packaged
- [x] #2 Fix the watcher so packaged tmax sees session updates within seconds of JSONL writes
- [x] #3 TASK-140 shimmer fires in packaged tmax once session status correctly transitions
- [x] #4 Last-prompt bar updates live in packaged tmax during an active session
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Three combined fixes in ab3099b: (1) replaced dynamic await import('chokidar') with a static import in both watcher files - dynamic import inside Vite-built main with chokidar external can resolve unpredictably in packaged bundles; (2) start() is now idempotent + logs ready/error events so any failure surfaces in main-process logs instead of being silent; (3) watchers auto-start at the end of setup* functions in main, so the watcher no longer depends on the renderer's startWatching IPC firing successfully on mount. IPC handlers now also wrap start() with explicit error logging.
<!-- SECTION:FINAL_SUMMARY:END -->
