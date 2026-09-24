# TensorNote for VS Code 中文使用手册

本文适用于 TensorNote VS Code Extension `0.3.x`。

## 1. TensorNote 在 VS Code 中做什么

TensorNote 把一个普通 VS Code 文件夹增强为科研学习 Workspace，同时保持 Markdown-first：

- Markdown、附件和可选的 `tensornote.yaml` 是可移植事实来源。
- TensorNote Reader 负责阅读排版和 Sidecar 入口。
- Derivation 在右侧 Webview 显示。
- Jupyter Sidecar 在右侧打开原生 VS Code Notebook。
- Explorer、Search、Git、Python 环境、Kernel 选择与 Notebook 执行继续由 VS Code 及其官方扩展负责。

TensorNote 不提供独立文件树，不复制 Git UI，不创建 Python 环境，也不自行启动或实现 Kernel。

## 2. 安装与依赖

### 2.1 安装插件

推荐从 VS Code Marketplace 安装：

1. 在 VS Code 打开 **扩展**。
2. 搜索 **TensorNote**。
3. 确认扩展标识符是 `aaronchou313.tensornote-vscode`，然后点击 **安装**。
4. 安装或升级后执行 **Developer: Reload Window**。

也可以直接打开 [TensorNote 的 VS Code Marketplace 页面](https://marketplace.visualstudio.com/items?itemName=aaronchou313.tensornote-vscode)。

离线安装时，从 [GitHub Releases](https://github.com/AaronChou313/tensornote-vscode/releases/latest) 下载 `.vsix`，然后在扩展面板选择 **… → 从 VSIX 安装…**。

命令行安装：

```bash
code --install-extension tensornote-vscode-0.3.1.vsix --force
```

### 2.2 Jupyter 可选依赖

只阅读 Markdown 或 Derivation 不需要 Python。若要运行 Jupyter Sidecar，请安装：

- Microsoft Python Extension
- Microsoft Jupyter Extension
- 一个由你自己管理、可被 VS Code 识别的 Python 环境

TensorNote 不会替你安装依赖、创建环境或自动选择 Kernel。

## 3. 创建或识别 Workspace

TensorNote 对每个 VS Code Workspace Folder 独立检测，优先级如下：

1. Workspace/Workspace Folder 设置 `tensornote.enabled`。
2. 文件夹根目录中的 `tensornote.yaml`。
3. Markdown 文件中的 `:::tensornote` Sidecar。

显式设置 `false` 会禁用当前 Workspace；设置 `true` 会强制启用；未设置时进入自动检测。用户全局级别的启用值不会接管其他项目。

推荐目录：

```text
my-notes/
├── .vscode/
│   └── settings.json
├── tensornote.yaml
├── notes/
│   ├── README.md
│   └── probability.md
└── assets/
    └── figures/
```

最小 `tensornote.yaml`：

```yaml
schemaVersion: 1
workspace:
  name: My Research Notes
content:
  root: notes
assets:
  root: assets
features:
  executable: false
```

`features.executable: false` 不影响阅读。首次打开 Jupyter Sidecar 时，TensorNote 会请求本机执行许可；代码仍然只有在你点击 Notebook 的运行按钮后才会执行。

## 4. 打开 Reader

有四种方式：

1. 打开 Markdown 后，点击编辑器标题栏的书本按钮。
2. 打开命令面板，执行 **TensorNote: Open Current File**。
3. 在 Explorer 右键 Markdown，选择 TensorNote 打开命令。
4. 对 Markdown 使用 **Open With… → TensorNote Reader**。

要回到源码编辑器，点击 Reader 顶部的 **Source**，或执行 **TensorNote: Open Markdown Source**。

普通文件夹里的普通 Markdown 不会被自动接管。若文件夹既没有 Manifest，也没有 Sidecar，可在 Workspace Settings 中设置：

```json
{
  "tensornote.enabled": true
}
```

## 5. TensorNote Activity Bar

安装后，VS Code 左侧 Activity Bar 会出现 TensorNote 标志。它是状态和配置中心，不是文件管理器。

状态区显示：

- 当前 Workspace 名称与识别状态
- Markdown 笔记数量
- Reader 是手动模式还是 Workspace 默认模式
- Derivation 数量
- 可运行与无效的 Jupyter Sidecar 数量
- Microsoft Jupyter Extension 是否可用

操作区提供：

- **Open Current File**：用 Reader 打开当前 Markdown
- **Use Reader by Default / Use Manual Reader**：切换当前 Workspace 的默认打开方式
- **Export Current Note to PDF**：打开打印预览
- **Open Settings**：打开 TensorNote 设置
- **Documentation**：打开项目文档
- **Refresh Workspace Status**：重新扫描 Workspace

## 6. Workspace 默认 Reader

推荐从 Activity Bar 选择 **Use Reader by Default**。等价设置为：

```json
{
  "tensornote.defaultReader": true
}
```

TensorNote 只在当前 Workspace/Workspace Folder 的 `workbench.editorAssociations` 中维护：

```json
{
  "workbench.editorAssociations": {
    "*.md": "tensornote.reader"
  }
}
```

它不会改写 VS Code 用户全局设置，也不会影响其他项目。选择 **Use Manual Reader** 后，插件只移除自己拥有的 `*.md` 关联。

## 7. Derivation Sidecar

Derivation 适合公式推导、证明、补充解释和较长附录：

````markdown
:::tensornote{type="derivation" id="gradient-proof" title="梯度推导"}
设损失函数为

$$
L(w)=\frac{1}{n}\sum_{i=1}^{n}(x_i^T w-y_i)^2
$$

这里继续写完整 Markdown 推导。
:::
````

要求：

- `type` 必须是 `derivation`。
- `id` 在同一篇笔记内必须唯一，建议只使用英文、数字和连字符。
- `title` 可选；未提供时使用 `id`。
- Sidecar 必须用独占一行的 `:::` 结束，且不能嵌套。

点击 Reader 中的 Derivation 卡片后，内容会在编辑器右侧打开。它不会生成第二份知识文件。

## 8. Jupyter Sidecar

Jupyter Sidecar 内可以包含一个或多个 Python Cell：

````markdown
:::tensornote{type="jupyter" id="linear-regression" title="线性回归实验"}
```python title="准备数据"
import numpy as np

x = np.arange(10)
y = 2 * x + 1
```

```python title="拟合"
np.polyfit(x, y, deg=1)
```
:::
````

使用流程：

1. 点击 Reader 中的 Jupyter 卡片。
2. 若 Workspace 尚未受信任，先按 VS Code 提示管理 Workspace Trust。
3. 首次使用时确认 TensorNote 的 Workspace 执行许可。
4. 右侧打开原生 Notebook。
5. 点击 **Select Kernel**，选择你已有的 Python 环境。
6. 手动运行需要的 Cell。

安全边界：

- TensorNote 不会因为打开笔记而自动执行 Python。
- TensorNote 不会安装包、创建环境、启动私有 Kernel 或保存凭据。
- Notebook 是由 Markdown Sidecar 临时生成的会话视图。
- 运行输出不会回写 Markdown；关闭临时 Notebook 后可能丢失。
- 若 Markdown 中的 Cell 源码发生变化，再次打开时会生成匹配新源码的 Notebook。

有效代码围栏必须是闭合的 `python` 围栏。其他语言不会作为可执行 Cell。`python exec` 仍可被识别，但执行始终由原生 Notebook 中的用户操作触发。

## 9. 导出 PDF

1. 打开需要导出的 TensorNote Markdown。
2. 在 Activity Bar 选择 **Export Current Note to PDF**。
3. 检查右侧 PDF Preview。
4. 点击 **Print / Save as PDF**。
5. 在系统打印对话框选择保存为 PDF。

导出时 Derivation 与 Jupyter 源码会按原位置展开，但不会执行 Python，也不会包含 Notebook 的临时运行输出。Markdown 文件不会被改写。

## 10. 设置参考

```json
{
  "tensornote.enabled": true,
  "tensornote.defaultReader": true,
  "tensornote.sidecar.enabled": true,
  "tensornote.jupyter.enabled": true,
  "tensornote.reader.maxWidth": 920
}
```

| 设置 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `tensornote.enabled` | `boolean` 或未设置 | 自动 | 控制当前 Workspace 是否启用 TensorNote |
| `tensornote.defaultReader` | `boolean` | `false` | 当前 Workspace 默认使用 Reader |
| `tensornote.sidecar.enabled` | `boolean` | `true` | 渲染两种 Sidecar |
| `tensornote.jupyter.enabled` | `boolean` | `true` | 允许打开 Jupyter Sidecar |
| `tensornote.reader.maxWidth` | `number` | `920` | 阅读区域最大宽度，范围 640–1400 px |

## 11. 常见问题

### 点击 Jupyter 卡片后提示安装扩展

安装 Microsoft Jupyter Extension，然后执行 **Developer: Reload Window**。Python 环境由 Microsoft Python/Jupyter 扩展发现。

### Notebook 已打开，但不能运行

点击右上角 **Select Kernel**。若没有环境可选，请先在系统或你惯用的环境工具中创建 Python 环境，再让 VS Code Python 扩展识别；TensorNote 不负责此步骤。

### Activity Bar 显示 invalid Jupyter

检查 Sidecar 中是否存在完整、闭合的 `python` 代码围栏，并确认 Sidecar 的结束 `:::` 独占一行。Reader 顶部也会给出具体行号和诊断。

### Markdown 仍以源码打开

这是默认行为。使用 **Open With → TensorNote Reader**，或为当前 Workspace 启用 `tensornote.defaultReader`。启用后重新打开已有标签页。

### 普通 Markdown 无法进入 Reader

TensorNote 只允许被识别的 Workspace 或包含 Sidecar 的单文件进入 Reader。添加 `tensornote.yaml`，或在 Workspace Settings 设置 `tensornote.enabled: true`。

### 修改 `tensornote.yaml` 或 Sidecar 后状态未更新

文件监听通常会自动刷新；也可点击 Activity Bar 标题或操作区中的刷新按钮。

### 想保存 Notebook 输出

当前版本坚持 Markdown 为唯一知识源，不把运行输出写回 Markdown。若输出需要长期保存，请在原生 Notebook 中另存 `.ipynb`，或将结果导出为图片/数据文件并在 Markdown 中引用。

## 12. 升级与卸载

升级：下载新版本 VSIX，使用 **从 VSIX 安装…** 覆盖安装，再 Reload Window。

卸载前若启用了 Workspace 默认 Reader，建议先在 TensorNote Activity Bar 选择 **Use Manual Reader**。也可以手动删除当前 Workspace 设置中的：

```json
"*.md": "tensornote.reader"
```

卸载扩展不会删除任何 Markdown、附件、`tensornote.yaml`、Python 环境或 Git 历史。

## 13. 隐私与安全

- 插件本地读取当前 VS Code Workspace 中用于展示的 Markdown、附件与 Manifest。
- 不要求 TensorNote 账户，也不上传笔记。
- 不在知识库中保存 Token、密码、Cookie、私钥或扩展 Secret。
- Jupyter 代码的风险与任何本地 Notebook 相同；只运行你信任的 Workspace 和代码。
