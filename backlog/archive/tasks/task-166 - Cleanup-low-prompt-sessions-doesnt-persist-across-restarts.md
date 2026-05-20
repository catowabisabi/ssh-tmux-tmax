---
id: TASK-166
title: Cleanup low-prompt sessions doesn't persist across restarts
status: To Do
assignee: []
created_date: '2026-05-17 10:32'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User report: after running Cleanup sessions to archive low-prompt sessions, the archived state doesn't stick. Sessions reappear in the Active list on restart or refresh.

cleanupLowPromptSessions writes to sessionLifecycleOverrides and calls saveSession - looks correct on the surface. Suspect path: the SESSION_FILE_CHANGED watcher at terminal-store.ts:3083 (the cross-window sync) may race with the in-memory write and patch the cleanup'd overrides back to their stale on-disk version if saveSession hasn't completed yet. Needs verification.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 After running Cleanup sessions with threshold N, the archived sessions still appear in Archived (not Active) after a tmax restart
- [ ] #2 Reproduction includes a Playwright spec covering the cleanup -> restart -> check-archive flow
- [ ] #3 Root cause documented in code comment so the next reader understands the race
<!-- AC:END -->
