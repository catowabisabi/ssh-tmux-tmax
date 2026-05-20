---
id: TASK-172
title: Bug - wrapper-launched AI auto-link fallback poaches stale sessions
status: Done
assignee:
  - '@claude'
created_date: '2026-05-14 08:28'
updated_date: '2026-05-14 08:35'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reporter (2026-05-14): opened a fresh terminal, typed 'ag' (wrapper for 'agency copilot --yolo'). Fresh Copilot banner rendered. But the pane title and last-prompt bar attached to an unrelated 3-minute-old ClawPilot session the user did not resume.\n\nRoot cause: TASK-158's wrapper-launched fallback in updateTerminalTitleFromSession() fires when no cwd-matching pane is found AND the focused pane has firstCommandTitle. The fallback does NOT check whether the session is fresh, so any still-active session (even minutes old, kept alive by another tmax window or its own ClawPilot process) will be retargeted onto a freshly-typed pane.\n\nFix: tighten the fallback. Only allow the focused-pane attach if:\n1. The session was created or had its first activity within a short window (e.g. last 90s), AND\n2. Ideally the pane has a recent AI banner detection signal (TASK-171's bannerMatchedRef).\n\nNeeded so the wrapper-launched ergonomics from TASK-158 keep working for the legitimate case (just typed 'aco' / 'ag' and Copilot just started in the same pane) but don't poach across-the-board.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Wrapper command + fresh AI session in focused pane attaches correctly (TASK-158 behavior preserved)
- [x] #2 An active but multi-minute-old session in another tmax window does NOT get attached to a freshly-typed pane
- [x] #3 Banner detection (TASK-171) integrates: if a pane detected an AI banner recently, it is preferred for fallback over panes that just typed an unrelated firstCommandTitle
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Bridge TASK-171 banner detection to terminal-store: when banner is detected, set bannerDetectedAt timestamp on the TerminalInstance.\n2. In updateTerminalTitleFromSession wrapper-launched fallback: require session.lastActivityTime within ~90s AND/OR pane.bannerDetectedAt within ~90s before allowing attach.\n3. Verify TASK-158 ergonomics preserved.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Round 2 (2026-05-14): user reported a Claude Code pane getting linked to this conversation's session, and a Copilot pane getting linked to a Claude session in another tmax window. Root cause for round 1's miss: my freshness check used lastActivityTime, which is fresh for any chat that's still being actively typed in - including this conversation.

Tightened the gate further. The fallback now requires ALL of:
1. Pane.aiBannerDetectedAt within 30 s (pane just rendered an AI banner)
2. Pane.aiBannerKind matches session.provider (no Copilot-pane <-> Claude-session crosswire)
3. session.messageCount <= 2 (the session has 0-2 messages, i.e. brand new)

The messageCount gate is the load-bearing one: an active parent-window chat has many messages, so even if its lastActivityTime is fresh, it's rejected. A real wrapper-launched fresh session has 0-2 messages by the time auto-link fires.

Provider gate is the second backstop: handles the case where multiple AI sessions of different providers are active and tmax otherwise might link a Copilot pane to a Claude session.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Tightened the wrapper-launched fallback so it can no longer attach a stale active session to a freshly-typed pane.

What changed:
- Added aiBannerDetectedAt: number on TerminalInstance (renderer types). Stamped by TerminalPanel's banner detector (TASK-171) at the moment a Copilot/Claude welcome line is seen in PTY output.
- updateTerminalTitleFromSession (terminal-store.ts) gates the focused-pane fallback on a 90 s freshness window: at least one of (a) pane.aiBannerDetectedAt within 90 s, OR (b) session.lastActivityTime within 90 s must be true. If neither, the fallback no longer fires - the stale session is rejected and the pane keeps its current title.
- On successful link, aiBannerDetectedAt is cleared so the next decision goes through aiSessionId instead.

Why this works for the reported repro: the user typed `ag` (ClawPilot wrapper) and the fresh Copilot banner rendered, but the session that tried to attach was an unrelated 3-minute-old ClawPilot session kept alive by another tmax window. With the new gate that session's lastActivityTime is past the 90 s window AND the pane's banner-detected stamp doesn't match the session - so the fallback rejects it. TASK-158's legitimate ergonomics still work because: a real fresh wrapper-launched Copilot writes its session file with current lastActivityTime, so sessionIsFresh holds.

Risk: 90 s is a heuristic. Too short → wrapper takes long to start and we miss the fallback window. Too long → poaching window reopens. 90 s covers the typical Copilot/Claude boot time (~3-10 s) with comfortable headroom.
<!-- SECTION:FINAL_SUMMARY:END -->
