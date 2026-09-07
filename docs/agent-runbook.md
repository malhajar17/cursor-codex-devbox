# Runbook for a fresh agent

## 1. Establish the target

The user wants Codex inside Cursor, operating on the current SSH devbox, in a full-height pane on the right, with Explorer folder drag-and-drop. This is a local UI patch plus an optional remote extension repair, not a hosted service.

Use host names, paths, and authorization already provided by the user. If no target is known, inspect the active Cursor connection and configured SSH host names through appropriate tools. Ask for the missing host only if it cannot be determined. Do not copy a previous operator's IP address or home path from examples.

Read Cursor's `package.json`, the installed Codex extension's `package.json`, and the extension-host runtime version. Record client OS, client version, extension version/platform, Node version, and which host you are inspecting. The client and the devbox are different machines.

## 2. Get the official extension working

Install or locate `openai.chatgpt` in the SSH extension environment. Let the user complete authentication through the extension's normal UI. Do not infer success from a command appearing in the palette.

If **Codex: Open Codex Sidebar** fails with `command 'chatgpt.openSidebar' not found`, inspect activation logs. In the observed baseline, `remoteexthost.log` reported a syntax error caused by `using p=n(u)`, which the bundled remote Node 22 runtime could not parse. This prevented command registration.

The sidebar error has other possible causes; apply the repair only if the error and profile match. Run `extension_patch.py plan`, then `apply` with the actual Cursor remote Node binary, then `verify`. Reload the window and inspect fresh activation results. If the extension activates normally, the repair is unnecessary.

The replacement calls `Symbol.dispose` explicitly for a resource whose `using` block contains no following statements. Tests cover receiver binding, exactly-once disposal, null resources, branch conditions, and error propagation. A differently structured `using` block needs a separate analysis.

Do not install the Linux x64 profile into a macOS, ARM, or different-version extension. If a newer extension/runtime already works, keep it.

## 3. Put Codex on the right

The observed Cursor build rejects extension view containers in its secondary sidebar because that area is reserved for Cursor agents. Repeatedly dragging the Codex sidebar there will not fix it.

Open **Codex: New Codex Agent**, focus its editor, and run **View: Move Editor into Right Group**. Keep the normal project editor on the left and Explorer available. Hide the native Agents pane if it occupies the right edge. Hide the bottom panel when the user wants full height. Preserve existing tabs, drafts, and chats.

A new workspace may start with Codex back in the left sidebar; the local folder patch does not apply the editor layout automatically. Repeat the layout steps for that workspace.

If the sidebar appears empty, inspect whether its **Codex** section at the bottom of Explorer is collapsed. If the editor itself is blank, inspect extension/webview activation before changing layout again.

## 4. Apply local folder support

Run `cursor_patch.py plan` against the local app root. The client patch belongs on the computer running Cursor, not on each devbox. Run `apply` only for a matching fingerprint. It uses the repository's patch source, preserves originals, validates syntax, and updates two application bundles.

The patch changes two points:

1. Explorer adds `application/vnd.codex.explorer-resources+json` to its drag data. Each entry contains the canonical URI, native filesystem path, and directory flag. Existing standard drag data stays available to other consumers.
2. The Codex webview's host-side drag bridge accepts a drop within its pane, rejects a different SSH authority, checks the resource through Cursor's file service, and sends `add-context-file` through the existing webview transport.

Directories use a trailing slash in the descriptor's `path`; `fsPath` identifies the actual filesystem resource. The Codex composer uses that distinction for folder references. No folder content is uploaded by this bridge.

Why both changes are needed: Cursor normally blocks iframe pointer events during workbench drags. Its standard resource/editor drag payload also omits directories in the observed serializer, while the text label can abbreviate the home directory as `~/`. A webview-only file drop listener or a hardcoded home-directory expansion is insufficient for portable folder handling.

Reload Cursor and run `verify` plus `verify_serializer.cjs` against the installed app. The integrity warning is expected; leave integrity protections intact. Explain that updates may overwrite this local customization.

## 5. Verify in the actual composer

Use a small known directory, not a credential directory. Drag it from the active SSH Explorer into Codex. Confirm the visible attachment and intended directory path; a file should also attach. Do not submit a task just to test display.

Test a second devbox with a different home path if it is available and authorized. Do not claim live multi-host verification without doing that test. The isolated bridge tests cover separate authorities and usernames, but mocks do not validate a complete remote installation.

Native UI automation during development sometimes produced only `dragstart`, no `dragover`/`drop`. A log showing the bridge was installed cannot prove the drop completed. Focus Cursor and inspect updated UI state, but avoid endless identical automated retries. If needed, enable narrowly scoped temporary diagnostics, ask the user for one real drop, and inspect that event before editing again. Remove verbose tracing afterward.

The user may remove a successful test attachment before you inspect the UI. If a real drop resolved correctly but the current composer is empty, ask whether it appeared; do not assume failure from the later empty state.

## 6. Recover or port

Use the appropriate script's `restore` command with the same root/profile/state directory. It validates every backup and every target before changing any file. It can recover a partially applied installation because the manifest and originals are persisted before application writes. If a process was interrupted, remove a stale `.lock` only after verifying no patch process is running.

A runtime write error triggers an attempted rollback of already-written files. A hard process kill can still leave a mixed state; rerun `restore`. Changed application files are never blindly replaced. If an update changed the target, inspect that state before deciding whether to use a fresh vendor installation instead.

For a new build, obtain a clean installation and inspect equivalent host and Explorer code. Add a new profile with exact original fingerprints and matching anchors. Retain the existing profiles. Update tests, verify restore byte-for-byte on a disposable copy, and perform a live attachment check. Never relax checksum checks merely to get a script to run.

## Completion report

State what changed locally, what changed on which remote host, what was tested in code, what was observed live, and any remaining limitations. Include the backup location and restore command. Do not expose personal paths or SSH metadata in GitHub documentation or issues.
