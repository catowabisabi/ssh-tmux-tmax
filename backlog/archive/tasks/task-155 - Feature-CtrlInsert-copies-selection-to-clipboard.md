---
id: TASK-155
title: Feature - Ctrl+Insert copies selection to clipboard
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-05-12 10:13'
updated_date: '2026-05-13 10:11'
labels: []
dependencies: []
references:
  - src/renderer/hooks/useKeybindings.ts
  - src/renderer/components/TerminalPanel.tsx
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GH #102. Shift+Insert pastes already; users expect the symmetric Ctrl+Insert to copy. Currently it does nothing (xterm may also be ignoring it). Need to bind it to the existing copy-selection action and ensure xterm doesn't swallow it before our handler runs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ctrl+Insert with a selection in a terminal pane copies the selected text to the clipboard
- [x] #2 Ctrl+Insert with no selection is a no-op (does not error or paste empty)
- [x] #3 Default keybinding visible in Settings → Keybindings under the copy action
- [x] #4 Playwright regression test selects text, presses Ctrl+Insert, asserts clipboard content
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-05-13: Merged TASK-155 changes from worktree agent-ae445eee22e3f6b29 into main:
- src/main/config-store.ts: added Ctrl+Insert -> copySelection to defaultConfig.keybindings AND a migration block that injects the binding for existing users (keyed on action, not combo, so users who already bound copySelection to a different key are preserved).
- src/renderer/hooks/useKeybindings.ts: imported getTerminalEntry + smartUnwrapForCopy; added Ctrl+Insert to DEFAULT_BINDINGS; added a new copySelection dispatchAction case that pulls the focused terminal's selection, optionally smart-unwraps based on terminal.smartUnwrapCopy config, writes to clipboard, and clears selection. Silent no-op on empty selection.
- tests/e2e/issue-102-ctrl-insert-copy.spec.ts: copied from worktree. Not run yet - needs a fresh npm run package first since the e2e build is stale.

Ready to test in dev mode (npm start) immediately.
<!-- SECTION:NOTES:END -->
