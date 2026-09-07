# Development and verification

```sh
python3 -m unittest discover -s tests -v
node tests/test-bridge.cjs
node tests/test-extension-disposal.cjs
node --test tests/test-pane.cjs
python3 scripts/package_companion.py
```

Set `NODE_BINARY=/absolute/path/to/node` for the Python tests if necessary. The unit tests use temporary synthetic bundles and do not modify installed applications. GitHub Actions runs these checks under Node 22.

The companion tests cover delayed remote activation, restored conversations, concurrent opens, user closure, disabling startup during connection, disposal, unsupported legacy panes, and preserving complex layouts. The dependency-free packager includes an explicit file allowlist; generated VSIX files stay in ignored `dist/`. Source is under `companion/`. Install the built VSIX locally for live checks in a disposable workspace.

To verify both serializer functions in a supported, patched Cursor installation:

```sh
node scripts/verify_serializer.cjs /Applications/Cursor.app/Contents/Resources/app
```

Only patch snippets and fingerprints are distributed. Full Cursor/Codex bundles, runtime backups, SSH details, logs, unredacted screenshots, and credentials do not belong in this repository.

Public-facing images must follow the [visual documentation guide](visuals.md).
