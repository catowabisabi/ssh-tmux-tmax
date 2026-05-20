---
id: TASK-164
title: Auto-attach diagnostics log tail to Report-an-issue submissions
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 10:21'
updated_date: '2026-05-13 10:23'
labels: []
dependencies: []
references:
  - src/renderer/components/StatusBar.tsx
  - src/main/main.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today the 'Report an issue' flow (status bar overflow → Report an issue) opens a GitHub new-issue page with a prefilled template (version, platform, blank repro template). Users almost never paste the diag log, so we end up asking for it as a follow-up - delays triage.\n\nFix: automatically embed the diagnostic log tail in the issue body as a collapsed <details><summary>Diagnostic log (last N lines)</summary>...</details> block. Cap the embed at ~25 KB so the total stays well under GitHub's 64KB issue-body limit. The user still sees the modal and can choose to cancel before publishing.\n\nPrivacy: diag logs include local paths, AI prompts, PIDs. The user can see the full content (it's in the issue body before they click Submit on GitHub) and edit/remove sensitive lines manually. If we want stronger privacy guards later, add a preview pane in the report modal or a redaction pass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Report-an-issue flow auto-attaches the diagnostic log tail (last ~25 KB) inside a collapsed <details> block in the issue body
- [x] #2 Total body stays under GitHub's 64KB cap even when the diag log is huge (tail truncation, not full)
- [x] #3 If the diag log file is missing or unreadable, the report still goes through without the attachment (no error to the user)
- [x] #4 Modal preflight text mentions that the diag log will be attached, so users aren't surprised
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Auto-attached the diagnostic log tail to the Report-an-issue flow so triage doesn't stall on missing context.

Changes:
- diag-logger.ts: new readDiagLogTail(maxBytes=25KB) - flushes the in-memory buffer first, opens the log read-only, reads the trailing window, drops the partial first line if we sliced mid-entry.
- ipc-channels.ts + main.ts + preload.ts: new DIAG_READ_TAIL channel + handler + terminalAPI.readDiagLogTail() wrapper.
- StatusBar.tsx submitReport(): now async; appends a collapsed <details><summary>Diagnostic log (last ~25 KB)</summary>...</details> block to the prefilled template before opening GitHub. Silent fallback to template-only if the log is missing or unreadable.
- Modal text updated to flag the auto-attach so users can review and trim before submitting.

Files touched: src/main/diag-logger.ts, src/shared/ipc-channels.ts, src/main/main.ts, src/preload/preload.ts, src/renderer/components/StatusBar.tsx.
<!-- SECTION:FINAL_SUMMARY:END -->
