---
id: TASK-154
title: Bug - Escape key swallowed before reaching PTY in TUI apps
status: To Do
assignee:
  - '@claude-agent'
created_date: '2026-05-12 10:12'
updated_date: '2026-05-13 10:20'
labels: []
dependencies: []
references:
  - src/renderer/components/TerminalPanel.tsx
  - src/renderer/hooks/useKeybindings.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #103. /mcp show in Copilot CLI (and most other TUI dialogs - fzf, lazygit, etc.) won't dismiss with Escape. User confirms Ctrl+C still interrupts, which proves the PTY is alive - this is renderer-side. There are two Escape handlers in TerminalPanel.tsx (~2343, ~2451) and one in useKeybindings.ts; one of them is stealing the key when no overlay/menu/dialog is actually open.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pressing Escape while focused on a TUI pane reaches xterm and forwards \x1b to the PTY
- [ ] #2 Existing Escape semantics for overlays, popovers, rename inputs, and command palette are preserved
- [ ] #3 Playwright regression test verifies Escape reaches the PTY in a TUI pane with no overlays open
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the bug in Playwright: install pty-write spy, focus terminal pane, press Escape; assert pty was written with byte 0x1b.
2. If the bug reproduces (no  written), bisect Escape handlers:
   - Audit every document/window keydown listener for ones that fire without gating on overlay/menu open state.
   - Audit TerminalPanel React onKeyDown handlers (search input, rename input) - they're mounted conditionally so probably fine; verify.
   - Suspect the panel-level keydown bubble path: any wrapper that calls stopPropagation/preventDefault unconditionally would swallow Escape before xterm.attachCustomKeyEventHandler sees it.
3. Fix the culprit: tighten the gate so the handler only fires when its dialog/menu is actually visible. preserve existing Escape-closes-dialog semantics for Settings, ShortcutsHelp, CommandPalette, rename, context menus, etc.
4. Add a Playwright regression spec asserting Escape reaches the PTY when no overlay is open.
5. Re-test with the spec; commit the fix and the spec on the worktree branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13: GH #103 closed - could not reproduce. Asked reporter to reopen with diagnostics log + exact repro steps. Task parked until/unless they come back with repro signal.

Worktree (agent-ac770d94769fa216e) still has a failing PW spec at tests/e2e/escape-key-reaches-pty.spec.ts; agent was blocked debugging the test rig's xterm-focus path. Keeping the spec in the worktree in case it's useful for future investigation.
<!-- SECTION:NOTES:END -->
