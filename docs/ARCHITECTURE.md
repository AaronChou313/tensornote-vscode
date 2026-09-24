# TensorNote VS Code architecture

## Boundary

This repository owns the VS Code extension only. It implements the portable TensorNote Workspace Schema v1 and the two Sidecar syntaxes locally, without importing TensorNote Desktop application code.

Markdown, assets, and optional `tensornote.yaml` remain the only portable Workspace source of truth. Extension permissions and runtime notebook outputs stay in VS Code-local state.

## Native capability map

| Concern | Owner |
|---|---|
| Files and folders | VS Code Explorer |
| Search | VS Code Search |
| Source control | VS Code Git/SCM |
| Python discovery and environments | Microsoft Python tooling |
| Kernels and notebook execution | Microsoft Jupyter extension |
| Markdown reading and Sidecar triggers | TensorNote Reader custom editor |
| Workspace status and settings shortcuts | TensorNote Activity Bar Tree View |

## Detection

Each Workspace folder is evaluated independently:

1. Explicit Workspace/Folder `tensornote.enabled` setting.
2. Root `tensornote.yaml`.
3. Markdown scan for `:::tensornote`.

The scan is bounded to 2,000 Markdown files and skips common generated/environment directories. Files larger than 2 MiB are counted as notes but not parsed for Sidecars.

## Reader association

The custom editor has `option` priority and therefore does not globally capture Markdown. When `tensornote.defaultReader` is explicitly enabled for an active TensorNote Workspace, the extension writes only the `*.md` entry of Workspace/Folder `workbench.editorAssociations`. Disabling the setting removes only an association owned by TensorNote.

## Execution

Jupyter Sidecars become untitled native `jupyter-notebook` documents. TensorNote performs no automatic execution. VS Code Workspace Trust, future-schema downgrade, manifest execution permission, and a device-local override are checked before a notebook is opened.

## PDF direction

PDF export uses the same renderer in `print` mode. Derivation and Jupyter Sidecars are expanded in source order, Python is never executed, and runtime outputs are excluded. The current command opens a print preview and delegates PDF creation to the system print dialog; a future exporter can replace only the final transport without changing the render model.
