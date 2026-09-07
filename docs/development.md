# Development and verification

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

Only patch snippets and fingerprints are distributed. Full Cursor/Codex bundles, runtime backups, SSH details, logs, unredacted screenshots, and credentials do not belong in this repository.

Public-facing images must follow the [visual documentation guide](visuals.md).
