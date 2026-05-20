---
id: TASK-173
title: New terminal in place - replace current pane with fresh shell
status: Done
assignee:
  - '@claude'
created_date: '2026-05-14 09:36'
updated_date: '2026-05-14 09:49'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pane menu option to spawn a fresh terminal in the same layout slot the current pane occupies. Keeps the slot (and any neighbor splits) intact - old PTY is killed, new PTY takes its place. Useful when a shell gets into a weird state or you want a clean slate without tearing down the surrounding layout. Different from Refresh pane (which keeps the same PTY) and from Close pane (which removes the slot).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Right-click pane menu has 'New terminal in place' item below 'Refresh pane'
- [x] #2 Clicking it spawns a fresh shell of the same profile, in the same slot, focus lands on the new pane
- [x] #3 Old PTY is killed and removed from the terminals map; neighbors in the split stay in place
- [x] #4 Works for tiled and floating modes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a new action replaceTerminal(id, shellProfileId?) and a pane-menu entry "♻️ New terminal in place" right under Refresh pane.

How it works:
- Snapshots the old pane's slot-relevant fields (mode, tabColor, workspaceId).
- Spawns a fresh PTY with the same shell profile (or a different one if passed).
- Builds a replacement TerminalInstance with a NEW id, preserves the slot.
- Swaps the terminalId on the matching leaf in the active layout tree (replaceLeafTerminalId), and in floatingPanels for floating panes. Mirrors the swap into the workspaces map and preGridRoot so a workspace switch or grid-mode toggle doesn't reveal a stale id.
- Updates focus to the new pane.
- Kills the old PTY in the background (no await) so the swap is instant.

Different from Refresh pane (xterm remount, same PTY) and Close pane (slot removed).
<!-- SECTION:FINAL_SUMMARY:END -->
