---
id: TASK-164
title: Cross-session notification dedup for ClawPilot wrapped pairs
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 09:19'
updated_date: '2026-05-17 09:23'
labels:
  - notifications
  - bug
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ClawPilot sometimes spawns two distinct sessions per user turn (e.g. a Claude Code SDK session + a parallel Copilot session for context tooling). Each session has its own ID, so the per-session FLICKER_COOLDOWN_MS gate in copilot-notification.ts doesn't catch them. Result: the user gets two OS toasts for one logical interaction, one labeled ClawPilot and one labeled Copilot. Add a short content-based dedup window keyed on the rendered body so the second toast within ~8 seconds with the same body is suppressed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Two notifications with identical bodies fired within 8s from different session IDs result in only the first being shown
- [x] #2 Notifications with different bodies (real distinct events) within 8s both fire
- [x] #3 Same-session repeat notifications continue to be handled by the existing flicker cooldown
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added cross-session body dedup in src/main/copilot-notification.ts. When two notifications fire within 8s with the same normalized body (trim + lowercase + collapse whitespace, first 160 chars), only the first is shown. Suppresses the ClawPilot+Copilot toast pair without affecting unrelated distinct events.

Key: bodyDedupKey() returns a stable normalized prefix; recentBodyKeys is a sliding window with TTL = DEDUP_WINDOW_MS (8000ms). The window is cleared by clearNotificationCooldowns() so E2E tests stay deterministic.

E2E spec at tests/e2e/task-164-cross-session-body-dedup.spec.ts covers:
- identical body across two different session IDs -> only first fires
- different bodies across two sessions -> both fire
- same-session repeat is still suppressed (via the pre-existing per-session cooldown, plus the new body layer as a backstop)

The dedup only suppresses the visual toast; the cooldown / lastStatus state for each session is still updated normally so future legitimate notifications for that session fire as expected.
<!-- SECTION:FINAL_SUMMARY:END -->
