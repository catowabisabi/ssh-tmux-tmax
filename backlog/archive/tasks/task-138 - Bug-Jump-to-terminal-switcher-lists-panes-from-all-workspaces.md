---
id: TASK-138
title: 'Bug: Jump to terminal switcher lists panes from all workspaces'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-08 08:21'
updated_date: '2026-05-08 08:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Ctrl+P switcher (TerminalSwitcher.tsx) iterated the global terminals map without filtering by workspace, so users in 'workspaces' tab mode saw extra entries belonging to other workspaces with no visual cue. Confusing because cross-workspace entries looked identical to current-workspace ones (only floating got a tag). Filter to current workspace using the same pattern used elsewhere in the store: (t.workspaceId ?? activeWorkspaceId) === activeWorkspaceId.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Switcher only lists terminals belonging to the active workspace
- [x] #2 Floating panel entries from the active workspace still appear with the FLOATING tag
- [x] #3 Flat tabMode users see no behavior change (everything is in the default workspace)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Filter switcher entries by activeWorkspaceId in TerminalSwitcher.tsx using the (t.workspaceId ?? activeWorkspaceId) === activeWorkspaceId pattern that the rest of the store already uses. No behavior change in flat tabMode since every terminal sits in the default workspace.
<!-- SECTION:FINAL_SUMMARY:END -->
