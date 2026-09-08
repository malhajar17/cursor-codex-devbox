# Codex Pane for Cursor

Install this small local extension to open Codex automatically on the right whenever a trusted project opens. It waits for the Codex extension in the current workspace, including an SSH connection, and reuses an existing Codex editor. Closing the pane keeps it closed for the rest of that window session. The **Codex** status bar button brings it back.

This is a community companion, not the official Codex extension. Install the official `openai.chatgpt` extension separately in each environment where you use it.

For new SSH hosts, add `"remote.SSH.defaultExtensions": ["openai.chatgpt"]` to Cursor's local user settings, preserving other entries. This installs the official extension automatically; sign-in and any runtime compatibility repair still belong to each host.

Version 0.1.1 waits when you click during connection instead of cancelling automatic startup. The status bar shows **Codex connecting** while waiting and **Codex setup** if the agent never becomes ready. In that case, check installation and activation in the current SSH workspace, then reload after making repairs.

In an otherwise empty workspace, a clean untitled editor keeps the left code area open beside Codex. It does not create a disk file. Existing code tabs are retained.

## Settings

- `cursorCodex.autoOpen`: open once at startup (default `true`).
- `cursorCodex.hideCursorAgents`: hide Cursor's separate Agents pane when opening Codex (default `true`).
- `cursorCodex.fullHeight`: hide the bottom panel when opening Codex (default `true`). Existing terminal sessions remain running.

The helper runs on your computer and has no host names, authentication, network requests, telemetry, or folder-content reads. Existing groups and conversations are retained. Its current Codex editor route was verified with extension **26.901.22334** and Cursor **3.18.25**; other combinations need verification.

Build and install from the repository root:

```sh
python3 scripts/package_companion.py
cursor --install-extension dist/cursor-codex-pane-0.1.1.vsix
```

Install locally, not through an SSH terminal. Reopen a project or reload its window once after installation. Thereafter it opens automatically. To undo, disable/uninstall **Codex Pane for Cursor** in local Extensions, or run `cursor --uninstall-extension malhajar17.cursor-codex-pane`. Uninstalling does not rearrange existing tabs.
