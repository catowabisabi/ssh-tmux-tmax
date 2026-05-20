---
id: TASK-172
title: Drag-and-drop file onto terminal writes its path
status: Done
assignee: []
created_date: '2026-05-14 09:17'
updated_date: '2026-05-14 09:19'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Match Windows Terminal behavior: when a user drags a file (or files) from File Explorer / desktop / VS Code / any source onto a tmax pane, the file path(s) get typed into the PTY at the cursor position. Currently dragging into a pane does nothing.\n\nDesign:\n- Listen for 'dragover' (preventDefault to enable drop) and 'drop' on the .xterm-container element.\n- Pull paths via Electron's webUtils.getPathForFile(file) (with fallback to file.path for older Electron versions).\n- Quote paths containing spaces with double quotes (cross-platform; safe in cmd/PowerShell/bash).\n- Multiple files: space-separated quoted paths.\n- WSL panes: translate Windows paths to /mnt/<drive>/... form.\n- Match WT: drop just types the path, doesn't auto-submit Enter.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Drag one file from File Explorer onto a pane - file path types into the prompt
- [x] #2 Drag multiple files - paths are space-separated and quoted
- [x] #3 Paths with spaces are quoted
- [x] #4 WSL pane: dropped C:\foo file becomes /mnt/c/foo
- [x] #5 No Enter auto-submitted; matches Windows Terminal
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added drag-and-drop file path insertion on terminal panes, matching Windows Terminal.

Implementation:
- TerminalPanel listens for dragover (preventDefault when files are being dragged so the pane becomes a drop zone) and drop (extracts file paths via file.path, joins with spaces, writes to PTY).
- formatPathForPty helper handles WSL translation (C:\foo\bar -> /mnt/c/foo/bar on WSL panes) and quotes any path containing whitespace.
- No auto-Enter - the user gets to review/edit before submitting, same as WT.

Files:
- src/renderer/components/TerminalPanel.tsx: helpers + handlers + cleanup.
<!-- SECTION:FINAL_SUMMARY:END -->
