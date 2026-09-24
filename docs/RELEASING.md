# 发行维护说明

TensorNote VS Code Extension 使用独立仓库、独立版本号和独立 VSIX，不跟随 TensorNote Desktop 版本。

## 固定发行顺序

每个版本严格按照以下顺序发行：

1. 完成代码、资源和功能更新。
2. 递增 `package.json` 版本，并同步更新 `CHANGELOG.md`、中英文 README、中文使用手册及其他受影响文档。
3. 运行 `pnpm install --frozen-lockfile`、`pnpm check` 和 `git diff --check`。
4. 运行 `pnpm package`，生成该版本唯一的 `tensornote-vscode-X.Y.Z.vsix`。
5. 实际安装该 VSIX，并在浅色和深色 VS Code 主题中检查扩展图标、Activity Bar、Reader、Derivation 和 Jupyter Notebook 打开路径。
6. 提交并推送 `main` 到 GitHub，等待 CI 通过；需要 GitHub Release 时，从该提交创建不可移动的 annotated tag，并上传同一个 VSIX。
7. 最后在 VS Code Marketplace 管理页面手动上传同一个 VSIX，并等待验证完成。
8. 在 Marketplace 页面核对版本、Logo、README 和安装结果。

VSIX 是自包含归档，里面的 README 是打包时的快照，不会跟随 GitHub README 自动更新。生成 VSIX 后若又修改了包内文档，必须在 Marketplace 上传前重新打包；如果该版本已经发布，则不得重打或覆盖，应递增 Patch 版本后重新执行完整流程。

## GitHub Release

版本 `X.Y.Z` 对应不可移动的 annotated tag `vX.Y.Z`。先推送 `main` 并等待 CI 通过，再创建并推送 tag。GitHub Release 至少附带：

- `tensornote-vscode-X.Y.Z.vsix`
- `SHA256SUMS`
- 中文发行说明

发布后重新下载附件，核对 SHA-256，并用 VS Code 的 **Install from VSIX…** 完成一次干净安装。

## VS Code Marketplace

当前项目采用 Marketplace 网页管理后台手动上传 VSIX，不配置 Azure DevOps Personal Access Token，也不从 CI 自动发布。登录发行者账号后选择对应扩展，上传已经完成本地验证且已推送 GitHub 的同一个 VSIX。

Marketplace 发布与 GitHub Release 使用同一个 `package.json` 版本；已发布版本不得覆盖，只能递增版本号。
