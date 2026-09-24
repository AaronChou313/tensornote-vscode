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

TensorNote is available on the VS Code Marketplace. Open **Extensions** in VS Code, search for **TensorNote**, verify the extension identifier is `aaronchou313.tensornote-vscode`, and select **Install**.

- [Open the VS Code Marketplace page](https://marketplace.visualstudio.com/items?itemName=aaronchou313.tensornote-vscode)
- For offline installation, download the VSIX from [GitHub Releases](https://github.com/AaronChou313/tensornote-vscode/releases/latest), then use **Extensions → … → Install from VSIX…**.

To install a local VSIX from the command line:

```bash
code --install-extension tensornote-vscode-0.3.1.vsix --force
```

TensorNote never manages Python environments or kernels. Install the Microsoft Python and Jupyter extensions separately when executable Sidecars are needed.

## Development

```bash
pnpm install
pnpm check
pnpm package
```

This repository is standalone and has no source dependency on TensorNote Desktop.
