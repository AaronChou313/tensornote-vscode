# TensorNote for VS Code

TensorNote is a Markdown-first research and learning workspace for VS Code. It adds a focused Reader, Derivation Sidecars, and native Jupyter notebooks while leaving files, search, Git, Python environments, and kernels to VS Code and its existing extensions.

The default README and [complete user guide](docs/USER_GUIDE.zh-CN.md) are currently available in Chinese.

## Features

- A Markdown Custom Editor with math, Mermaid, code highlighting, images, and callouts.
- Workspace detection from Workspace settings, `tensornote.yaml`, or `:::tensornote` Sidecars.
- Derivation Sidecars displayed beside the Reader.
- Jupyter Sidecars opened as native VS Code notebooks through the Microsoft Jupyter extension.
- A native Activity Bar status and configuration center.
- Workspace-only default Reader association and print/PDF preview.

## Install

Download the VSIX from [GitHub Releases](https://github.com/AaronChou313/tensornote-vscode/releases/latest), then use **Extensions → … → Install from VSIX…** in VS Code. Reload the window after installation.

```bash
code --install-extension tensornote-vscode-0.3.0.vsix --force
```

TensorNote never manages Python environments or kernels. Install the Microsoft Python and Jupyter extensions separately when executable Sidecars are needed.

## Development

```bash
pnpm install
pnpm check
pnpm package
```

This repository is standalone and has no source dependency on TensorNote Desktop.
