# Installation and rollback

[← Project overview](../README.md) · [Agent runbook](agent-runbook.md)

Check the supported versions and limitations in the README before applying a patch. Run the local steps on the computer running Cursor, and remote steps on each SSH devbox.

## Local client setup

Clone this repository and enter it. From a terminal with Python and Node available:

```sh
git clone https://github.com/malhajar17/cursor-codex-devbox.git
cd cursor-codex-devbox

python3 scripts/cursor_patch.py plan
python3 scripts/cursor_patch.py apply
python3 scripts/cursor_patch.py verify
```

The default application root is `/Applications/Cursor.app/Contents/Resources/app`. Override it with `--app-root /path/to/Cursor.app/Contents/Resources/app`. If Node is not on PATH, pass `--node /absolute/path/to/node` to `apply` and `verify`. Use your normal filesystem approval flow if Cursor's application directory requires additional write access.

`plan` only inspects files. `apply` validates every candidate with `node --check`, saves originals and a manifest outside the repository, and then replaces the application files. It can also adopt an already-installed, byte-identical version of this patch. The backup path is printed; `--state-dir /private/backup/directory` overrides it.

In Cursor, run **Developer: Reload Window** after applying. Restore when needed:

```sh
python3 scripts/cursor_patch.py restore
```

Reload again after restoring. Use the same application root, profile, and backup directory. Restoration refuses to overwrite bundles changed by an update or another patch. Backups are retained.

## Setup on each SSH devbox

**The pane companion is not the Codex agent itself.** A fresh devbox needs the official Codex extension too. To have Cursor install it when connecting to SSH hosts, add this to your **local user settings**, merging it with any existing list:

```json
{
  "remote.SSH.defaultExtensions": ["openai.chatgpt"]
}
```

This setting is provided by Cursor's Remote SSH extension. It installs the official extension; it does not copy your authentication or apply compatibility repairs. Each host may require its own sign-in. If the extension cannot activate, follow the diagnosis below. See the [official Codex installation guide](https://learn.chatgpt.com/docs/codex/ide) for installation and sign-in.

1. Connect using Cursor's Remote SSH extension and your existing SSH configuration.
2. Install the official Codex extension (`openai.chatgpt`) in that SSH environment, then open Codex.
3. If it activates normally, skip the startup repair. If commands fail, inspect the remote extension-host log before changing anything.
4. Only for the known unsupported `using` syntax error and matching package, clone or copy this toolkit to that devbox. Run the commands below **on the devbox**, with the actual extension directory and Cursor remote Node path.

```sh
python3 scripts/extension_patch.py plan \
  --extension-dir /path/to/openai.chatgpt-26.901.22334-linux-x64

python3 scripts/extension_patch.py apply \
  --extension-dir /path/to/openai.chatgpt-26.901.22334-linux-x64 \
  --node /path/to/cursor-server/node

python3 scripts/extension_patch.py verify \
  --extension-dir /path/to/openai.chatgpt-26.901.22334-linux-x64 \
  --node /path/to/cursor-server/node
```

The extension is commonly under `~/.cursor-server/extensions/`, but discover it rather than assuming a username or installation path. Use the Node executable from that connection's extension-host process/log, not an unrelated shell Node. Reload the Cursor window and confirm extension activation. `extension_patch.py restore --extension-dir ...` restores the original extension bundle; restoring also restores its original runtime compatibility requirements.

The startup repair and local folder-drag patch are independent. Restoring one does not restore the other. An extension update may remove the startup repair or make it unnecessary.

### Sign-in returns to localhost and fails

The browser runs on your computer, while Codex's sign-in server runs on the devbox. The browser callback uses `localhost:1455`, so that local port must forward to the devbox where you started sign-in.

With multiple SSH windows open, another devbox can already own local port 1455. Cursor may then assign a different local port to the current devbox, while the browser still returns to 1455. This is a forwarding conflict, not a pane-layout problem.

1. Check the port forwarding for the **SSH window where you started sign-in**. Find its remote port 1455 and the assigned local port.
2. If that mapping uses another local port, change only the port in the failed browser callback's address to that verified local port and retry once. Keep its path and query unchanged. Do not guess the port or use a mapping for another devbox. If the login has expired, start sign-in again after correcting the forwarding.
3. Confirm the result in Codex, or run `codex login status` on that same devbox. A successful callback page alone does not verify which host is signed in.

For a new login, stop an unused port-1455 forward in the other SSH window before starting, then ensure the intended window forwards local 1455 to remote 1455. Another option is **device code authentication**, which avoids the localhost callback:

```sh
# Run on the devbox you want to sign in to.
codex login --device-auth
codex login status
```

If `codex` is not on PATH, use the Codex binary bundled with that devbox's installed extension. Device code login must be enabled in your ChatGPT security settings or workspace permissions; complete the browser step yourself. The CLI and extension share the login cache for the same user and Codex home, so ordinary later sessions can reuse it. See the [official authentication guide](https://learn.chatgpt.com/docs/auth#login-on-headless-devices).

Keep callback URLs, temporary codes, and saved credentials out of issues and logs. Report the local-to-remote port mapping and error instead. The companion does not manage authentication or port forwarding.

## Automatic Codex pane on the right

Build and install the companion **on the computer running Cursor**:

```sh
python3 scripts/package_companion.py
cursor --install-extension dist/cursor-codex-pane-0.1.1.vsix
```

If `cursor` is not on PATH on macOS, use `/Applications/Cursor.app/Contents/Resources/app/bin/cursor` (quote the full path). You can also use **Extensions: Install from VSIX** in a local Cursor window and select the generated file. Install **Codex Pane for Cursor** locally, not in an SSH extension environment.

Reopen a project or reload its window once after installing. From then on, opening a trusted folder or workspace opens Codex on the right automatically. The helper waits up to two minutes for the remote Codex commands and restored tabs, then reuses an existing Codex conversation if available. It does not send a prompt. Clicking **Codex connecting** while it is waiting joins the same startup attempt; it does not cancel it or create another tab.

If the status changes to **Codex setup**, check that the official `openai.chatgpt` extension is installed and enabled **in that SSH workspace**. The local companion alone is insufficient. If installed, inspect activation errors and use the matching startup repair only when needed. After installing or repairing the official extension, reload the existing window once. A manual open waits for startup too; if it times out, its notification offers **Open Extensions** and **Reload Window** instead of an immediate ambiguous error.

It hides Cursor's separate Agents pane before choosing an editor group, then hides the bottom panel to give Codex the full height. Existing chats and terminal sessions are retained. Existing editor groups are preserved; a full-height rightmost group is reused, or a right-hand group is added beside a stacked layout. It does not flatten complex layouts. When no code is open, it leaves a clean untitled editor on the left so Cursor does not collapse the empty group. No file is written to disk.

Closing Codex keeps it closed until that window reloads. The status bar button brings it back with one click. Change these settings in Cursor's user settings to control all its workspaces, or in workspace settings for one project:

```json
{
  "cursorCodex.autoOpen": true,
  "cursorCodex.hideCursorAgents": true,
  "cursorCodex.fullHeight": true
}
```

Set a value to `false` to disable that behavior. Leave `chatgpt.openOnStartup` off: the official setting focuses the left sidebar. Empty welcome windows and untrusted projects are skipped. The helper does not install or authenticate the official Codex extension for you.

To uninstall the companion without removing the folder patch or Codex:

```sh
cursor --uninstall-extension malhajar17.cursor-codex-pane
```

You can also disable it in local Extensions. Existing tabs keep their current positions.

### Manual fallback

1. Run **Codex: New Codex Agent**.
2. With that editor active, run **View: Move Editor into Right Group**.
3. Use **Toggle Agents** if the native Cursor agents take up the right edge. This hides their pane without deleting chats.
4. Keep Explorer open. Hide the bottom panel with **Toggle Panel** if you want the Codex pane to extend to the bottom.

In the observed Cursor build, the secondary sidebar is reserved for Cursor's own agents. A right-hand editor group is the working layout for Codex. Use these manual steps only when the companion is disabled or unavailable. If the CODEX section is collapsed, expand it to reveal the sidebar input.

## Verify folder dropping

Drag a small, known directory from the active SSH Explorer into the Codex input. Confirm a visible attachment and its folder path. Test a file too. Do not submit a model request just to test attachment display.

Repeat on another connected devbox to establish live multi-host coverage. A resolved path in a log proves only that stage; it does not prove an attachment appeared. See the [agent runbook](agent-runbook.md) if automated dragging produces `dragstart` without `drop`.
