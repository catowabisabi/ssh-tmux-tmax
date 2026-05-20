---
id: TASK-163
title: Disambiguate session list labels when multiple cwds share a leaf name
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 07:55'
updated_date: '2026-05-17 07:57'
labels:
  - ui
  - ai-sessions
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
shortPath() in CopilotPanel.tsx returns only the last folder segment. Sessions in C:\projects\Clawpilot and C:\Users\me\Documents\Clawpilot both render as 'Clawpilot' in the sessions list, making them indistinguishable. Compute a collision-aware display so colliding leaves expand to the shortest unique suffix path (e.g. 'projects\Clawpilot' vs 'Documents\Clawpilot'). Sessions with unique leaves keep the single-segment label.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Two sessions sharing leaf name 'Clawpilot' but different parents render with distinct path suffixes
- [x] #2 Sessions whose leaf folder name is unique among all currently displayed sessions still render with just the leaf name (no regression)
- [x] #3 Disambiguation runs across the full session list, not per-group, so the same cwd renders the same in every row
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Per-session cwd labels in the AI Sessions list now disambiguate collisions by extending the displayed path until each row is unique. Sessions in C:\projects\Clawpilot and C:\dev\Clawpilot render as "projects\Clawpilot" and "dev\Clawpilot" respectively. Sessions whose leaf folder is already unique keep the single-segment label (no regression).

Changes:
- src/renderer/components/CopilotPanel.tsx: new buildCwdDisambig() helper that computes the shortest unique suffix path per cwd, case-folded so Windows-equivalent paths still collapse. cwdDisambig useMemo recomputes when filtered sessions change. cwdLabel() helper looks up from the map with shortPath fallback.
- repoKey switched from leaf-only to full cwd (case-folded) so different folders that happen to share a basename land in separate groups, not one combined "Clawpilot" group.
- Per-row cwd subtitle and group header now use cwdLabel/repoDisplay-via-disambig.

Typecheck: clean for the touched file.
<!-- SECTION:FINAL_SUMMARY:END -->
