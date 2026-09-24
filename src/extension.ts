import * as vscode from 'vscode'
import { PdfPreview } from './export/PdfPreview'
import { ExecutionPolicy } from './jupyter/ExecutionPolicy'
import { JupyterBridge } from './jupyter/JupyterBridge'
import { ReaderProvider } from './reader/ReaderProvider'
import { WebviewRenderer } from './reader/WebviewRenderer'
import { DerivationPanel } from './sidecar/DerivationPanel'
import { WorkspaceDetector } from './workspace/detector'
import { ReaderAssociationManager } from './workspace/ReaderAssociationManager'
import { updateWorkspaceSetting } from './workspace/settings'
import { WorkspaceTreeProvider } from './workspace/WorkspaceTreeProvider'

function activeMarkdownUri(candidate?: vscode.Uri) {
  if (candidate instanceof vscode.Uri && /\.md$/i.test(candidate.path)) return candidate
  const editorUri = vscode.window.activeTextEditor?.document.uri
  if (editorUri && /\.md$/i.test(editorUri.path)) return editorUri
  const activeInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input
  if ((activeInput instanceof vscode.TabInputCustom || activeInput instanceof vscode.TabInputText) && /\.md$/i.test(activeInput.uri.path)) return activeInput.uri
  for (const group of vscode.window.tabGroups.all) {
    const input = group.activeTab?.input
    if ((input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) && /\.md$/i.test(input.uri.path)) return input.uri
  }
  return vscode.window.visibleTextEditors.map((editor) => editor.document.uri).find((uri) => /\.md$/i.test(uri.path))
}

function currentFolder(detector: WorkspaceDetector) {
  return detector.currentSnapshot()?.folder ?? vscode.workspace.workspaceFolders?.[0]
}

export async function activate(context: vscode.ExtensionContext) {
  const detector = new WorkspaceDetector()
  const renderer = new WebviewRenderer(context.extensionUri)
  const derivationPanel = new DerivationPanel(context.extensionUri, renderer)
  const executionPolicy = new ExecutionPolicy(context.workspaceState)
  const jupyterBridge = new JupyterBridge(executionPolicy)
  const readerProvider = new ReaderProvider(context.extensionUri, detector, renderer, derivationPanel, jupyterBridge)
  const workspaceTree = new WorkspaceTreeProvider(detector)
  const associationManager = new ReaderAssociationManager()
  const pdfPreview = new PdfPreview(context.extensionUri, detector, renderer)

  const applyWorkspaceState = async (changedSnapshot = detector.currentSnapshot()) => {
    const currentSnapshot = detector.currentSnapshot()
    await vscode.commands.executeCommand('setContext', 'tensornote.workspaceActive', currentSnapshot?.active === true)
    await vscode.commands.executeCommand('setContext', 'tensornote.defaultReader', currentSnapshot?.settings.defaultReader === true)
    if (changedSnapshot) await associationManager.sync(changedSnapshot)
  }

  context.subscriptions.push(
    detector,
    derivationPanel,
    jupyterBridge,
    workspaceTree,
    detector.onDidChange((snapshot) => void applyWorkspaceState(snapshot)),
    vscode.window.registerTreeDataProvider('tensornote.workspace', workspaceTree),
    vscode.window.registerCustomEditorProvider(ReaderProvider.viewType, readerProvider, {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('tensornote.openCurrentFile', async (candidate?: vscode.Uri) => {
      const uri = activeMarkdownUri(candidate)
      if (!uri || !/\.md$/i.test(uri.path)) {
        void vscode.window.showInformationMessage('Open a Markdown file before starting TensorNote Reader.')
        return
      }
      const activeDocument = vscode.window.activeTextEditor?.document
      const raw = activeDocument?.uri.toString() === uri.toString() ? activeDocument.getText() : undefined
      const inspected = await detector.inspect(uri, raw)
      if (!inspected.eligible) {
        const detail = inspected.reason === 'disabled'
          ? 'TensorNote is disabled by this Workspace setting.'
          : 'Add tensornote.yaml, add a :::tensornote Sidecar, or set tensornote.enabled to true in Workspace Settings.'
        void vscode.window.showInformationMessage(detail)
        return
      }
      await vscode.commands.executeCommand('vscode.openWith', uri, ReaderProvider.viewType)
    }),
    // Backward-compatible command id for 0.1/0.2 keybindings and links.
    vscode.commands.registerCommand('tensornote.openReader', (candidate?: vscode.Uri) => {
      return vscode.commands.executeCommand('tensornote.openCurrentFile', candidate)
    }),
    vscode.commands.registerCommand('tensornote.openSource', async (candidate?: vscode.Uri) => {
      const uri = activeMarkdownUri(candidate)
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'default')
    }),
    vscode.commands.registerCommand('tensornote.setDefaultReader', async (requested?: boolean) => {
      const folder = currentFolder(detector)
      if (!folder) {
        void vscode.window.showInformationMessage('Open a folder before configuring TensorNote Reader.')
        return
      }
      let enabled = requested
      if (enabled === undefined) {
        const selection = await vscode.window.showQuickPick(['Use TensorNote Reader by default', 'Keep manual Open With'], {
          title: 'TensorNote Reader for this Workspace',
        })
        if (!selection) return
        enabled = selection.startsWith('Use TensorNote')
      }
      await updateWorkspaceSetting(folder, 'defaultReader', enabled)
      await detector.refresh(folder)
    }),
    vscode.commands.registerCommand('tensornote.setEnabled', async (requested?: boolean) => {
      const folder = currentFolder(detector)
      if (!folder) return
      let enabled = requested
      if (enabled === undefined) {
        const selection = await vscode.window.showQuickPick([
          'Auto detect TensorNote',
          'Enable TensorNote in this Workspace',
          'Disable TensorNote in this Workspace',
        ], { title: 'TensorNote Workspace mode' })
        if (!selection) return
        enabled = selection.startsWith('Auto') ? undefined : selection.startsWith('Enable')
      }
      await updateWorkspaceSetting(folder, 'enabled', enabled)
      await detector.refresh(folder)
    }),
    vscode.commands.registerCommand('tensornote.refreshWorkspace', () => detector.refreshAll()),
    vscode.commands.registerCommand('tensornote.openSettings', () => {
      return vscode.commands.executeCommand('workbench.action.openSettings', '@ext:aaronchou313.tensornote-vscode')
    }),
    vscode.commands.registerCommand('tensornote.openDocumentation', () => {
      return vscode.env.openExternal(vscode.Uri.parse('https://github.com/AaronChou313/tensornote-vscode#readme'))
    }),
    vscode.commands.registerCommand('tensornote.exportPdf', async () => {
      const uri = activeMarkdownUri()
      if (!uri || !/\.md$/i.test(uri.path)) {
        void vscode.window.showInformationMessage('Open a TensorNote Markdown file before exporting PDF.')
        return
      }
      await pdfPreview.show(uri)
    }),
  )

  await detector.refreshAll()
  await applyWorkspaceState()
}

export function deactivate() {}
