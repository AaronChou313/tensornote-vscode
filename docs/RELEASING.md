# 发行维护说明

TensorNote VS Code Extension 使用独立仓库、独立版本号和独立 VSIX，不跟随 TensorNote Desktop 版本。

## 本地发行门

1. 更新 `package.json` 与 `CHANGELOG.md` 中的版本和说明。
2. 运行 `pnpm install --frozen-lockfile`。
3. 运行 `pnpm check`。
4. 运行 `pnpm package`，并实际安装生成的 VSIX。
5. 在浅色和深色 VS Code 主题中检查 Activity Bar、Reader、Derivation 和 Jupyter Notebook 打开路径。
6. 运行 `git diff --check`，确认工作区干净后提交。

## GitHub Release

版本 `X.Y.Z` 对应不可移动的 annotated tag `vX.Y.Z`。先推送 `main` 并等待 CI 通过，再创建并推送 tag。GitHub Release 至少附带：

- `tensornote-vscode-X.Y.Z.vsix`
- `SHA256SUMS`
- 中文发行说明

发布后重新下载附件，核对 SHA-256，并用 VS Code 的 **Install from VSIX…** 完成一次干净安装。

## VS Code Marketplace

Marketplace 发布使用发行主体自己的 Azure DevOps Personal Access Token，并通过安全的 CI Secret 或本机环境变量传入。不得把 Token 写入仓库、Markdown、日志或截图。发布命令为：

```bash
pnpm exec vsce publish
```

Marketplace 发布与 GitHub Release 使用同一个 `package.json` 版本；已发布版本不得覆盖，只能递增版本号。
