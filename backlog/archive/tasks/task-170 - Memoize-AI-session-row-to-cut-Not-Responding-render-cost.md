---
id: TASK-170
title: Memoize AI session row to cut Not-Responding render cost
status: To Do
assignee: []
created_date: '2026-05-13 19:03'
updated_date: '2026-05-13 19:03'
labels: []
dependencies: []
references:
  - src/renderer/components/CopilotPanel.tsx
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-162 audit. CopilotPanel renders ~1500 session rows inline via .map; every store update causes the parent filtered array to re-allocate (via { ...s } spreads), so every row's JSX re-creates and every row reconciles. Under heavy AI activity (multiple sessions updating per second) this is the dominant render cost in the renderer.\n\nFix: extract the row body (lines ~1087-1248 in CopilotPanel.tsx) into a standalone <AiSessionRow session={s} index={i} selected isPaneActive flashed ...> component wrapped in React.memo. Use stable identity for session prop (skip the { ...s } spreads where the row isn't overridden), so unchanged rows return null-render-diff and skip work.\n\nLarge surface (200+ lines moved) so out-of-scope while the mouse-wheel + cross-window agents are touching adjacent files. File now for clean follow-up after they merge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AI session row body lives in a standalone React.memo'd component
- [ ] #2 Filtered array no longer spread-clones unchanged session entries (preserves identity for memo equality)
- [ ] #3 Under heavy AI activity (≥5 updates/sec across ≥3 sessions), renderer main thread no longer blocks long enough for Windows to mark the window Not Responding
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13 partial: shipped the cheap half of this task - filtered() now only spreads when an entry actually needs transformation (missing provider OR has a summary override), so unchanged sessions keep identity through filtering. Cuts allocation count from ~3000 (2 spreads × 1500) to ~0 in the common case where most sessions have a provider and no override.

Still outstanding from the full memoization plan: extracting the 200-line row body into <AiSessionRow> wrapped in React.memo. That part is where the largest win lives (skipping JSX creation entirely for unchanged rows). Holding off until the running agents land so the refactor doesn't collide with their changes.
<!-- SECTION:NOTES:END -->
