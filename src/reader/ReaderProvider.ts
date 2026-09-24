import * as vscode from 'vscode'
import type { DerivationSidecar } from '../tensornote/types'
import { parseReaderDocument } from '../domain/document'
import { JupyterBridge } from '../jupyter/JupyterBridge'
import { DerivationPanel } from '../sidecar/DerivationPanel'
import { WorkspaceDetector } from '../workspace/detector'
import { openReaderLink } from './link'
import { WebviewRenderer } from './WebviewRenderer'

interface ReaderMessage {
  type?: string
  id?: string
  href?: string
}

export class ReaderProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'tensornote.reader'

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly detector: WorkspaceDetector,
    private readonly renderer: WebviewRenderer,
    private readonly derivationPanel: DerivationPanel,
    private readonly jupyterBridge: JupyterBridge,
  ) {}

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel) {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri, folder?.uri ?? vscode.Uri.joinPath(document.uri, '..')],
    }

    const render = async () => {
      const raw = document.getText()
      const context = await this.detector.inspect(document.uri, raw)
      panel.webview.html = context.eligible
        ? this.renderer.renderReader(panel.webview, document.uri, parseReaderDocument(document.uri.path, raw, {
            sidecarEnabled: context.settings.sidecarEnabled,
          }), context)
        : this.renderer.renderUnavailable(panel.webview, document.uri)
    }

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString()) void render()
    })
    const configurationSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('tensornote.reader.maxWidth')
        || event.affectsConfiguration('tensornote.enabled')
        || event.affectsConfiguration('tensornote.sidecar.enabled')
        || event.affectsConfiguration('tensornote.jupyter.enabled')
      ) void render()
    })
    const messageSubscription = panel.webview.onDidReceiveMessage(async (message: ReaderMessage) => {
      if (message.type === 'openSource') {
        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', panel.viewColumn)
        return
      }
      if (message.type === 'openLink' && typeof message.href === 'string') {
        await openReaderLink(document.uri, message.href)
        return
      }
      if ((message.type === 'openDerivation' || message.type === 'openJupyter') && typeof message.id === 'string') {
        const documentContext = await this.detector.inspect(document.uri, document.getText())
        const readerDocument = parseReaderDocument(document.uri.path, document.getText(), {
          sidecarEnabled: documentContext.settings.sidecarEnabled,
        })
        const sidecar = readerDocument.sidecars.find((candidate) => candidate.id === message.id)
        if (!sidecar) {
          void vscode.window.showWarningMessage(`TensorNote Sidecar “${message.id}” no longer exists in this file.`)
          return
        }
        if (message.type === 'openDerivation' && sidecar.type === 'derivation') {
          this.derivationPanel.show(document.uri, sidecar as DerivationSidecar)
          return
        }
        if (message.type === 'openJupyter' && sidecar.type === 'jupyter') {
          if (!documentContext.settings.jupyterEnabled) {
            void vscode.window.showInformationMessage('Jupyter Sidecars are disabled by the current Workspace setting tensornote.jupyter.enabled.')
            return
          }
          try {
            await this.jupyterBridge.open(document.uri, sidecar, documentContext)
          } catch (error) {
            const messageText = error instanceof Error ? error.message : String(error)
            void vscode.window.showErrorMessage(`TensorNote could not open the Jupyter Sidecar: ${messageText}`)
          }
        }
      }
    })

    panel.onDidDispose(() => {
      changeSubscription.dispose()
      configurationSubscription.dispose()
      messageSubscription.dispose()
    })
    await render()
  }
}
