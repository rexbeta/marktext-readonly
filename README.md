# MarkText Readonly

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/rexbeta/marktext-readonly?include_prereleases)](https://github.com/rexbeta/marktext-readonly/releases)

MarkText Readonly is a read-only-first fork of
[MarkText](https://github.com/marktext/marktext). Markdown files open as fully rendered,
non-editable documents. Editing is available only after explicitly enabling **View → Edit
Mode**.

> This is an independent community fork and is not an official MarkText release. For the
> original editor, documentation, and project community, visit
> [marktext/marktext](https://github.com/marktext/marktext).

中文简介：这是一个以阅读为默认行为的 MarkText 分支。Markdown 文件打开后只显示渲染结果；
需要修改时，可通过 **View → Edit Mode** 显式进入编辑模式。

## Why this fork?

MarkText is designed primarily as an editor. This fork is intended for people who usually
want to read Markdown without accidentally changing or saving the document, while retaining
MarkText's editing capabilities when they are deliberately requested.

## Read-only mode

Every application session starts in read-only mode:

- Markdown syntax is not exposed during normal reading, including when selecting inline code.
- Text selection, copy, find, internal navigation, and clickable links remain available.
- Save, Save As, replacement, direct typing, Source Code Mode, and sidebar filesystem
  mutations (create, cut/paste, rename, and move to trash) are disabled.
- Images, Mermaid diagrams, math, tables, code blocks, and other supported Markdown content
  are rendered as document content.
- The configured document width is applied immediately, and the scroll position is preserved
  when switching between read-only and Edit Mode.

Enable **View → Edit Mode** to use the original MarkText editor. Disable it to return to the
rendered reader. Edit Mode is intentionally not persisted across application sessions.

## Security scope

Read-only mode is an interaction safeguard against accidental modification; it is not a
security sandbox or a file-permission mechanism. Do not treat untrusted Markdown as safe solely
because it is opened in read-only mode. Links and referenced resources should be reviewed with
the same care as in other document viewers. Remote images and diagrams can make network
requests; in particular, PlantUML uses the server configured in Preferences (the upstream
default is the public `plantuml.com` service).

## Downloads

Prebuilt packages are published on the
[GitHub Releases page](https://github.com/rexbeta/marktext-readonly/releases).
Automatic in-app installation is disabled until releases include a signed, supported update
feed; **Check for Updates** opens this Releases page instead.

The first release provides a macOS Apple Silicon (`arm64`) DMG and ZIP. These community builds
are ad-hoc signed so the application bundle can be verified for integrity, but they are not
Developer ID signed or notarized by Apple. Review the source before installing. If macOS blocks
the first launch, open **System Settings → Privacy & Security** and choose **Open Anyway** only
after confirming that you downloaded the application from this repository.

The application uses its own bundle identifier and product name, so it can coexist with the
official MarkText application.

## Build from source

Prerequisites:

- Node.js 22 LTS (the upstream minimum is Node.js 20.19)
- pnpm 10 or newer
- Platform build tools required by Electron

```bash
git clone https://github.com/rexbeta/marktext-readonly.git
cd marktext-readonly
corepack enable
pnpm install
pnpm typecheck
pnpm test:unit
pnpm build:mac:arm64
```

Other upstream build targets remain available (`build:mac:x64`, `build:win:*`, and
`build:linux`), but only artifacts listed on this fork's Releases page are release-tested by
this project.

## Upstream and contributions

This fork tracks the upstream MarkText codebase and intentionally keeps the read-only changes
focused. Bugs specific to the read-only experience may be reported in this repository. General
MarkText issues and contributions should be directed to the
[upstream project](https://github.com/marktext/marktext) when they also reproduce there.

Before contributing, read the inherited
[contribution guide](.github/CONTRIBUTING.md) and preserve upstream copyright and license
notices.

## License and attribution

MarkText Readonly is distributed under the [MIT License](LICENSE), the same license as MarkText.
The original copyright notices are retained:

- Copyright © 2017-present Luo Ran
- Copyright © 2018-present MarkText Contributors

The software is provided without warranty, as stated in the license. The MarkText name, artwork,
and upstream project identity remain associated with their respective project and contributors;
use of them here does not imply endorsement of this fork.
