---
id: TASK-162
title: 'Bug: archived sessions reappear as Active after restart'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 07:34'
updated_date: '2026-05-17 07:37'
labels:
  - bug
  - ai-sessions
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User cleans up low-prompt sessions via the cleanup dialog. The Archived count jumps up (e.g. 411) and Active drops (e.g. 51). After restarting tmax, Active is back at 140 and Archived is at 322 - ~89 sessions returned to Active. Some show a toast '<name> moved back to Active'. Underlying state lives in sessionLifecycleOverrides on tmax-session.json. Most likely: the updateCopilotSession auto-reactivation path at terminal-store.ts:4172-4183 is firing for sessions whose lifecycle was set to 'old' if they get re-linked to a terminal during session restore, OR the save isn't persisting the new overrides cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After cleanup + restart, the Archived/Active counts stay where the user left them
- [x] #2 No spurious 'moved back to Active' toasts on startup for sessions the user just archived
- [x] #3 Linked-terminal auto-reactivate path still works for sessions the user is actively using (don't break the legitimate case)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bug: auto-reactivation path in updateCopilotSession / updateClaudeCodeSession used `session.status !== 'idle'` as a "new activity" signal. After restart, the session file watcher reloads any session that was mid-turn at shutdown in its non-idle state (thinking / waitingForUser); the first watcher update tick then satisfies `status !== 'idle'`, triggers `hasNewActivity = true`, and bumps just-archived sessions with a linked terminal back to Active - producing the "<name> moved back to Active" toast spam and the count-discrepancy.

Fix: drop the status check from both updateCopilotSession (line ~4176) and updateClaudeCodeSession (line ~4255). Only a strict messageCount increase counts as real new activity - that's the only signal that a genuine new turn arrived since tmax last knew about the session.

Does NOT break the legitimate reactivation case: when a user is actively talking to a linked session, every new turn increments messageCount and re-activates it as before.
<!-- SECTION:FINAL_SUMMARY:END -->
