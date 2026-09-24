# TensorNote for VS Code v0.3.0

这是 TensorNote VS Code Extension 独立仓库的首个公开发行版。

## 主要功能

- TensorNote Activity Bar Workspace 状态与配置中心。
- Workspace 设置、`tensornote.yaml`、Sidecar 三级检测机制。
- Markdown Custom Editor Reader，支持数学公式、Mermaid、代码、图片和 Callout。
- Derivation Sidecar 右侧阅读。
- Jupyter Sidecar 通过 Microsoft Jupyter Extension 打开原生 Notebook。
- Workspace-only 默认 Reader，不污染其他项目的 Markdown 行为。
- 打印/PDF 预览，展开 Sidecar 但不执行 Python。
- 中文 README、完整中文使用手册和独立发行维护说明。

## 安装

下载 `tensornote-vscode-0.3.0.vsix`，在 VS Code 中选择 **扩展 → … → 从 VSIX 安装…**。安装后执行 **Developer: Reload Window**。

Jupyter Sidecar 需要另行安装 Microsoft Python 与 Jupyter 扩展；TensorNote 不管理 Python 环境或 Kernel。
