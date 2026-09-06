# Agent handoff

This repository is the complete handoff for Codex-in-Cursor setup over SSH.
Read README.md and docs/agent-runbook.md before operating an installation.

## Scope

- Maintain two independent fixes: local Cursor folder dragging and remote Codex startup compatibility.
- The desired layout is Codex in a full-height right-hand editor group with Explorer available.
- Every SSH window uses its own resource authority and paths; never hardcode a host or username.
- The current profiles support only the versions and platform packages named in README.md.

## Execution

- Inspect versions, extension activation, and actual errors first; run `plan` before `apply`.
- Use existing session authorization. Ask only for a missing target, credentials the user must enter, or genuinely required permissions.
- Let the user handle sign-in. Never copy credentials from another application or devbox.
- Use the supported UI automation tool for editor layout, reloads, and live drag tests.
- Keep application backups and manifests outside Git; the scripts print their location.
- Never bypass Cursor integrity checks or replace its expected checksum list.
- Never force a replacement after a version, fingerprint, or anchor mismatch.
- Preflight all files before mutation. Keep exact restore paths; preserve user code and chats.
- Do not commit vendor bundles, backups, logs, screenshots, absolute personal paths, or SSH configuration.

## Verification

- Run Python patcher tests and both Node tests after code changes.
- Verify a supported real installation with the read-only `verify` commands and serializer check when available.
- Unit checks and a `resolved` log entry do not establish a visible folder attachment.
- Verify the attachment in the actual Codex composer or obtain explicit user confirmation.
- A real drop on one host does not establish testing on every host.
- Do not send prompts or read folder contents just to check attachment display.
- If mouse automation generates only dragstart, prepare diagnostics and request one real drop; do not repeat speculative patches.

## Changing supported versions

- Use a fresh vendor installation to build a new profile. Do not bundle its source.
- Preserve URI authority checks, directory markers, bounds checks, cleanup, and unrelated webview behavior.
- Test apply, repeat apply, adopt, interrupted apply recovery, and exact restore.
- Document which builds were tested live and which only passed isolated tests.
- Never report completion solely because the script ran or syntax checks passed.

## Start here

Use docs/agent-runbook.md as the sequential procedure and docs/verification.md for the known evidence and limitations.
