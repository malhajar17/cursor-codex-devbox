# Releases

## v0.1.1 — 8 September 2026

First downloadable experimental preview of the Codex-in-Cursor toolkit.

- A local companion opens Codex in a full-height right editor group and reuses existing conversations. Startup waits for the SSH extension; clicking while it connects joins that wait.
- Folder dragging passes references from the active SSH Explorer into the Codex composer, with checks that keep resources tied to the correct connection.
- A separate, optional startup repair handles the pinned Linux x64 Codex extension's unsupported `using` syntax on the observed remote runtime.
- Setup instructions cover new devboxes, sign-in port conflicts, backups, and rollback. `AGENTS.md` and the runbook provide a complete agent handoff.
- The release includes the companion VSIX, checksums, source archives, and a LinkedIn presentation with real demo screenshots.

### Supported builds

Cursor **3.18.25 on macOS**; Codex extension **26.901.22334, Linux x64**. The observed remote runtime is Node **22.22.1**. The toolkit requires Python **3.10+** and Node **22+** when applying patches or building from source.

### Verification

The 12 Python patcher tests, 22 companion cases, and both Node patch suites passed. Installed Cursor bundle verification and both serializer checks passed. Real folder attachments were confirmed on two Linux SSH devboxes. On the second host, a fresh window automatically opened the right pane, reused its saved login, and accepted a folder drop without submitting a prompt.

### Known limits

This is a community customization. The folder patch changes local Cursor application files and triggers its modified/corrupt installation warning. Updates may overwrite the patch, and unsupported fingerprints are rejected. The official extension and authentication are required on each devbox. The companion does not resolve SSH sign-in port collisions or integrate with Cursor's native agent tabs. See the [setup guide](docs/setup.md) before installing and the [verification record](docs/verification.md) for the tested scope.
