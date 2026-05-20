---
id: TASK-169
title: 'Fix Report-an-issue: Open GitHub did nothing after diag-log auto-attach landed'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 11:08'
updated_date: '2026-05-13 19:14'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Regression introduced by TASK-164. The auto-attach embedded the 25 KB diag log in the URL query string; GitHub's new-issue URL caps at ~8 KB on most browsers, so window.open silently failed.\n\nFix: keep the URL lean (template only) and put the diag-rich version on the clipboard. User pastes after the page opens. Modal text updated to explain the clipboard step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Clicking Open GitHub from the Report modal opens the new-issue page
- [x] #2 The clipboard contains the prefilled template AND the diag-log tail (so the reporter can paste a fuller body)
- [x] #3 Modal text mentions the clipboard step so users know to paste
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13 follow-up: clipboard-only landed but users don't realize they need to paste, so the issue page looked "empty" to them. Switched to a hybrid:
- URL body now carries a short ~5 KB tail of the diag log (most-recent slice) so it appears inline immediately.
- Clipboard still carries the full ~25 KB version for users who want to attach more context.
- Modal copy not updated again - mentions both surfaces are populated.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
StatusBar.tsx submitReport now builds two bodies - a lean urlBody (template only) for window.open and a clipboardBody (template + diag <details>) for the clipboard. Modal copy refreshed to mention pasting from clipboard.
<!-- SECTION:FINAL_SUMMARY:END -->
