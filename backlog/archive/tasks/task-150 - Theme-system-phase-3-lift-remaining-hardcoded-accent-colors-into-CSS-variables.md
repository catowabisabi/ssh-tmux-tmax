---
id: TASK-150
title: >-
  Theme system phase 3: lift remaining hardcoded accent colors into CSS
  variables
status: Done
assignee:
  - '@inrotem'
created_date: '2026-05-09 19:56'
updated_date: '2026-05-09 19:58'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase 2 (TASK-149) gave the chrome 8 themed variables but ~100+ accent color uses across global.css are still hardcoded Catppuccin hex (#89b4fa blue, #f38ba8 red, #a6e3a1 green, #f9e2af yellow, etc.) including ~65 rgba(...) variants used for translucent overlays. Lift those into a small set of semantic variables (--accent, --accent-success, --accent-warning, --accent-danger and matching --rgb counterparts so rgba() can compose) and update theme presets with overrides so Warm Dusk's orange replaces the blue accent everywhere it shows up.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 global.css gets new semantic vars: --accent / --accent-success / --accent-warning / --accent-danger (and --rgb variants for translucent uses)
- [x] #2 Top 4 hardcoded Catppuccin accent hex codes are replaced with var() references throughout global.css
- [x] #3 Warm Dusk preset overrides accent vars so the active focus border, links, status pills, and translucent overlays go orange (instead of staying Catppuccin blue/pink)
- [x] #4 Catppuccin Mocha preset still renders pixel-equivalent to the existing default
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Theme system phase 3 - lifted ~134 hardcoded Catppuccin accent uses across global.css into 4 semantic CSS variables.

Changes:
- :root gained 4 semantic accent vars (--accent / --accent-success / --accent-warning / --accent-danger) plus matching --rgb-* triplets so rgba() overlays compose without each preset shipping its own rgba list.
- 69 hex literals (#89b4fa, #f38ba8, #f9e2af, #a6e3a1) replaced with var() refs across global.css.
- 65 rgba(R, G, B, alpha) calls swapped to rgba(var(--rgb-...), alpha).
- Catppuccin Mocha and Warm Dusk presets in theme-presets.ts both grew the new chrome overrides; Catppuccin's values match the existing :root defaults exactly so the default look is pixel-equivalent.
- Warm Dusk now recolors focus borders, link/button hovers, status-pill backgrounds, AI session badges, and translucent overlays to its orange accent (#ee6c4d) instead of leaving them Catppuccin-blue.

Net result: switching to Warm Dusk now visibly transforms the whole app, not just the chrome chrome.
<!-- SECTION:FINAL_SUMMARY:END -->
