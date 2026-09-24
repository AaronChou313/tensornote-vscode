import * as vscode from 'vscode'
import type { DerivationSidecar } from '../tensornote/types'
import { openReaderLink } from '../reader/link'
import { WebviewRenderer } from '../reader/WebviewRenderer'

interface WebviewMessage {
  type?: string
  href?: string
}

export class DerivationPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined
  private messageSubscription: vscode.Disposable | undefined

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly renderer: WebviewRenderer,
  ) {}

  show(documentUri: vscode.Uri, sidecar: DerivationSidecar) {
    this.panel?.dispose()
    const folder = vscode.workspace.getWorkspaceFolder(documentUri)
    const localResourceRoots = [this.extensionUri, folder?.uri ?? vscode.Uri.joinPath(documentUri, '..')]
    const panel = vscode.window.createWebviewPanel(
      'tensornote.derivation',
      sidecar.title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots },
    )
    this.panel = panel
    panel.webview.html = this.renderer.renderDerivation(panel.webview, documentUri, sidecar)
    this.messageSubscription = panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type === 'openSource') await vscode.commands.executeCommand('vscode.openWith', documentUri, 'default')
      if (message.type === 'openLink' && typeof message.href === 'string') await openReaderLink(documentUri, message.href)
    })
    panel.onDidDispose(() => {
      this.messageSubscription?.dispose()
      this.messageSubscription = undefined
      if (this.panel === panel) this.panel = undefined
    })
  }

  dispose() {
    this.messageSubscription?.dispose()
    this.panel?.dispose()
  }
}
