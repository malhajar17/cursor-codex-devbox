# Codex in Cursor over SSH

An unofficial, version-pinned toolkit for running the Codex extension in Cursor on SSH devboxes, placing it in a full-height right-hand editor group, and attaching folders by dragging them from Explorer.

**Agents: start with [AGENTS.md](AGENTS.md), then follow the [agent runbook](docs/agent-runbook.md).** No previous conversation or machine-specific configuration is required.

## What this includes

- A local Cursor patch that preserves folder URIs, SSH authorities, and native paths during Explorer drags and delivers them to the Codex composer.
- A separate compatibility repair for the known Codex extension startup failure under Cursor's Node 22 extension host.
- Read-only planning, checksum validation, private backups, repeatable installation, and exact restoration.
- Tests, troubleshooting notes, and a prompt you can give a fresh agent.

The local drag patch applies to every SSH window opened by that Cursor installation. It contains no fixed server address, username, home path, or extension installation directory. **Each devbox still needs a working Codex extension.** This does not transfer folders between hosts or embed Codex inside Cursor's proprietary agent tabs.

## Supported baseline and limits

| Component | Known baseline |
| --- | --- |
| Cursor client | macOS, 3.18.25; both desktop and glass bundles |
| Codex extension startup repair | 26.901.22334, Linux x64 package |
| Runtime that needed the repair | Cursor remote Node 22.22.1 |
| Toolkit requirements | Python 3.10+ and Node.js 22+; no package installation |

Profiles verify full original SHA-256 checksums as well as version and exact replacement anchors. Other Cursor builds, extension platforms, or extension versions are deliberately rejected until a new profile is reviewed and tested.

**Cursor reports that its installation is modified/corrupt after the local patch.** This is an expected integrity warning from changing its application bundles. The toolkit does not suppress the warning or change integrity checks. Cursor updates can overwrite the patch. Keep backups and rerun `plan` after an update; never force an old profile onto a new build.

A user confirmed a real folder attachment during development on one Linux SSH devbox. The final host-independent revision passed bridge, installed-serializer, and syntax checks. Multiple live devboxes have not been tested; Windows paths are covered only by isolated tests. See [verification details](docs/verification.md).

## Local client setup

Clone this repository and enter it. From a terminal with Python and Node available:

```sh
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

## Full-height Codex pane on the right

1. Run **Codex: New Codex Agent**.
2. With that editor active, run **View: Move Editor into Right Group**.
3. Use **Toggle Agents** if the native Cursor agents take up the right edge. This hides their pane without deleting chats.
4. Keep Explorer open. Hide the bottom panel with **Toggle Panel** if you want the Codex pane to extend to the bottom.

In the observed Cursor build, the secondary sidebar is reserved for Cursor's own agents. A right-hand editor group is the working layout for Codex.

## Verify folder dropping

Drag a small, known directory from the active SSH Explorer into the Codex input. Confirm a visible attachment and its folder path. Test a file too. Do not submit a model request just to test attachment display.

Repeat on another connected devbox to establish live multi-host coverage. A resolved path in a log proves only that stage; it does not prove an attachment appeared. See the runbook if automated dragging produces `dragstart` without `drop`.

## Tests

```sh
python3 -m unittest discover -s tests -v
node tests/test-bridge.cjs
node tests/test-extension-disposal.cjs
```

Set `NODE_BINARY=/absolute/path/to/node` for the Python tests if necessary. The unit tests use temporary synthetic bundles and do not modify installed applications. GitHub Actions runs these checks under Node 22.

To verify both serializer functions in a supported, patched Cursor installation:

```sh
node scripts/verify_serializer.cjs /Applications/Cursor.app/Contents/Resources/app
```

Only patch snippets and fingerprints are distributed. Full Cursor/Codex bundles, runtime backups, SSH details, logs, screenshots, and credentials do not belong in this repository.
