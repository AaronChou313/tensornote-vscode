import * as vscode from 'vscode'
import type { JupyterSidecar } from '../tensornote/types'
import type { TensorNoteDocumentContext } from '../workspace/detector'
import { ExecutionPolicy } from './ExecutionPolicy'
import { createSidecarNotebookModel } from './notebookModel'

const jupyterExtensionId = 'ms-toolsai.jupyter'
const jupyterNotebookType = 'jupyter-notebook'

interface OpenNotebook {
  document: vscode.NotebookDocument
  signature: string
}

export class JupyterBridge implements vscode.Disposable {
  private readonly openNotebooks = new Map<string, OpenNotebook>()
  private readonly closeSubscription: vscode.Disposable

  constructor(private readonly executionPolicy: ExecutionPolicy) {
    this.closeSubscription = vscode.workspace.onDidCloseNotebookDocument((closed) => {
      for (const [key, value] of this.openNotebooks) {
        if (value.document === closed) this.openNotebooks.delete(key)
      }
    })
  }

  private sidecarKey(documentUri: vscode.Uri, sidecarId: string) {
    return `${documentUri.toString()}#${sidecarId}`
  }

  private async ensureJupyterAvailable() {
    const extension = vscode.extensions.getExtension(jupyterExtensionId)
    if (!extension) {
      const action = await vscode.window.showErrorMessage(
        'TensorNote Jupyter Sidecars require the Microsoft Jupyter extension.',
        'Install Jupyter',
      )
      if (action === 'Install Jupyter') {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', jupyterExtensionId)
      }
      return false
    }
    if (!extension.isActive) await extension.activate()
    return true
  }

  async open(documentUri: vscode.Uri, sidecar: JupyterSidecar, context: TensorNoteDocumentContext) {
    if (sidecar.cells.length === 0) {
      void vscode.window.showErrorMessage(
        `TensorNote Jupyter Sidecar “${sidecar.title}” has no valid Python cells. Use a closed \`\`\`python code fence inside the Sidecar.`,
      )
      return
    }
    if (!(await this.executionPolicy.ensureAllowed(documentUri, context))) return
    if (!(await this.ensureJupyterAvailable())) return

    const noteLabel = vscode.workspace.asRelativePath(documentUri, false)
    const model = createSidecarNotebookModel(noteLabel, sidecar)
    const key = this.sidecarKey(documentUri, sidecar.id)
    const existing = this.openNotebooks.get(key)
    if (existing && !existing.document.isClosed && existing.signature === model.signature) {
      await vscode.window.showNotebookDocument(existing.document, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
        selections: [new vscode.NotebookRange(1, 2)],
      })
      return
    }

    const cells = model.cells.map((cell) => {
      const data = new vscode.NotebookCellData(
        cell.kind === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
        cell.value,
        cell.languageId,
      )
      data.metadata = cell.metadata
      return data
    })
    const notebookData = new vscode.NotebookData(cells)
    notebookData.metadata = model.metadata
    const notebook = await vscode.workspace.openNotebookDocument(jupyterNotebookType, notebookData)
    this.openNotebooks.set(key, { document: notebook, signature: model.signature })
    await vscode.window.showNotebookDocument(notebook, {
      viewColumn: vscode.ViewColumn.Beside,
      preview: false,
      selections: [new vscode.NotebookRange(1, 2)],
    })
  }

  dispose() {
    this.closeSubscription.dispose()
    this.openNotebooks.clear()
  }
}
