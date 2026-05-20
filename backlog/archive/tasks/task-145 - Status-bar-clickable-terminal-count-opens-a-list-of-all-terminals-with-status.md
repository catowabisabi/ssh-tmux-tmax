---
id: TASK-145
title: 'Status bar: clickable terminal count opens a list of all terminals with status'
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-05-09 16:30'
updated_date: '2026-05-09 16:42'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The status bar shows '2 terminals (1 tiled, 1 floating)' as plain text. Make it clickable to open a popover listing every terminal in the workspace with its title, mode, and AI session status. Click a row to focus that terminal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking the terminal-count label in the status bar opens a popover
- [x] #2 Popover lists every terminal with title, mode (tiled/floating/dormant/detached), and AI session status if any
- [x] #3 Clicking a row focuses that terminal and closes the popover
- [x] #4 Popover closes on outside click and on Escape
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read StatusBar.tsx, types.ts, terminal-store.ts, and PaneActionsMenu.tsx/TabContextMenu.tsx for popover pattern.\n2. Build a TerminalListPopover component (portaled, position: fixed, anchored above the trigger button via getBoundingClientRect).\n3. Listen for Escape and outside-click to close.\n4. List terminals filtered by activeWorkspaceId (or all in flat tabMode); show title, mode pill, AI status dot via copilotSessions/claudeCodeSessions.\n5. Replace the text span in StatusBar with a clickable button; toggle popover open state.\n6. Add CSS classes near .status-mode-btn in global.css.\n7. Run npx tsc --noEmit to verify no NEW type errors.\n8. Check ACs and commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added portaled TerminalListPopover in StatusBar.tsx (mirrors TabContextMenu/dormant-popover pattern: createPortal to document.body, position: fixed anchored above the trigger button via getBoundingClientRect of e.currentTarget).
- Replaced the plain count <span> with a status-mode-btn that toggles the popover.
- Listens for Escape (capture phase, beats xterm.js) and document mousedown outside the popover to close.
- Workspace-aware: in flat tabMode lists every terminal; in workspaces mode lists only the active workspace, matching the existing totalCount semantics.
- Each row shows truncated title, mode pill (tiled/floating/dormant/detached - color-coded), and AI status from copilotSessions/claudeCodeSessions if linked.
- Status dot colors: green=waitingForUser, yellow=awaitingApproval, blue=thinking|executingTool, grey=idle. Status label rendered next to the dot.
- Click row → useTerminalStore.getState().setFocus(id) and close.
- Added matching CSS classes in global.css next to the existing dormant-popover block.
- npx tsc --noEmit: 30 errors before vs 30 after my change (all pre-existing, none in StatusBar.tsx). No new type errors introduced.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Made the status-bar terminal count clickable; opens a popover listing every terminal in scope with mode + AI status.

Changes:
- src/renderer/components/StatusBar.tsx: replaced the plain "N terminals (...)" span with a status-mode-btn that toggles a new portaled TerminalListPopover. Popover is workspace-aware (matches the existing totalCount filter: flat tab mode shows all, workspaces mode shows only the active workspace). Each row shows truncated title, mode pill (tiled/floating/dormant/detached), and AI status pulled from copilotSessions/claudeCodeSessions when the pane has an aiSessionId. Click a row → setFocus(id) + close. Closes on outside click and on Escape (capture phase, same trick TabContextMenu uses to beat xterm.js).
- src/renderer/styles/global.css: added .terminal-list-popover/-header/-empty/-item/-title/-mode/-ai/-ai-dot classes near the existing .dormant-popover block. Mode pills are color-coded; status dot is green=waitingForUser, yellow=awaitingApproval, blue=thinking|executingTool, grey=idle.

Cross-platform: pure DOM/CSS additions; no platform-conditional code.

Tests:
- npx tsc --noEmit: 30 pre-existing errors before and after (all unrelated to StatusBar.tsx). No new type errors from this change.
<!-- SECTION:FINAL_SUMMARY:END -->
