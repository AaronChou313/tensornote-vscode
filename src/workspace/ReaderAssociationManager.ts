import * as vscode from 'vscode'
import type { WorkspaceSnapshot } from './detector'

const markdownPattern = '*.md'
const readerViewType = 'tensornote.reader'

export class ReaderAssociationManager {
  async sync(snapshot: WorkspaceSnapshot) {
    const folderScoped = (vscode.workspace.workspaceFolders?.length ?? 0) > 1
    const target = folderScoped ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Workspace
    const configuration = vscode.workspace.getConfiguration('workbench', snapshot.folder.uri)
    const inspected = configuration.inspect<Record<string, string>>('editorAssociations')
    const current = (folderScoped ? inspected?.workspaceFolderValue : inspected?.workspaceValue) ?? {}
    const shouldOwnMarkdown = snapshot.active && snapshot.settings.defaultReader
    const currentlyOwned = current[markdownPattern] === readerViewType
    if (shouldOwnMarkdown === currentlyOwned) return

    const next = { ...current }
    if (shouldOwnMarkdown) next[markdownPattern] = readerViewType
    else if (currentlyOwned) delete next[markdownPattern]
    await configuration.update('editorAssociations', next, target)
  }
}
