---
id: TASK-160
title: Floating jump-to-bottom button on terminal pane
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:38'
updated_date: '2026-05-17 06:41'
labels:
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a terminal pane is scrolled away from the bottom (user reading scrollback), show a small floating arrow button in the bottom-right corner that scrolls back to live output. Hidden when already at the bottom. Mirrors VS Code / Windows Terminal scroll-to-bottom UX. Less discoverable than an always-visible icon, but keeps the pane chrome clean.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Button appears at bottom-right of the pane when xterm is scrolled above the live bottom
- [x] #2 Button is hidden when the pane is at the live bottom (no scrollback offset)
- [x] #3 Clicking the button scrolls xterm to the bottom and re-focuses the terminal
- [x] #4 Button works in all pane modes (tiled / floating / focus)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a floating "scroll to bottom" arrow that appears at the bottom-right of each terminal pane only when xterm is scrolled away from live output. Hidden the rest of the time.

Changes:
- src/renderer/components/TerminalPanel.tsx: new isScrolledAway state, term.onScroll listener that compares buffer.viewportY vs baseY, button render inside the existing pane wrapper (so .terminal-panel position:relative anchors it). Click → term.scrollToBottom() + term.focus().
- src/renderer/styles/global.css: .terminal-jump-to-bottom rules (28px circle, positioned bottom: 36px / right: 14px to clear the latest-prompt banner and xterm scrollbar, fades on hover/focus).

Works in tiled, floating, and focus modes because the button lives inside the same pane root as the xterm container, not in a layout-specific wrapper. Scroll disposable is cleaned up alongside the existing dataDisposable on unmount.
<!-- SECTION:FINAL_SUMMARY:END -->
