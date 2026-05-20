---
id: TASK-168
title: >-
  Open-from-AI-list pane should inherit auto-color (matches user's existing
  palette)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 11:07'
updated_date: '2026-05-13 11:07'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the user clicks a session in the AI Sessions panel and tmax opens a new pane to host it, the pane drops in with the default theme background instead of one of the auto-color palette tints. Running Colorize Again afterwards fixes it - so the auto-color logic works, openAiSession just wasn't running it.\n\nFix: replicate the createTerminal least-used-color pick in openAiSession + the new createAiSessionInCwd action (TASK-159). Gated on autoColorTabs so users who explicitly turned colors off don't get them back.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Opening a session via double-click / row click in the AI Sessions panel produces a pane with a tabColor matching the auto-color palette when autoColorTabs is on
- [x] #2 Same for the new + button on group headers (TASK-159)
- [x] #3 Users with autoColorTabs off get the default no-color pane (no regression)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shipped this session.

openAiSession (terminal-store.ts) and createAiSessionInCwd (the TASK-159 action) now run the same least-used-color pick that createTerminal uses, scoped to the active workspace. The new pane drops in pre-colored when autoColorTabs is on.
<!-- SECTION:FINAL_SUMMARY:END -->
