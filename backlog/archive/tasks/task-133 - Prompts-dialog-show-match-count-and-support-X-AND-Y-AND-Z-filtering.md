---
id: TASK-133
title: 'Prompts dialog: show match count and support ''X AND Y AND Z'' filtering'
status: Done
assignee:
  - '@claude-agent'
created_date: '2026-05-06 18:14'
updated_date: '2026-05-08 08:27'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the search-all-prompts window (PromptsDialog inside CopilotPanel.tsx around line 1242), the filter input has no result count and no boolean syntax. Two improvements: (1) display 'N of M matches' near the search box; (2) treat space-separated 'AND' tokens as logical AND so the filter returns prompts containing every term. Case-insensitive AND, surrounding whitespace ignored. Single-term searches and currently-supported substring matching must still work (no regex syntax, no quoting required).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Filter input in the prompts dialog displays 'N of M' (or 'N matches') alongside the input
- [x] #2 Query 'foo AND bar' returns prompts containing both 'foo' and 'bar' (case-insensitive), order-independent
- [x] #3 Three-way AND ('a AND b AND c') is supported
- [x] #4 Plain queries without AND continue to work as substring filters
- [x] #5 Empty AND operands are tolerated (e.g. 'foo AND  AND bar' matches both 'foo' and 'bar')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tokenize search query with /\bAND\b/i, trim each token, drop empty tokens; if zero tokens, treat as empty filter (show all)\n2. If 1 token: keep current single-substring (case-insensitive) behavior\n3. If 2+ tokens: match prompt iff every token is case-insensitive substring of prompt (order-independent)\n4. Wrap the search input in a new flex row 'ai-prompts-search-row' with a small muted 'N of M' span next to it (hide when M === 0)\n5. Add minimal CSS for the row + count span (reuse existing muted/hint colors)\n6. Update the existing footer text accordingly (kept consistent)\n7. Verify no new tsc errors in CopilotPanel.tsx
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented in CopilotPanel.tsx PromptsDialog: filter useMemo now tokenizes the query on /\bAND\b/i, drops empty operands, and matches every token (case-insensitive substring) order-independently. Single-token (no AND) keeps the existing substring path. Added an inline 'N of M' badge inside the search input row using a new flex wrapper and a small absolutely-positioned muted span (.ai-prompts-search-row + .ai-prompts-count); placeholder updated to hint at AND syntax. CSS reuses --text-secondary tones to match existing dialog vibes. Footer text untouched. Typecheck (npx tsc --noEmit) reports no new errors in CopilotPanel.tsx.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added boolean AND filtering and a live match-count to the Prompts (Ctrl+Shift+Y) dialog.

Changes:
- src/renderer/components/CopilotPanel.tsx (PromptsDialog): filter useMemo now splits the query on /\bAND\b/i, trims, drops empty operands, and matches each prompt only when every token is a case-insensitive substring (order-independent). Single-token queries keep the existing substring behavior. Wrapped the search input in a flex row with an inline 'N of M' badge (hidden when there are zero prompts). Updated the placeholder to hint at the AND syntax.
- src/renderer/styles/global.css: added .ai-prompts-search-row + .ai-prompts-count rules; the count is a small muted span using --text-secondary, absolutely positioned at the right of the input.

User impact:
- Typing 'foo AND bar AND baz' filters to prompts containing all three substrings, in any order. Plain queries without AND still work as before. 'foo AND  AND bar' tolerates the empty operand and matches 'foo' and 'bar'.
- The user can now see how many prompts matched at a glance instead of scrolling/counting.

Tests:
- npx tsc --noEmit: no new errors in CopilotPanel.tsx (pre-existing, unrelated tsc errors elsewhere unchanged).
- Manual repro covered by AC walkthrough.

Risks:
- None expected; behavior is purely renderer-side filtering and additive UI.
<!-- SECTION:FINAL_SUMMARY:END -->
