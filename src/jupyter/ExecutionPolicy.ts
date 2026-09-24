import * as vscode from 'vscode'
import type { TensorNoteDocumentContext } from '../workspace/detector'

const permissionPrefix = 'tensornote.execution.allowed:'

export class ExecutionPolicy {
  constructor(private readonly workspaceState: vscode.Memento) {}

  private scopeKey(documentUri: vscode.Uri, context: TensorNoteDocumentContext) {
    return `${permissionPrefix}${context.workspace?.root.toString() ?? documentUri.toString()}`
  }

  async ensureAllowed(documentUri: vscode.Uri, context: TensorNoteDocumentContext) {
    if (!vscode.workspace.isTrusted) {
      const action = await vscode.window.showWarningMessage(
        'TensorNote cannot open executable Jupyter Sidecars in an untrusted VS Code Workspace.',
        'Manage Workspace Trust',
      )
      if (action === 'Manage Workspace Trust') await vscode.commands.executeCommand('workbench.trust.manage')
      return false
    }
    if (context.workspace?.compatibility.status === 'future') {
      void vscode.window.showErrorMessage('This Workspace uses a future TensorNote schema. Jupyter execution is disabled to preserve compatibility.')
      return false
    }
    if (context.workspace?.manifest.features.executable === true) return true

    const key = this.scopeKey(documentUri, context)
    if (this.workspaceState.get<boolean>(key, false)) return true
    const action = await vscode.window.showWarningMessage(
      'Allow executable Python Sidecars for this TensorNote Workspace?',
      {
        modal: true,
        detail: 'TensorNote will open the cells in VS Code’s native Jupyter notebook. Code runs only when you press Run. This permission is stored locally and does not modify tensornote.yaml.',
      },
      'Enable Jupyter Sidecars',
    )
    if (action !== 'Enable Jupyter Sidecars') return false
    await this.workspaceState.update(key, true)
    return true
  }
}
