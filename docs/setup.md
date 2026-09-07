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

## Automatic Codex pane on the right

Build and install the companion **on the computer running Cursor**:

```sh
python3 scripts/package_companion.py
cursor --install-extension dist/cursor-codex-pane-0.1.0.vsix
```

If `cursor` is not on PATH on macOS, use `/Applications/Cursor.app/Contents/Resources/app/bin/cursor` (quote the full path). You can also use **Extensions: Install from VSIX** in a local Cursor window and select the generated file. Install **Codex Pane for Cursor** locally, not in an SSH extension environment.

Reopen a project or reload its window once after installing. From then on, opening a trusted folder or workspace opens Codex on the right automatically. The helper waits up to two minutes for the remote Codex commands and restored tabs, then reuses an existing Codex conversation if available. It does not send a prompt. If Codex is unavailable or takes longer to connect, click **Codex** in the status bar after it is ready.

It hides Cursor's separate Agents pane and the bottom panel to give Codex the full height. Existing chats and terminal sessions are retained. Existing editor groups are preserved; a full-height rightmost group is reused, or a right-hand group is added beside a stacked layout. It does not flatten complex layouts.

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
