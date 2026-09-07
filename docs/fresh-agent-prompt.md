# Prompt for a fresh agent

Copy this into an agent session with access to the computer running Cursor:

> Set up Codex in Cursor for my SSH devbox using this repository. Read AGENTS.md and docs/agent-runbook.md first. Use my current Cursor SSH connection, or ask for the host if none is available. Inspect the installed client, extension, and remote Node versions. Use the pinned scripts only when their fingerprints match. Build and install the local Codex Pane companion so Codex opens automatically in a full-height editor group on the right with Explorer available. Verify automatic opening in a fresh workspace and reuse of an existing conversation. Enable folder dragging through the local Cursor patch and verify a real folder attachment. Keep the solution independent of host names and user home paths. Preserve my code, tabs, chats, and authentication. Report what you actually verified, where backups were saved, and how to restore. If the installed version is unsupported, investigate a compatible profile without forcing the existing one.

If setting up several devboxes, add their existing SSH aliases and ask the agent to verify each one. A working Codex extension is required separately on each host; the local companion and Cursor drag patch are shared by that Cursor profile's SSH windows.
