---
id: TASK-142
title: 'Bug: AI session auto-link contaminates a fresh sibling pane in the same cwd'
status: Done
assignee: []
created_date: '2026-05-08 16:01'
updated_date: '2026-05-08 16:01'
labels:
  - bug
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a user types an AI launcher (e.g. cc / claude / copilot) in pane A and then opens / focuses pane B in the same cwd while the AI session is still booting, the auto-linker (terminal-store updateTerminalTitleFromSession) prefers the focused pane B and attaches the AI session to it instead of pane A. The contamination shows up as: pane B's title becomes the session summary, the last-prompt bar shows the AI's prompt, and (since TASK-140) the shimmer fires on pane B when the AI session waits.\n\nFix: bias candidate selection toward panes that have firstCommandTitle=true. A pane the user has typed something in is far more likely the launcher than a fresh sibling. Focus is still the tiebreaker among those. If nothing in the eligible set has firstCommandTitle, fall back to the prior focused-pane behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Auto-link prefers panes with firstCommandTitle=true over panes without
- [x] #2 Focus stays a tiebreaker among the firstCommandTitle-true subset
- [x] #3 Original behavior preserved when no eligible pane has firstCommandTitle
- [x] #4 Ronny's #99 stale-title scenario stops happening for fresh sibling panes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Two-stage candidate selection in updateTerminalTitleFromSession (terminal-store.ts ~3479): first filter eligible panes to those with firstCommandTitle=true, then break ties on focus within that subset. Fall back to the original focused-or-first behavior when nothing in eligible has firstCommandTitle. Shipped in 44d0d9c. Likely also resolves ronny's stale 'aco' title report on issue #99.
<!-- SECTION:FINAL_SUMMARY:END -->
