import * as vscode from 'vscode'

export interface TensorNoteSettings {
  enabled?: boolean
  defaultReader: boolean
  sidecarEnabled: boolean
  jupyterEnabled: boolean
}

function workspaceValue<T>(key: string, resource?: vscode.Uri): T | undefined {
  const inspected = vscode.workspace.getConfiguration('tensornote', resource).inspect<T>(key)
  return inspected?.workspaceFolderValue ?? inspected?.workspaceValue
}

export function readTensorNoteSettings(resource?: vscode.Uri): TensorNoteSettings {
  return {
    enabled: workspaceValue<boolean>('enabled', resource),
    defaultReader: workspaceValue<boolean>('defaultReader', resource) ?? false,
    sidecarEnabled: workspaceValue<boolean>('sidecar.enabled', resource) ?? true,
    jupyterEnabled: workspaceValue<boolean>('jupyter.enabled', resource) ?? true,
  }
}

export async function updateWorkspaceSetting(folder: vscode.WorkspaceFolder, key: keyof Omit<TensorNoteSettings, 'enabled'> | 'enabled', value: boolean | undefined) {
  const configurationKey = key === 'sidecarEnabled'
    ? 'sidecar.enabled'
    : key === 'jupyterEnabled'
      ? 'jupyter.enabled'
      : key
  const target = (vscode.workspace.workspaceFolders?.length ?? 0) > 1
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Workspace
  await vscode.workspace.getConfiguration('tensornote', folder.uri).update(configurationKey, value, target)
}
