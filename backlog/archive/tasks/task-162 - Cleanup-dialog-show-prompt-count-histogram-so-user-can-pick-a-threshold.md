---
id: TASK-162
title: 'Cleanup dialog: show prompt-count histogram so user can pick a threshold'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:57'
updated_date: '2026-05-17 07:02'
labels:
  - ui
  - ai-sessions
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Cleanup low-prompt sessions dialog currently shows a single live count ('Will archive 125 sessions with fewer than 10 prompts.') but no distribution. To choose a good threshold the user has to guess and try. Add a small histogram / bucket breakdown so the user can see at a glance how many sessions have 1 prompt, 2 prompts, etc., and pick a threshold that archives the right slice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cleanup dialog shows a breakdown of session counts by prompt count for the relevant low-end buckets (e.g. 1, 2, 3, 4, 5, 6-10, 11+)
- [x] #2 Stats update live with the threshold input - the bucket(s) being archived are visually distinct from the buckets being kept
- [x] #3 Pinned and already-archived sessions are excluded from the breakdown, matching the actual archive behavior
- [x] #4 No noticeable lag on the input - if computing the breakdown is heavy, memoize across re-renders
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a compact bar-chart histogram to the Cleanup low-prompt sessions dialog so users can see the actual distribution before picking a threshold.

Changes:
- src/renderer/state/terminal-store.ts: new lowPromptHistogram(maxBucket) selector returning [count0, count1, ..., countN, overflow]. Excludes pinned and already-archived sessions to match cleanupLowPromptSessions.
- src/renderer/components/CopilotPanel.tsx: histogram rendered between the threshold input and the projected-count line. 17 buckets (0..15 + 16+). Bars below the live threshold get a danger-red color, the rest use the accent color. Counts shown above each bar, prompt-count labels below.
- Dialog widened from 340-420px to 420-500px so the histogram has breathing room.

Reactivity: histogram is computed inside the modal IIFE on every render. countLowPromptSessions already runs the same way, and the input only triggers a re-render on each keystroke; no perf regression.
<!-- SECTION:FINAL_SUMMARY:END -->
