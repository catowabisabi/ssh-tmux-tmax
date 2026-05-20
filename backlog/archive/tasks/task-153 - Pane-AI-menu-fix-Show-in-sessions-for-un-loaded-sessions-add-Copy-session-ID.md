---
id: TASK-153
title: >-
  Pane AI menu - fix Show-in-sessions for un-loaded sessions, add Copy session
  ID
status: Done
assignee:
  - '@claude'
created_date: '2026-05-12 09:32'
updated_date: '2026-05-13 10:11'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two issues in the pane right-click "AI session" cluster:\n\n1. "Show in AI sessions" silently did nothing when the pane's aiSessionId wasn't in the loaded slice (aiSessionLoadLimit defaults to 314; users with hundreds of sessions had most panes' sessions outside that slice). CopilotPanel's highlight effect bails at terminal-store.ts:478 because the lookup [...copilotSessions, ...claudeCodeSessions].find(id) returns undefined.\n\n2. No way to grab a session ID for sharing / debugging / referencing in another tool.\n\nFix: showAiSessionsForPane now async; opens the panel + sets focus immediately, then fetches the missing session by id via getCopilotSession / getClaudeCodeSession IPC and prepends it to the local list (bumping highlight request so the panel re-runs). Added a sibling 'Copy session ID' menu item that copies aiSessionId via terminalAPI.clipboardWrite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 "Show in AI sessions" highlights the right row even when the session is outside the initially loaded slice
- [x] #2 Pane menu has a 'Copy session ID' item that copies the aiSessionId to the clipboard
- [x] #3 Both items only render when the pane has an aiSessionId / aiProvider
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Two pane-menu fixes shipped together.

What changed:
- terminal-store.ts showAiSessionsForPane: now async. Opens the panel + focuses the pane synchronously (UI responds immediately), then if the pane's aiSessionId isn't in the loaded slice it calls getCopilotSession / getClaudeCodeSession IPC, prepends the result to copilotSessions / claudeCodeSessions, and bumps aiSessionHighlightRequest so CopilotPanel's highlight effect can find the row.
- TerminalPanel.tsx pane menu: added '📋 Copy session ID' item next to '✨ Show in AI sessions'. Uses terminalAPI.clipboardWrite(aiSessionId). Gated on aiSessionId truthiness, same as the surrounding AI cluster.

Why it matters:
- Default aiSessionLoadLimit is 314. Power users have 1500+ sessions on disk, so ~80% of panes' sessions sat outside the local list. 'Show in AI sessions' silently bailed and the menu looked broken.
- 'Copy session ID' is the lightweight escape hatch for debugging / referencing a session in another tool (CLI, file path).

Tests:
- Not yet covered by Playwright. Should add a regression spec that opens the panel via the action with a session-id that's NOT in the prefetched list and asserts the highlight lands. Filing as follow-up.
<!-- SECTION:FINAL_SUMMARY:END -->
