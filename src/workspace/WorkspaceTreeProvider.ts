import * as vscode from 'vscode'
import type { WorkspaceDetector, WorkspaceSnapshot } from './detector'

type NodeKind = 'workspace-group' | 'actions-group' | 'leaf'

class StatusNode extends vscode.TreeItem {
  constructor(
    label: string,
    readonly kind: NodeKind,
    options: {
      description?: string
      icon?: vscode.ThemeIcon
      command?: vscode.Command
      tooltip?: string
    } = {},
  ) {
    super(label, kind === 'leaf' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded)
    this.description = options.description
    this.iconPath = options.icon
    this.command = options.command
    this.tooltip = options.tooltip
  }
}

function action(label: string, command: string, icon: string, ...args: unknown[]) {
  return new StatusNode(label, 'leaf', {
    icon: new vscode.ThemeIcon(icon),
    command: { command, title: label, arguments: args },
  })
}

export class WorkspaceTreeProvider implements vscode.TreeDataProvider<StatusNode>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<StatusNode | undefined>()
  private readonly subscription: vscode.Disposable

  readonly onDidChangeTreeData = this.emitter.event

  constructor(private readonly detector: WorkspaceDetector) {
    this.subscription = detector.onDidChange(() => this.emitter.fire(undefined))
  }

  getTreeItem(element: StatusNode) {
    return element
  }

  getChildren(element?: StatusNode): StatusNode[] {
    if (!element) {
      return [
        new StatusNode('Workspace', 'workspace-group', { icon: new vscode.ThemeIcon('beaker') }),
        new StatusNode('Actions', 'actions-group', { icon: new vscode.ThemeIcon('run-all') }),
      ]
    }
    const snapshot = this.detector.currentSnapshot()
    if (element.kind === 'workspace-group') return this.workspaceItems(snapshot)
    if (element.kind === 'actions-group') return this.actionItems(snapshot)
    return []
  }

  private workspaceItems(snapshot?: WorkspaceSnapshot) {
    if (!snapshot) {
      return [new StatusNode('No folder is open', 'leaf', {
        icon: new vscode.ThemeIcon('info'),
        tooltip: 'Open a folder or VS Code Workspace to enable TensorNote Workspace detection.',
      })]
    }
    const activeLabel = snapshot.active ? 'TensorNote Workspace' : snapshot.reason === 'disabled' ? 'Disabled by Workspace setting' : 'Not detected'
    const noteCount = `${snapshot.noteCount}${snapshot.noteCountLimited ? '+' : ''}`
    const jupyterInstalled = Boolean(vscode.extensions.getExtension('ms-toolsai.jupyter'))
    return [
      new StatusNode(snapshot.manifest.workspace.name || snapshot.folder.name, 'leaf', {
        description: snapshot.folder.name,
        icon: new vscode.ThemeIcon('root-folder'),
        tooltip: snapshot.folder.uri.fsPath,
      }),
      new StatusNode(activeLabel, 'leaf', {
        icon: new vscode.ThemeIcon(snapshot.active ? 'pass-filled' : snapshot.reason === 'disabled' ? 'circle-slash' : 'info'),
        tooltip: snapshot.warning,
      }),
      new StatusNode('Notes', 'leaf', { description: noteCount, icon: new vscode.ThemeIcon('files') }),
      new StatusNode('Reader', 'leaf', {
        description: snapshot.settings.defaultReader ? 'Workspace default' : 'Manual',
        icon: new vscode.ThemeIcon('book'),
      }),
      new StatusNode('Derivation', 'leaf', {
        description: snapshot.settings.sidecarEnabled ? `${snapshot.sidecars.derivation} available` : 'Disabled',
        icon: new vscode.ThemeIcon(snapshot.settings.sidecarEnabled ? 'check' : 'circle-slash'),
      }),
      new StatusNode('Jupyter', 'leaf', {
        description: !snapshot.settings.sidecarEnabled || !snapshot.settings.jupyterEnabled
          ? 'Disabled'
          : jupyterInstalled
            ? snapshot.sidecars.invalidJupyter > 0
              ? `${snapshot.sidecars.jupyter} runnable · ${snapshot.sidecars.invalidJupyter} invalid`
              : `${snapshot.sidecars.jupyter} runnable`
            : 'Extension not installed',
        icon: new vscode.ThemeIcon(
          snapshot.settings.sidecarEnabled
            && snapshot.settings.jupyterEnabled
            && jupyterInstalled
            && snapshot.sidecars.invalidJupyter === 0
            ? 'check'
            : 'warning',
        ),
      }),
    ]
  }

  private actionItems(snapshot?: WorkspaceSnapshot) {
    const items = [
      action('Open Current File', 'tensornote.openCurrentFile', 'book'),
    ]
    if (snapshot) {
      items.push(action(
        snapshot.settings.defaultReader ? 'Use Manual Reader' : 'Use Reader by Default',
        'tensornote.setDefaultReader',
        snapshot.settings.defaultReader ? 'close-all' : 'open-preview',
        !snapshot.settings.defaultReader,
      ))
      if (snapshot.reason === 'disabled') items.push(action('Enable TensorNote Here', 'tensornote.setEnabled', 'check', true))
    }
    items.push(
      action('Export Current Note to PDF', 'tensornote.exportPdf', 'file-pdf'),
      action('Open Settings', 'tensornote.openSettings', 'settings-gear'),
      action('Documentation', 'tensornote.openDocumentation', 'book'),
      action('Refresh Workspace Status', 'tensornote.refreshWorkspace', 'refresh'),
    )
    return items
  }

  dispose() {
    this.subscription.dispose()
    this.emitter.dispose()
  }
}
