---
id: TASK-164
title: AI Sessions sort menu - radio rows + 'most prompts' sort
status: Done
assignee: []
created_date: '2026-05-17 10:22'
updated_date: '2026-05-17 10:22'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Sort and Group order rows in the AI Sessions overflow menu were cycle-buttons that hid the current mode behind a label ("Sort: by activity" - is that the state or the action?). Users could not tell at a glance which sort was active, and clicking the row cycled them to a different mode instead of confirming the current one. Compounding this, the 'Group by repo' checkbox stayed lit when sorting by time even though the list silently un-grouped, lying about what the user was looking at. Also adds a 'most prompts' sort for ranking sessions by messageCount.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sort menu shows the current mode with a checkmark, and clicking a row sets that mode directly (no cycling)
- [x] #2 Group order menu shows alphabetical / by activity as radio rows when grouping is on
- [x] #3 Switching sort to time-newest, time-oldest, or most prompts clears the Group by repo checkbox automatically so the ✓ matches the rendered flat list
- [x] #4 New sort mode 'most prompts' ranks sessions by messageCount descending, tie-broken by recency
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced cycle-button rows for Sort and Group order with radio-style rows in CopilotPanel.tsx. Active mode wears the same ✓ glyph used by Group by repo and Show running only, so all menu items share a consistent state-indicator. Added 'most prompts' as a fourth sort mode (sorts by messageCount desc, tie-broken by recency). When the user picks a non-activity sort, Group by repo auto-clears to match the rendered flat list - mirrors the existing inverse logic where re-enabling Group by repo while in time sort auto-flips sort back to activity.
<!-- SECTION:FINAL_SUMMARY:END -->
