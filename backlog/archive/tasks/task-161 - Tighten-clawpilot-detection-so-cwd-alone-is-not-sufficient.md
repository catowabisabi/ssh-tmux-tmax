---
id: TASK-161
title: Tighten clawpilot detection so cwd alone is not sufficient
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:39'
updated_date: '2026-05-17 07:16'
labels:
  - bug
  - ai-sessions
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
detectSessionHost in src/shared/copilot-types.ts has two heuristics: (1) literal '[clawpilot context:' marker in latestPrompt/summary, and (2) cwd contains a /clawpilot/ path segment. The cwd heuristic produces false positives for plain Claude Code sessions that happen to be running inside a clawpilot-named folder (e.g. when the user is developing ClawPilot itself). Result: the toast title says 'ClawPilot - Session Ready' for ordinary CC work, with the lobster icon, which is misleading. The cwd check was added as a fallback for continuation turns where the marker gets sliced out of short summary/latestPrompt copies. We should keep that fallback for sessions that have ALREADY been seen as clawpilot at least once via the marker, but not let cwd alone promote a session to clawpilot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A plain Claude Code session running in a folder containing a 'clawpilot' path segment is NOT labelled ClawPilot unless its latestPrompt or summary has actually contained the literal marker at some point
- [x] #2 Existing ClawPilot detection continues to work for sessions whose prompts include the literal '[clawpilot context:' marker, including continuation turns where the marker has been stripped from the latest copy
- [x] #3 Test coverage: spec asserts the false-positive case (cwd contains /clawpilot/, no marker anywhere) is labelled by underlying provider, not ClawPilot
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Tightened detectSessionHost in src/shared/copilot-types.ts so a /clawpilot/ cwd alone no longer promotes a plain Claude Code session to ClawPilot. Continuation-turn detection now requires BOTH the cwd match AND the literal "Here is the conversation:
user:" wrapper phrase. The original literal "[Clawpilot context:" marker still wins on its own.

Motivation: a developer running plain Claude Code inside the ClawPilot project folder was seeing toasts mislabelled as ClawPilot - including the lobster icon - which was misleading.

Changes:
- src/shared/copilot-types.ts: introduce CLAWPILOT_CONTINUATION_MARKER constant; cwd check is now an AND with the wrapper phrase rather than a standalone fallback.
- tests/e2e/clawpilot-cwd-detection.spec.ts: renamed cwd-alone test to assert the continuation+cwd path, added explicit regression test for the false-positive case (plain CC in /clawpilot/ folder).
<!-- SECTION:FINAL_SUMMARY:END -->
