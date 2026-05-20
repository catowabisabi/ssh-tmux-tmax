---
id: TASK-157
title: AI Sessions - default to flat time-sorted list (no repo grouping)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-12 10:14'
updated_date: '2026-05-13 10:11'
labels: []
dependencies: []
references:
  - src/main/config-store.ts
  - src/renderer/components/CopilotPanel.tsx
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User feedback: the default repo-grouped view adds visual noise for users who think in terms of 'most recent session' rather than 'session in repo X'. Switch the default aiSessionListSortMode from 'activity' (which groups by repo) to 'time-desc' (flat list, newest first). Users who prefer grouping can still switch via the sort menu. Existing configs keep their saved preference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Default aiSessionListSortMode is 'time-desc' for new installs
- [x] #2 Existing configs that have an explicit value are NOT overridden
- [x] #3 AI Sessions panel renders a flat list ordered by lastActivityTime descending by default
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CopilotPanel.tsx:261 fallback changed from 'activity' to 'time-desc'. The config field stays optional - new installs and users who never explicitly picked a sort mode now land on the flat time-sorted view; users with a saved value keep theirs.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Changed the default aiSessionListSortMode fallback in CopilotPanel.tsx from 'activity' (repo-grouped, activity order) to 'time-desc' (flat list, newest first).

Impact:
- New installs: AI Sessions panel opens in flat time-sorted mode.
- Existing users without an explicit pref: same.
- Existing users with a saved value: untouched (the early-return on valid values is unchanged).

No config migration needed since the field is optional and the fallback only applies when undefined.
<!-- SECTION:FINAL_SUMMARY:END -->
