---
id: TASK-155
title: 'Notifications: allow excluding messages by string/regex patterns'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-16 18:15'
updated_date: '2026-05-17 08:03'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ClawPilot and similar tools sometimes emit background/automation notifications (e.g. internal status updates) that the user does not want surfaced via tmax notifications. Add a user-configurable exclude list (substring and/or regex) so matching notification bodies are suppressed. Should apply to the notification pipeline that currently surfaces external pane events (same path that handles the ClawPilot 'Here is the conversation:' wrapper stripping in TASK-151/152).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings UI exposes an 'Exclude notifications matching' list (one pattern per line)
- [x] #2 Patterns support plain substrings; lines starting and ending with / are treated as regex
- [x] #3 Notifications whose body matches any pattern are suppressed (not shown, not played sound)
- [x] #4 Exclude list persists across restarts
- [x] #5 Empty/blank lines and invalid regex are ignored gracefully without breaking notifications
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the existing TASK-156 substring deny-list to support regex entries. Rules wrapped in /slashes/ are compiled as case-insensitive regex against the rendered title+body; anything else stays a plain case-insensitive substring (TASK-156 behavior unchanged).

Changes:
- src/main/copilot-notification.ts: isExcluded() now branches on the slash-delimited shape. Malformed regex is wrapped in try/catch and ignored (per AC#5) so the user can keep typing without breaking the live notification pipeline.
- src/renderer/components/Settings.tsx: textarea hint updated to mention the /slash/ regex shortcut.
- tests/e2e/task-156-notification-exclude.spec.ts: new cases for regex match, regex non-match (control), and graceful handling of invalid regex when combined with a valid substring rule.

Persistence + live-apply paths from TASK-156 already cover AC#4 (same config field, same IPC wiring). No new config field required.
<!-- SECTION:FINAL_SUMMARY:END -->
