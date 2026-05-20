---
id: TASK-156
title: Feature - Refresh pane action (Ctrl+Alt+R)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-12 10:14'
updated_date: '2026-05-13 10:38'
labels: []
dependencies: []
references:
  - src/renderer/state/terminal-store.ts
  - src/renderer/components/TerminalPanel.tsx
  - src/renderer/hooks/useKeybindings.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #101. Workaround for the input-freeze symptom (related to GH #70 family) where a pane stops accepting input after the AI session asks for confirmation. A soft refresh that re-attaches xterm, redraws, and re-focuses gives users an escape hatch without killing the underlying PTY. We're shipping the escape hatch first; the root-cause investigation continues separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New 'Refresh pane' action available via Ctrl+Alt+R, pane right-click menu, and Command Palette
- [x] #2 Refresh re-attaches the xterm instance, redraws, and re-focuses the pane WITHOUT killing the PTY (no process restart)
- [x] #3 After refresh, typing reaches the PTY in cases where it was previously stuck on the renderer side
- [x] #4 Playwright test exercises the action on a normal pane and confirms it doesn't disrupt the PTY (e.g. shell prompt still alive)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented soft Refresh-pane in main this session.

Approach:
- terminal-store.ts: new refreshGenerations: Record<TerminalId, number> state + refreshTerminal(id) action that bumps the per-pane counter.
- TilingLayout.tsx: thin RefreshableTerminalPanel wrapper subscribes to refreshGenerations[id] and renders <TerminalPanel key={`${id}-${gen}`} ...>. Bumping the counter changes the key, React unmounts + remounts the entire pane, fresh xterm instance.
- FloatingPanel.tsx: same key idiom for the floating render path.
- useKeybindings.ts: new Ctrl+Alt+R default binding + refreshPane action that calls store.refreshTerminal(focusedId). (Ctrl+Shift+R was already rename, so Alt instead of Shift.)
- CommandPalette.tsx: "Refresh Pane" entry next to Rename Terminal, same shortcut surfaced.
- TerminalPanel.tsx pane menu: 🔄 Refresh pane row next to ✏️ Rename pane.
- tests/e2e/refresh-pane.spec.ts: regression spec from the abandoned worktree, covers all three trigger paths (keybinding / palette / pane menu) and asserts (a) refreshGeneration bumps, (b) PID unchanged across the remount, (c) typing reaches the PTY afterwards.

PTY lives in main, so the remount only affects the renderer side - the shell process / scrollback / AI session state is fully preserved. Soft escape hatch for the input-freeze symptoms tracked under TASK-162 (the deeper root-cause investigation continues there).
<!-- SECTION:FINAL_SUMMARY:END -->
