import * as vscode from 'vscode'

function isExternal(href: string) {
  return /^(?:https?:|mailto:)/i.test(href)
}

function splitTarget(href: string) {
  const hash = href.indexOf('#')
  return hash >= 0 ? { path: href.slice(0, hash), fragment: href.slice(hash + 1) } : { path: href, fragment: '' }
}

export async function openReaderLink(documentUri: vscode.Uri, href: string) {
  if (isExternal(href)) {
    await vscode.env.openExternal(vscode.Uri.parse(href))
    return
  }

  const { path, fragment } = splitTarget(href)
  if (!path) return
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(path)
  } catch {
    decodedPath = path
  }
  if (/^[/\\]/.test(decodedPath)) {
    void vscode.window.showWarningMessage('TensorNote Reader does not open absolute paths from Markdown.')
    return
  }
  const target = vscode.Uri.joinPath(documentUri, '..', decodedPath)
  const folder = vscode.workspace.getWorkspaceFolder(documentUri)
  if (folder) {
    const root = folder.uri.path.endsWith('/') ? folder.uri.path : `${folder.uri.path}/`
    if (target.scheme !== folder.uri.scheme || target.authority !== folder.uri.authority || !target.path.startsWith(root)) {
      void vscode.window.showWarningMessage('TensorNote Reader blocked a link outside the current VS Code Workspace.')
      return
    }
  }

  if (/\.md$/i.test(target.path)) {
    await vscode.commands.executeCommand('vscode.openWith', target, 'tensornote.reader')
    if (fragment) {
      void vscode.window.showInformationMessage(`Opened the linked note. Heading navigation “${fragment}” will be added with the Workspace index.`)
    }
    return
  }
  await vscode.commands.executeCommand('vscode.open', target)
}
