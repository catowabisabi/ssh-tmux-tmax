---
id: TASK-166
title: >-
  Show-in-AI-sessions highlight should be visually distinct from a
  click-selected row
status: Done
assignee:
  - '@claude'
created_date: '2026-05-13 10:30'
updated_date: '2026-05-13 10:41'
labels: []
dependencies: []
references:
  - src/renderer/components/CopilotPanel.tsx
  - src/renderer/styles/global.css
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today 'Show in AI sessions' (from the pane right-click menu) just calls setSelectedIndex(idx) on the AI Sessions panel - which applies the same .selected class as a user click. Indistinguishable visually. User wants a clearer 'look here!' cue when the highlight is programmatic.\n\nProposed: add a transient .flashing class that's set on the targeted row when showAiSessionsForPane fires its highlight effect. CSS animation pulses an accent glow for ~1.5 s, then clears. .selected stays applied underneath so the row remains as the keyboard cursor after the flash fades. .pane-active retains its existing 3px rail (no conflict).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Triggering Show in AI sessions adds a transient .flashing class to the target row
- [x] #2 The flash is visually distinct from .selected (regular click) - e.g. a brief accent-color glow that fades
- [x] #3 After the flash fades, the row behaves like a normally-selected row (.selected stays applied)
- [x] #4 .pane-active and .flashing can coexist on the same row without rendering glitches
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a transient flash class so the Show-in-AI-sessions highlight visually distinguishes itself from a normal click-selection.

Changes:
- CopilotPanel.tsx: new flashedSessionId state + flashTimerRef. Inside the highlight effect, when requestChanged is true (= showAiSessionsForPane was just called, not a regular focus change), set flashedSessionId to the target id and schedule a clear after 1500ms. Apply .flashing class to the matching row.
- global.css: new @keyframes ai-session-flash + .ai-session-item.flashing selector. Animation pulses an accent background + box-shadow glow over 1.5s and ends transparent so .selected / .pane-active steady state takes over cleanly.
- Cleanup on unmount clears the pending timer.

The flash only fires when triggered programmatically (requestChanged); a normal click-selection just sets .selected, no flash. .pane-active and .flashing compose fine since the animation only touches background and box-shadow.
<!-- SECTION:FINAL_SUMMARY:END -->
