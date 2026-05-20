---
id: TASK-151
title: >-
  Fix AI session name, notification source, ClawPilot detection, remove
  redundant toast
status: Done
assignee:
  - '@claude'
created_date: '2026-05-16 16:37'
updated_date: '2026-05-16 16:40'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bundle of 4 issues the user hit while testing PR #106:
1. AI sidebar shows cwd basename ("projects") instead of the first-prompt summary for fresh sessions, because parseWorkspace derives workspace.name from repository which then defeats loadSession's `workspace.name === id` guard on the first-prompt fallback.
2. OS notification body falls back to repository/branch ("InbarR/Backlog-HQ (MyMain)") for the same reason - session.summary is empty.
3. ClawPilot continuation turns drop the `[Clawpilot context:]` marker (and latestPrompt is truncated to 120 chars), so detectSessionHost returns null and the notification surfaces as plain "Copilot - Waiting for Input" with the Copilot icon.
4. The in-app toast on attention-state transition duplicates the OS notification fired from main.

Fix: loosen loadSession's first-prompt fallback; add /clawpilot/ cwd segment as a secondary ClawPilot fingerprint; delete maybeNotify from App.tsx.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 loadSession populates summary from first prompt whenever workspace.yaml has no `summary:` field (regardless of derived name)
- [x] #2 detectSessionHost returns 'clawpilot' for cwd containing a /clawpilot/ folder segment, even when summary/latestPrompt lack the marker
- [x] #3 maybeNotify is removed; no in-app toast fires on AI status transitions
- [x] #4 Notification title for a ClawPilot cwd session reads 'ClawPilot - ...' not 'Copilot - ...'
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Drop `workspace.name === id` guard from loadSession's first-prompt fallback (copilot-session-monitor.ts:436)\n2. Extend detectSessionHost to also pick up /clawpilot/ cwd segment (copilot-types.ts) - add cwd to the Pick<>\n3. Delete maybeNotify + the prevStatus map from App.tsx; keep the rest of the session-update subscriptions intact\n4. Add tests/e2e/clawpilot-cwd-detection.spec.ts covering the new fingerprint path and a control session\n5. Typecheck (no new errors expected in touched files)
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Three small related fixes the user hit while testing PR #106 locally:

- loadSession's first-prompt fallback was gated on `workspace.name === id`, but parseWorkspace derives the name from repository/cwd for every fresh session, so the fallback never fired. Sidebar showed shortPath(cwd) ("projects") and the notification body showed "<repo> (<branch>)" even when a prompt was already on disk. Drop the gate.
- detectSessionHost only matched the literal `[Clawpilot context:]` marker, which ClawPilot continuation turns drop (and which gets sliced out of the 120-char latestPrompt copy). Add /clawpilot/ cwd folder segment as a secondary fingerprint so the toast picks up the lobster icon + 'ClawPilot - Waiting for Input' title.
- Drop the in-app toast (maybeNotify in App.tsx) that fires on AI status transitions. The OS notification from copilot-notification.ts fires on the same edge, so the toast was duplicate noise.

Shipped in ce6ba1c. Follow-ups: TASK-152 (strip ClawPilot 'Here is the conversation:' wrapper from notification body), TASK-153 (e2e coverage for the loadSession fallback - test file requires a real session-state fixture and was deferred from this PR).
<!-- SECTION:FINAL_SUMMARY:END -->
