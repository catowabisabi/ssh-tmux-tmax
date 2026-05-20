---
id: TASK-159
title: Append (DEV) to notification title in dev builds
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:14'
updated_date: '2026-05-17 06:16'
labels:
  - notifications
  - settings
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the user runs both a dev tmax (npm start) and a packaged tmax simultaneously, OS toasts from both look identical, making it impossible to tell which instance fired the notification. Append " (DEV)" to AI session notification titles when running under electron-forge start (app.isPackaged === false). No-op in packaged builds. No setting needed - this is purely a developer-experience hint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When running unpackaged (npm start), AI session notification titles end with ' (DEV)'
- [x] #2 When running a packaged build, titles are unchanged from current main
- [x] #3 No new config field or Settings UI added
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Append " (DEV)" to AI session notification titles when running an unpackaged tmax (electron-forge start). Lets users running both a dev build and a packaged build at once tell the toasts apart at a glance.

Changes:
- src/main/copilot-notification.ts: compute DEV_TITLE_SUFFIX at module load from app.isPackaged (empty string in packaged builds, " (DEV)" otherwise) and append it to the rendered title.

Scope:
- Only AI session toasts (the high-frequency ones). Update-checker notifications are 1/hour and unchanged.
- No config field, no Settings UI - this is a free dev-only marker.
<!-- SECTION:FINAL_SUMMARY:END -->
