---
id: TASK-167
title: Fix notification flood on tmax launch (TASK-157 regression)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 11:02'
updated_date: '2026-05-17 11:02'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report: opening tmax suddenly fires a wave of 'Claude Code - Session Ready' / 'Copilot - Waiting for Input' notifications for sessions from previous days that haven't actually changed. Toasts even surfaced the textual body of unrelated worktree agent sessions.

Regression introduced by TASK-157's hybrid two-tier watcher. sweepKnownFilesForReactivation (claude-code-session-watcher.ts) and sweepLoadedSessionsForReactivation (copilot-session-watcher.ts) treat every known file whose mtime falls inside HOT_WINDOW_MS but isn't already in hotFiles as a fresh cold-to-hot transition and fire onFileChanged / onEventsChanged. At startup hotFiles is empty by construction, so every session touched in the past 5 minutes triggers a parse, the parser publishes onSessionUpdated, and notifyCopilotSession fires its toast because lastStatus has no prior entry to dedupe against.

Fix: seed hotFiles with each known file's current mtime when it's already inside the window, during the boot-time seedKnownFiles*FromDisk pass. First sweep then sees known !== undefined for those files and only fires when mtime actually advances. Genuine reactivations (file dormant past cutoff, then resumes) still register correctly because the file falls out of hotFiles while dormant and re-enters via the same path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launching tmax with several recently active Claude Code sessions on disk fires zero OS notifications on boot
- [x] #2 A session that is genuinely modified after tmax startup still fires the Session Ready / Waiting for Input notification as before
- [x] #3 Both ClaudeCodeSessionWatcher.seedKnownFilesFromDisk and CopilotSessionWatcher.seedKnownSessionsFromDisk populate hotFiles with current mtime for files inside the HOT_WINDOW_MS cutoff
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stopped the boot-time notification flood that surfaced 'Claude Code - Session Ready' / 'Copilot - Waiting for Input' toasts for sessions from previous days.

Root cause: TASK-157's hybrid watcher seeded knownSessions / knownFiles from disk at boot but left hotFiles empty. The 10s tier-C sweep then encountered every recent-mtime session as a cold-to-hot transition, called onFileChanged for each, and the downstream notifier fired because lastStatus had no prior entry to dedupe against.

Fix: extended seedKnownFilesFromDisk (ClaudeCodeSessionWatcher) and seedKnownSessionsFromDisk (CopilotSessionWatcher) to also write the current mtime into hotFiles for any file inside HOT_WINDOW_MS at boot. The first sweep then sees known !== undefined and stays silent. Genuine reactivations (file dormant past cutoff then resumes) still register correctly because dormancy drops the entry from hotFiles and the resume re-enters via the same path.
<!-- SECTION:FINAL_SUMMARY:END -->
