---
id: TASK-171
title: Fix - Group by repo toggle is a no-op when sort mode is time-based
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 19:19'
updated_date: '2026-05-13 19:19'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Regression introduced by TASK-157 (default sort changed to time-desc). Group headers in the AI Sessions panel only render when groupByRepo && sortMode === activity. When sortMode is time-desc/time-asc, toggling Group by repo flips the config flag but the list stays flat - visually nothing happens.\n\nFix: toggleGroupByRepo now also switches sortMode back to 'activity' when turning grouping ON if the current sort is a time-based flat sort. Turning grouping OFF leaves the sort mode alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking 'Group by repo' from a time-sorted (flat) view renders group headers
- [x] #2 Existing behavior preserved when sort is already 'activity'
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
toggleGroupByRepo now patches both aiGroupByRepo and aiSessionListSortMode when needed. If the user enables grouping while sort is time-desc/time-asc, sort gets bumped back to activity so the group headers actually render. No change for the disable path or when sort is already activity.
<!-- SECTION:FINAL_SUMMARY:END -->
