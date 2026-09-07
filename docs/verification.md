# Verification evidence and limits

The original work used Cursor 3.18.25 on macOS, an SSH Linux x64 devbox, Codex extension 26.901.22334, and Cursor remote Node 22.22.1.

- The extension failed to activate on unsupported `using` syntax; the targeted replacement passed parsing and the extension subsequently activated.
- Codex was opened in a full-height right-hand editor group.
- A real user drag reached the host bridge, resolved a directory with the correct folder marker, and the user explicitly confirmed that an attachment appeared.
- The subsequent canonical-URI revision removed home-directory inference. Both actual installed Explorer serializers and the multi-host bridge tests passed.
- On 7 September 2026, the installed final patch passed read-only verification of both Cursor bundles. In a clean demo project on the same Linux SSH devbox, the user performed a real folder drop and confirmed the `src` attachment. The screenshot then showed that folder reference in a submitted demo message, with Codex acknowledging it. See the [screenshots and capture notes](visuals.md). The final revision has not been confirmed live on another devbox.

The repository packaging was checked with read-only planning/verification against the patched local Cursor bundles. Its installer and restoration behavior are tested against disposable synthetic bundles, including repeat application, adoption of an existing exact patch, syntax failure, checksum failure, backup tampering, partial application recovery, and injected write failure.

The bridge tests cover separate SSH authorities, different home paths, custom extension installation locations, rejection of resources from other hosts, local/remote separation, directory markers, spaces, URI fallback, Windows path-shaped inputs, missing paths, deduplication, bounds checks, and listener cleanup.

## Automatic pane — 7 September 2026

The local **Codex Pane for Cursor 0.1.0** companion was installed through Cursor's VSIX CLI. In a newly created harmless project on the same Linux SSH devbox, Codex appeared automatically in the right editor group with its composer visible, Explorer available, and the native Agents and bottom panels hidden. No command-palette action or prompt submission was used. In the original demo window, the existing Codex conversation and its folder-reference message remained visible in the right pane. Screenshots were inspected for both checks.

All 15 companion unit cases passed, covering delayed command registration, restored tabs, avoiding duplicates, manual reopen after closing, opt-out and cancellation, and preserving stacked/complex editor layouts. Complex layouts and connection timeouts were tested in isolation, not exhaustively in the live UI. The companion has been observed on one SSH host; it does not establish live coverage of every devbox or future extension versions.

Not established: current support in other Cursor versions; a live Windows devbox; a live macOS remote host; multiple live SSH devboxes; compatibility with future Codex webview message contracts; native Cursor agent-tab integration; persistence across application updates. A profile mismatch is an unsupported build, not a reason to force the patch.

No proprietary application bundles or user environment logs are included. Tests use authored fixtures and patch snippets. Optional installed-serializer verification reads the user's own installation without copying it into Git.
