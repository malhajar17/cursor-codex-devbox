# Visual documentation

README visuals explain the workflow; the [verification notes](verification.md) record what was actually tested.

## Publication rules

- Prefer a disposable demo workspace with generic code and folder names.
- Capture the actual Cursor UI for screenshots. Do not present a mockup or an AI-generated image as proof that a feature worked.
- Remove host addresses, SSH aliases, user names, private project names, private file paths, unrelated chats, credentials, and account details before committing an image.
- Keep original unredacted captures outside the repository. Inspect the final pixels, not just image metadata, before publication.
- Label illustrations and annotations. A folder attachment shown in an illustration is an expected result, not live verification.
- Do not submit an agent request just to produce documentation screenshots.
- Keep alt text and captions useful to readers who cannot see an image. Record capture context and any edits here.

## Diagram

The README connection diagram is an authored explanation of the intended deployment: one local Cursor installation with separate SSH windows, each connected to a devbox with its own working Codex extension. It is not evidence of live multi-host testing.

## Before/after captures — 7 September 2026

The screenshots show Cursor 3.18.25 on macOS connected to one Linux SSH devbox, using the harmless [demo project](demo-project/README.md) included in this repository. The local `verify` command confirmed both installed Cursor bundles matched the final folder-drop patch.

- **Before:** the starting demo workspace has Codex collapsed in the left Explorer sidebar, the sample Python file in the editor, and Cursor's native agent pane on the right.
- **After:** the same project has its README in the center and a full-height Codex editor pane on the right. The user performed a real drag of `src`, explicitly confirmed the attachment, and independently sent a short demo message. The capture shows the resulting folder-reference chip and Codex's acknowledgement. The screenshot-taking agent did not submit a prompt.
- The user arranged the UI manually because macOS blocked scripted clicks. Captures used the user-approved macOS screenshot command. Local pixel tools applied opaque redactions, cropping, resizing, labels, and outlines. No generated or reconstructed UI is used.

This is a comparison of the starting workspace and the configured workflow, **not an unpatched-versus-patched test**. The folder patch was present in both captures. These captures preceded the automatic pane companion: their layout was arranged manually. The companion now opens that layout at startup; the folder patch itself still does not move panes. The before image does not establish that every stock version of Codex lacks folder context.

| Asset | Processing |
| --- | --- |
| `before-default-layout.png` | Title/status strips cropped; Explorer SSH suffix replaced with a visible `[SSH hidden]` label. |
| `after-configured-layout.png` | Same crop and SSH redaction; unrelated chat titles covered with an opaque `Chat history hidden` label. The generic temporary demo path and deliberate demo exchange remain visible. |
| `before-after.png` | The two redacted screenshots placed side by side, with explanatory labels and outlines around the actual Codex regions and folder chip. |
| `folder-attachment.png` | Detail crop of the actual folder-reference chip and acknowledgement in the after screenshot. |

The final pixels were reviewed and PNG metadata was omitted. Unredacted captures stay outside the repository. These September 7 captures establish evidence on the first Linux host; see the later check below for the second host.

## Fresh-session captures and sharing slides — 8 September 2026

`fresh-session-verified.png` shows a newly opened harmless demo workspace on a second Linux SSH devbox. Companion 0.1.1 opened the right pane automatically, the saved login remained available, and the user performed and confirmed a real `src` folder drop. The capture shows the attachment before any message was sent. The title and status strips were cropped, and the Explorer connection label was replaced with `[SSH hidden]`. Cursor's integrity warning remains visible. `folder-in-composer.png` is a detail crop of that same composer. Neither capture adds or reconstructs UI elements.

The portrait slides in `social/` adapt the earlier redacted before/after screenshots and the new composer close-up for phone viewing. Slide text remains editable in the PowerPoint release asset. Slides 1–2 compare the manually arranged September 7 demo; slide 3 uses the September 8 attachment. The PDF and PNGs preserve this distinction in their captions. The presentation adds explanatory text and uses the screenshots as evidence; it contains no generated product UI.
