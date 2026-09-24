# Changelog

## 0.3.1 — 品牌图标更新

- 更新扩展商店 Logo，采用新的文档轮廓设计。
- 重绘 Activity Bar 单色图标，提升小尺寸和不同主题下的辨识度。

## 0.3.0 — 首个独立发行版

- Split the extension into a standalone project and repository boundary.
- Add a native TensorNote Activity Bar Workspace status view.
- Detect Workspace mode from Workspace Settings, `tensornote.yaml`, or Markdown Sidecars in that order.
- Add Workspace-scoped Reader, Sidecar, and Jupyter settings.
- Maintain an optional Workspace-only Markdown Reader association.
- Add a print/PDF preview that expands Sidecars without executing Python.
- Keep Reader usable when the Microsoft Jupyter extension is not installed.
- Add the official TensorNote logo, a theme-safe Activity Bar mark, a Chinese README, and a complete Chinese user guide.

## 0.2.0

- Open Jupyter Sidecars as untitled native VS Code notebooks beside the Reader.
- Reuse the Microsoft Jupyter extension for kernel selection, execution, output, interrupt, and restart.
- Require VS Code Workspace trust and explicit TensorNote execution permission.
- Reuse unchanged Sidecar notebooks so runtime outputs remain available during the session.
- Accept Python fences with or without whitespace before the language while keeping the executable language strict.
- Show actionable diagnostics instead of opening an empty notebook when a Sidecar has no valid Python cell.

## 0.1.0

- Add TensorNote Workspace detection and an optional Markdown Custom Editor.
- Render TensorNote Markdown with Sidecar triggers.
- Open Derivation Sidecars in a panel beside the Reader.
- Reserve Jupyter execution for a VS Code Notebook/Jupyter API bridge.
- Add a print render mode for future PDF export.
