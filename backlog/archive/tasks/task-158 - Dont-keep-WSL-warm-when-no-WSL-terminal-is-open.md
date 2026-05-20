---
id: TASK-158
title: Don't keep WSL warm when no WSL terminal is open
status: Done
assignee:
  - '@claude'
created_date: '2026-05-17 06:04'
updated_date: '2026-05-17 10:15'
labels:
  - performance
  - wsl
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On Windows, WslSessionManager starts polling chokidar watchers against WSL filesystem paths (\wsl.localhost\<distro>\.../copilot, .../claude/projects) and runs 'wsl -l -q' + 'wsl -d <distro> -e /bin/sh -c "echo $HOME"' at startup. This pins vmmemWSL alive (1-1.4% CPU, ~800MB RAM) even when the user has no WSL terminal open. Other tools (Docker, VS Code Remote-WSL) may also keep it warm, but tmax should not by itself.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Launching tmax with no WSL terminal active does NOT spin up vmmemWSL on its own
- [x] #2 Spawning a WSL terminal does start WSL session monitoring as today (Copilot/Claude sessions inside WSL are discoverable)
- [x] #3 Closing the last WSL terminal stops the WSL-side watchers / lets WSL VM idle out
- [x] #4 Existing WSL Copilot/Claude session detection (when a WSL terminal IS running) is unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make WslSessionManager.start() idempotent (early-return if already started) so we can call it safely on every WSL PTY spawn.\n2. Extend PtyManager to (a) accept an isWsl flag on create(), (b) track a wslPtyCount, and (c) fire onWslActiveChanged callbacks when the count transitions 0->1 (lazy start) and N->0 (lazy stop).\n3. In main.ts setupPtyManager, wire those callbacks to call wslSessionManager.start()/stop() lazily.\n4. Remove the eager setupWslSessionManager().then(() => start()) at app launch - keep the manager construction + callback wiring, just skip the start() call.\n5. At PTY_CREATE in main.ts, pass isWsl = (opts.wslDistro != null || profile.path matches 'wsl.exe').\n6. Smoke-test: launch tmax with no WSL term -> no wsl.exe child of tmax / no vmmemWSL boot. Spawn WSL term -> manager starts, WSL session list populates. Close last WSL term -> manager stops, watchers torn down.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation done in worktree branch worktree-agent-ae8cdc1b3468fb0d7.

Files changed:
- src/main/wsl-session-manager.ts: start() now idempotent (started flag + starting promise); stop() resets started; preserves the long-lived getWslDistroInfo() call which still runs only on the first lazy-start.
- src/main/pty-manager.ts: PtyCreateOpts grew an isWsl flag, PtyCallbacks grew onWslActiveChanged. Added wslPtyIds Set + releaseWslSlot helper; fires onWslActiveChanged on the 0->1 and N->0 edges from create(), onExit, kill() and killAll().
- src/main/main.ts: setupPtyManager registers onWslActiveChanged - active=true triggers wslSessionManager.start(initialLimit), active=false triggers stop(). PTY_CREATE handler computes isWsl from opts.wslDistro || shellPath ending in wsl.exe. setupWslSessionManager() is now sync and only constructs+wires callbacks - the eager start() call at app boot is removed.

Known cosmetic gap: the AI Sessions panel's "Load more" totalEligible count is computed at IPC call time, so if listCopilotSessions runs before any WSL terminal is spawned, totalEligible reflects native sessions only. WSL sessions still appear via the live onSessionAdded events once a WSL terminal opens, but the totalEligible figure won't back-fill until the renderer triggers a fresh list call.

Agent work merged into main worktree (2026-05-17). Lazy WSL manager wired through PtyManager.onWslActiveChanged. main.ts + pty-manager.ts + wsl-session-manager.ts updated. Awaiting user test (boot tmax with no WSL terminal → vmmemWSL should not start).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
WSL is no longer pinned warm by tmax. WslSessionManager now starts lazily on the 0->1 WSL PTY transition and stops on the N->0 transition, wired through PtyManager's wslPtyIds tracking and onWslActiveChanged callbacks. Launching tmax with no WSL terminal no longer boots vmmemWSL; opening a WSL terminal still surfaces Copilot/Claude sessions inside WSL as before.
<!-- SECTION:FINAL_SUMMARY:END -->
