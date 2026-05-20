---
id: TASK-165
title: Fix terminal freeze on RDP + add focus-thief instrumentation
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 10:32'
updated_date: '2026-05-17 10:32'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Recurring report from a dev box / RDP user: cursor blinks on the right pane, typing does nothing, no keystrokes reach the pty. Confirmed via two diag logs that the PTY is healthy (0 pty:write:no-pty events) and it's a DOM focus problem - matches the long-known focus-thief pattern.

Root cause for RDP-specific frequency: TerminalPanel.tsx handleBlur skipped the refocus attempt whenever document.hasFocus() returned false. On dev box sessions accessed over RDP, hasFocus() reports false even while the user is actively typing through the relay - so the recovery never fired and the freeze stuck.

This change: (1) softens the guard so a visible page still tries to refocus once (Voice Access / screen readers can pull focus back on the next tick - one tug is acceptable, the RDP freeze is not); (2) adds a renderer:focus-refocus-check diag event that logs document.activeElement tag/id/class plus hasFocus and visibilityState so the next freeze report identifies the actual thief instead of leaving us guessing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 handleBlur logs renderer:focus-refocus-check with hasFocus + visibilityState + active element tag/id/class snippet
- [x] #2 Refocus attempt fires when document.visibilityState is 'visible', even if document.hasFocus() returns false
- [x] #3 Refocus is still skipped when somethingElseTookFocus is true (existing thief-detection path unchanged)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Softened the blur-recovery guard in TerminalPanel.tsx handleBlur so a visible page still tries one refocus when document.hasFocus() is false (the RDP-specific case). Added renderer:focus-refocus-check diag event capturing the active element's tag/id/class along with hasFocus and visibilityState, so future freeze reports identify the actual focus thief rather than confirming only that one occurred.
<!-- SECTION:FINAL_SUMMARY:END -->
