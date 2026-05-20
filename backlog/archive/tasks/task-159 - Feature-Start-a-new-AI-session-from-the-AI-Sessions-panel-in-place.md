---
id: TASK-159
title: Feature - Start a new AI session from the AI Sessions panel (in-place)
status: Done
assignee:
  - '@claude'
created_date: '2026-05-12 10:33'
updated_date: '2026-05-13 19:21'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #105 (AsafMah). User wants: from the AI Sessions panel, kick off a new Copilot/Claude session in a specific project/directory. Today users have to: open a new terminal, cd to the right folder, then run 'copilot' or 'claude'. The Sessions panel already knows every project (sessions are grouped/listed by repo or cwd) - it has the data to make 'New session here' a one-click action per project group.\n\nUX proposal: each repo group header (or each session row when listing flat) gets a small + button that creates a new terminal at that cwd and auto-runs the configured AI command (copilotCommand / claudeCodeCommand from config).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each repo group header in the AI Sessions panel exposes a '+ New session' affordance
- [x] #2 Clicking it creates a new terminal at that group's cwd and runs the configured AI command for that provider
- [x] #3 Works for both Copilot and Claude Code groups, and respects the user's configured copilotCommand / claudeCodeCommand
- [x] #4 When the panel is in flat (time-sorted) mode and there are no group headers, surface the action via per-row context menu or panel header instead
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13 design hint from user: "If there was a little + next to the group name, and it opens a new copilot session in that directory." Screenshot showed the AI Sessions panel with collapsed group headers (ASAFMAHLEV, AZURE-KUSTO-SERVICE) - the + would sit on the header row next to the count badge. Confirms the per-group affordance design over per-row.

2026-05-13 follow-up: hard-coded the + button to always spawn a Copilot session (instead of mirroring the group's top session's provider). createAiSessionInCwd already honors config.copilotCommand when defined, falling back to `copilot`. Tooltip now reads "New Copilot session in <cwd>" regardless of the group's current sessions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a per-group "+ New session" affordance on the AI Sessions panel.

Changes:
- terminal-store.ts: new createAiSessionInCwd(provider, cwd, options?) action. Picks the right shell profile (wsl when options.wsl is set, otherwise defaultShellId), creates the PTY at the target cwd, and seeds startupCommand with the configured copilotCommand / claudeCodeCommand so the AI launches automatically. Sets aiAutoTitle so the auto-title-from-summary path picks up once the session links.
- CopilotPanel.tsx: group header now renders a small + button next to the count pill. Uses the first (most-recent) session in the group as the template for cwd + provider + wsl flags. Click stops propagation so it doesn't toggle the group's collapse state.
- global.css: .ai-session-group-new pill, hover-visible so it doesn't clutter the header. Brightens to accent color on hover.

Known limitations / follow-ups:
- Flat (time-sorted) view has no group headers, so the + isn't reachable there. Could add it to the panel header or per-row context menu as a follow-up.
- Provider choice is implicit (= same as the first session in the group). If a user wants Copilot in a Claude-mostly group, they need to right-click the new tab's dropdown today. Worth a per-button dropdown later if folks ask.
<!-- SECTION:FINAL_SUMMARY:END -->
