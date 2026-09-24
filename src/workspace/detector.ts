import * as vscode from 'vscode'
import { hasTensorNoteDirective, parseSidecarDirectives } from '../tensornote/sidecars'
import { parseTensorNoteManifest as parseManifest } from '../tensornote/manifest'
import type { WorkspaceCompatibility, WorkspaceManifest } from '../tensornote/types'
import { resolveWorkspaceDetection, type WorkspaceDetectionReason } from './detection'
import { readTensorNoteSettings, type TensorNoteSettings } from './settings'

const markdownLimit = 2000
const excludedFolders = '**/{.git,node_modules,.venv,venv,dist,build,out}/**'

export interface TensorNoteWorkspace {
  root: vscode.Uri
  folder: vscode.WorkspaceFolder
  manifestUri?: vscode.Uri
  manifest: WorkspaceManifest
  compatibility: WorkspaceCompatibility
  inContentRoot: boolean
}

export interface TensorNoteDocumentContext {
  eligible: boolean
  workspace?: TensorNoteWorkspace
  reason: 'workspace' | 'sidecar' | 'disabled' | 'ordinary-markdown'
  settings: TensorNoteSettings
  warning?: string
}

export interface WorkspaceSnapshot {
  folder: vscode.WorkspaceFolder
  active: boolean
  reason: WorkspaceDetectionReason
  settings: TensorNoteSettings
  manifestUri?: vscode.Uri
  manifest: WorkspaceManifest
  compatibility: WorkspaceCompatibility
  noteCount: number
  noteCountLimited: boolean
  sidecars: {
    total: number
    derivation: number
    jupyter: number
    invalidJupyter: number
  }
  warning?: string
}

function isNotFound(error: unknown) {
  return error instanceof vscode.FileSystemError && error.code === 'FileNotFound'
}

function normalizedRelativePath(root: vscode.Uri, target: vscode.Uri) {
  const rootPath = root.path.endsWith('/') ? root.path : `${root.path}/`
  if (!target.path.startsWith(rootPath)) return undefined
  return target.path.slice(rootPath.length)
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, callback: (item: T) => Promise<void>) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await callback(item)
    }
  })
  await Promise.all(workers)
}

export class WorkspaceDetector implements vscode.Disposable {
  private readonly snapshots = new Map<string, WorkspaceSnapshot>()
  private readonly emitter = new vscode.EventEmitter<WorkspaceSnapshot | undefined>()
  private readonly disposables: vscode.Disposable[] = [this.emitter]
  private readonly refreshTimers = new Map<string, ReturnType<typeof setTimeout>>()

  readonly onDidChange = this.emitter.event

  constructor() {
    const manifestWatcher = vscode.workspace.createFileSystemWatcher('**/tensornote.yaml')
    const markdownWatcher = vscode.workspace.createFileSystemWatcher('**/*.md')
    for (const watcher of [manifestWatcher, markdownWatcher]) {
      this.disposables.push(watcher)
      this.disposables.push(watcher.onDidCreate((uri) => this.scheduleRefresh(uri)))
      this.disposables.push(watcher.onDidChange((uri) => this.scheduleRefresh(uri)))
      this.disposables.push(watcher.onDidDelete((uri) => this.scheduleRefresh(uri)))
    }
    this.disposables.push(vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tensornote')) void this.refreshAll()
    }))
    this.disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(() => void this.refreshAll()))
    this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => this.emitter.fire(this.currentSnapshot())))
  }

  private scheduleRefresh(uri: vscode.Uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri)
    if (!folder) return
    const key = folder.uri.toString()
    const existing = this.refreshTimers.get(key)
    if (existing) clearTimeout(existing)
    this.refreshTimers.set(key, setTimeout(() => {
      this.refreshTimers.delete(key)
      void this.refresh(folder)
    }, 500))
  }

  private async readManifest(folder: vscode.WorkspaceFolder) {
    const manifestUri = vscode.Uri.joinPath(folder.uri, 'tensornote.yaml')
    try {
      const bytes = await vscode.workspace.fs.readFile(manifestUri)
      const parsed = parseManifest(new TextDecoder().decode(bytes), folder.name)
      return { exists: true as const, manifestUri, ...parsed }
    } catch (error) {
      if (isNotFound(error)) {
        return { exists: false as const, ...parseManifest(undefined, folder.name) }
      }
      return {
        exists: true as const,
        manifestUri,
        ...parseManifest(undefined, folder.name),
        warning: `无法解析 tensornote.yaml：${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  private async markdownUris(folder: vscode.WorkspaceFolder, manifestRoot?: string) {
    const pattern = manifestRoot ? `${manifestRoot}/**/*.md` : '**/*.md'
    return vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, pattern),
      new vscode.RelativePattern(folder, excludedFolders),
      markdownLimit + 1,
    )
  }

  private async buildSnapshot(folder: vscode.WorkspaceFolder): Promise<WorkspaceSnapshot> {
    const settings = readTensorNoteSettings(folder.uri)
    if (settings.enabled === false) {
      const fallback = parseManifest(undefined, folder.name)
      return {
        folder,
        active: false,
        reason: 'disabled',
        settings,
        manifest: fallback.manifest,
        compatibility: fallback.compatibility,
        noteCount: 0,
        noteCountLimited: false,
        sidecars: { total: 0, derivation: 0, jupyter: 0, invalidJupyter: 0 },
      }
    }

    const manifestResult = await this.readManifest(folder)
    const uris = await this.markdownUris(folder, manifestResult.exists ? manifestResult.manifest.content.root : undefined)
    const noteCountLimited = uris.length > markdownLimit
    const scannedUris = uris.slice(0, markdownLimit)
    const sidecars = { total: 0, derivation: 0, jupyter: 0, invalidJupyter: 0 }
    let hasSidecar = false
    await mapWithConcurrency(scannedUris, 12, async (uri) => {
      try {
        const stat = await vscode.workspace.fs.stat(uri)
        if (stat.size > 2 * 1024 * 1024) return
        const source = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
        if (!hasTensorNoteDirective(source)) return
        hasSidecar = true
        for (const sidecar of parseSidecarDirectives(source).sidecars) {
          sidecars.total += 1
          if (sidecar.type === 'derivation') {
            sidecars.derivation += 1
          } else if (sidecar.cells.length > 0) {
            sidecars.jupyter += 1
          } else {
            sidecars.invalidJupyter += 1
          }
        }
      } catch {
        // A transiently unreadable note does not invalidate the rest of the Workspace scan.
      }
    })
    const detection = resolveWorkspaceDetection({
      workspaceEnabled: settings.enabled,
      hasManifest: manifestResult.exists,
      hasSidecar,
    })
    const manifestWarning = 'warning' in manifestResult ? manifestResult.warning : undefined
    return {
      folder,
      ...detection,
      settings,
      ...(manifestResult.exists ? { manifestUri: manifestResult.manifestUri } : {}),
      manifest: manifestResult.manifest,
      compatibility: manifestResult.compatibility,
      noteCount: scannedUris.length,
      noteCountLimited,
      sidecars,
      warning: manifestWarning ?? (manifestResult.compatibility.warnings.join(' ') || undefined),
    }
  }

  async refresh(folder: vscode.WorkspaceFolder) {
    const snapshot = await this.buildSnapshot(folder)
    this.snapshots.set(folder.uri.toString(), snapshot)
    this.emitter.fire(snapshot)
    return snapshot
  }

  async refreshAll() {
    const folders = vscode.workspace.workspaceFolders ?? []
    const activeKeys = new Set(folders.map((folder) => folder.uri.toString()))
    for (const key of this.snapshots.keys()) if (!activeKeys.has(key)) this.snapshots.delete(key)
    await Promise.all(folders.map((folder) => this.refresh(folder)))
    if (!folders.length) this.emitter.fire(undefined)
  }

  currentSnapshot() {
    const activeInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input
    const activeUri = vscode.window.activeTextEditor?.document.uri
      ?? (activeInput instanceof vscode.TabInputCustom ? activeInput.uri : undefined)
    const activeFolder = activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : undefined
    if (activeFolder) return this.snapshots.get(activeFolder.uri.toString())
    return [...this.snapshots.values()].find((snapshot) => snapshot.active) ?? this.snapshots.values().next().value
  }

  async inspect(uri: vscode.Uri, raw?: string): Promise<TensorNoteDocumentContext> {
    const folder = vscode.workspace.getWorkspaceFolder(uri)
    const settings = readTensorNoteSettings(folder?.uri ?? uri)
    if (settings.enabled === false) return { eligible: false, reason: 'disabled', settings }

    if (folder) {
      const snapshot = this.snapshots.get(folder.uri.toString()) ?? await this.refresh(folder)
      if (snapshot.active) {
        const relative = normalizedRelativePath(folder.uri, uri)
        const contentRoot = snapshot.manifest.content.root
        const inContentRoot = !snapshot.manifestUri
          || relative === contentRoot
          || relative?.startsWith(`${contentRoot}/`) === true
        return {
          eligible: true,
          reason: 'workspace',
          settings: snapshot.settings,
          workspace: {
            root: folder.uri,
            folder,
            ...(snapshot.manifestUri ? { manifestUri: snapshot.manifestUri } : {}),
            manifest: snapshot.manifest,
            compatibility: snapshot.compatibility,
            inContentRoot,
          },
          warning: snapshot.warning,
        }
      }
    }

    let source = raw
    if (source === undefined) {
      try {
        source = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
      } catch {
        source = ''
      }
    }
    const sidecar = hasTensorNoteDirective(source)
    return {
      eligible: sidecar,
      reason: sidecar ? 'sidecar' : 'ordinary-markdown',
      settings,
    }
  }

  dispose() {
    for (const timer of this.refreshTimers.values()) clearTimeout(timer)
    for (const disposable of this.disposables) disposable.dispose()
    this.snapshots.clear()
  }
}
