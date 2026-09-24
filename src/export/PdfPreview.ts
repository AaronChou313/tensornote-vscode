import * as vscode from 'vscode'
import { parseReaderDocument } from '../domain/document'
import { WebviewRenderer } from '../reader/WebviewRenderer'
import { WorkspaceDetector } from '../workspace/detector'

export class PdfPreview {
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly detector: WorkspaceDetector,
    private readonly renderer: WebviewRenderer,
  ) {}

  async show(documentUri: vscode.Uri) {
    const document = await vscode.workspace.openTextDocument(documentUri)
    const context = await this.detector.inspect(documentUri, document.getText())
    if (!context.eligible) {
      void vscode.window.showInformationMessage('The current Markdown file is not part of an enabled TensorNote Workspace.')
      return
    }
    const panel = vscode.window.createWebviewPanel(
      'tensornote.pdfPreview',
      `${documentUri.path.split('/').pop() ?? 'TensorNote'} · PDF Preview`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri, vscode.Uri.joinPath(documentUri, '..')],
      },
    )
    const readerDocument = parseReaderDocument(documentUri.path, document.getText(), {
      sidecarEnabled: context.settings.sidecarEnabled,
    })
    panel.webview.html = this.renderer.renderPrintPreview(panel.webview, documentUri, readerDocument, context)
  }
}
