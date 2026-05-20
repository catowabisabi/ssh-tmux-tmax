---
id: TASK-152
title: 'ClawPilot notification body: strip ''Here is the conversation:'' wrapper'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-16 16:37'
updated_date: '2026-05-17 08:02'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-151. ClawPilot's continuation turns prepend a 'Here is the conversation:\nuser: ...\nassistant: ...' wrapper to every prompt. stripClawpilotContext currently only removes the trailing '[Clawpilot context: ...]' marker, so once a continuation-turn notification reaches the user, line 1 / line 2 of the body still start with 'Here is the conversation: user: ...' which buries the actual prompt.

For the next ClawPilot notification turn, extract the most recent 'user:' segment (or strip the leading conversation history) so the body shows just the new prompt.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 stripClawpilotContext (or a sibling helper) strips the 'Here is the conversation:' wrapper template
- [x] #2 Notification body for a ClawPilot continuation turn shows the latest user prompt, not the wrapper preamble
- [x] #3 Test fixture for a continuation-turn payload asserts the cleaned body
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
stripClawpilotContext now strips BOTH the trailing "[clawpilot context: ...]" marker AND the leading "Here is the conversation:
user:.../assistant:..." continuation-turn wrapper, extracting the LATEST user prompt. Implemented in src/shared/copilot-types.ts; consumed by buildNotificationBody (notification toast) and getTitle (sessions panel row).

Fixture test added in tests/e2e/clawpilot-cwd-detection.spec.ts asserting that a multi-turn continuation payload renders only the most recent user message ("now make it red"), with no "Here is the conversation" header and no "assistant:" prefix leaking into the body.
<!-- SECTION:FINAL_SUMMARY:END -->
