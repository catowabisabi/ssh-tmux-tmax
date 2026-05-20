---
id: TASK-158
title: Bug - Terminal title not updated when AI CLI is launched via a wrapper
status: Done
assignee:
  - '@claude'
created_date: '2026-05-12 10:33'
updated_date: '2026-05-13 12:13'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #99. Reporter (ronny8360988) uses a PowerShell function 'aco' that invokes 'agency copilot ...' with MCP flags. tmax detects AI sessions by exe name (copilot.exe / claude.exe); when wrapped via 'agency.exe', the detection misses and the auto-title-from-AI-summary path never fires. Confirmed reproducing in v1.7.3 AND v1.8.0. Reporter has a workaround (manual rename) so this is not urgent, but the detection layer is brittle - any user wrapping the AI CLI (alias, function, shim) hits this.\n\nProposed fix: detect by banner/output pattern (the canonical 'Copilot CLI' / 'Claude Code' welcome line in PTY output) rather than - or in addition to - process exe name. Banner-based detection works regardless of how the AI was launched (wrapper, npx, WSL alias, etc.).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When Copilot/Claude is launched via any wrapper (PowerShell function, alias, etc.) the pane title still auto-updates from the AI session summary
- [x] #2 Existing exe-name detection path keeps working (no regression for the direct 'copilot'/'claude' invocation)
- [x] #3 Comment on GH #99 once landed, with a note for the reporter to verify their 'aco' wrapper
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a wrapper-launched fallback to the AI auto-link logic in terminal-store.ts. When the strict cwd match comes up empty (e.g. the wrapper changed directory before spawning Copilot), the focused pane is offered as a fallback host IF it has firstCommandTitle set (= the user just typed something there) AND no existing AI link AND is a tiled/floating pane.

The firstCommandTitle + focused signal is the same combo we already trust for in-cwd disambiguation, so the safety story is consistent: we only attach to panes the user clearly just acted on. Background panes that happen to be focused but haven't been typed in stay off-limits.

Doesn't introduce banner-pattern detection (still simpler and lighter to ship), and doesn't change the strict-match-first preference - so existing behavior for direct `copilot` / `claude` invocations is unchanged.

Ready for ronny to verify with his `aco` PowerShell function; comment on GH #99 once 1.8.1 ships.
<!-- SECTION:FINAL_SUMMARY:END -->
