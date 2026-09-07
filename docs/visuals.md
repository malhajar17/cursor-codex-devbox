# Visual documentation

README visuals explain the workflow; the [verification notes](verification.md) record what was actually tested.

## Publication rules

- Prefer a disposable demo workspace with generic code and folder names.
- Capture the actual Cursor UI for screenshots. Do not present a mockup or an AI-generated image as proof that a feature worked.
- Remove host addresses, SSH aliases, user names, private project names, file paths, chats, credentials, and account details before committing an image.
- Keep original unredacted captures outside the repository. Inspect the final pixels, not just image metadata, before publication.
- Label illustrations and annotations. A folder attachment shown in an illustration is an expected result, not live verification.
- Do not submit an agent request just to produce documentation screenshots.
- Keep alt text and captions useful to readers who cannot see an image. Record capture context and any edits here.

## Diagram

The README connection diagram is an authored explanation of the intended deployment: one local Cursor installation with separate SSH windows, each connected to a devbox with its own working Codex extension. It is not evidence of live multi-host testing.
