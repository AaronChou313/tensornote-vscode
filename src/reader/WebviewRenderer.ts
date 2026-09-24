import { randomBytes } from 'node:crypto'
import * as vscode from 'vscode'
import type { DerivationSidecar } from '../tensornote/types'
import type { ReaderDocument } from '../domain/document'
import { renderTensorNoteMarkdown } from '../markdown/render'
import type { TensorNoteDocumentContext } from '../workspace/detector'

function escape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function nonce() {
  return randomBytes(18).toString('base64')
}

function withoutQueryOrFragment(value: string) {
  return value.split(/[?#]/, 1)[0]
}

export class WebviewRenderer {
  constructor(private readonly extensionUri: vscode.Uri) {}

  private resource(webview: vscode.Webview, path: string) {
    return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, path)).toString()
  }

  private documentResource(webview: vscode.Webview, documentUri: vscode.Uri, source: string) {
    if (/^(?:https?:|data:)/i.test(source)) return source
    const path = withoutQueryOrFragment(source.trim())
    if (!path || /^[/\\]/.test(path) || path.split(/[\\/]+/).includes('..') && !vscode.workspace.getWorkspaceFolder(documentUri)) return ''
    const target = vscode.Uri.joinPath(documentUri, '..', path)
    return webview.asWebviewUri(target).toString()
  }

  private shell(webview: vscode.Webview, title: string, body: string, kind: 'reader' | 'sidecar') {
    const scriptUri = this.resource(webview, 'dist/webview.js')
    const styleUri = this.resource(webview, 'dist/webview.css')
    const pageNonce = nonce()
    const maxWidth = vscode.workspace.getConfiguration('tensornote.reader').get<number>('maxWidth', 920)
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${pageNonce}' ${webview.cspSource};">
  <title>${escape(title)}</title>
  <link rel="stylesheet" href="${styleUri}">
  <style>:root { --tensornote-reader-max-width: ${Math.max(640, Math.min(1400, maxWidth))}px; }</style>
</head>
<body class="view-${kind}">
${body}
<script nonce="${pageNonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  renderReader(webview: vscode.Webview, documentUri: vscode.Uri, document: ReaderDocument, context: TensorNoteDocumentContext) {
    const metadata = document.frontmatter
    const markdown = renderTensorNoteMarkdown(document.markdown, {
      sidecars: document.sidecars,
      jupyterEnabled: context.settings.jupyterEnabled,
      resolveResource: (source) => this.documentResource(webview, documentUri, source),
    })
    const workspaceLabel = context.workspace?.manifest.workspace.name
      ?? (context.reason === 'sidecar' ? 'Standalone TensorNote Markdown' : 'Markdown')
    const compatibility = context.workspace?.compatibility.status === 'future'
      ? '<span class="reader-badge reader-badge--warning">Future schema · read-only</span>'
      : '<span class="reader-badge">Schema v1</span>'
    const locationNotice = context.workspace && !context.workspace.inContentRoot
      ? '<p class="reader-notice">This file is outside the configured <code>content.root</code>; Reader mode remains available without changing the file.</p>'
      : ''
    const warning = context.warning
      ? `<p class="reader-notice reader-notice--warning">${escape(context.warning)}</p>`
      : ''
    const diagnostics = document.diagnostics.length
      ? `<aside class="reader-diagnostics"><strong>Sidecar diagnostics</strong><ul>${document.diagnostics.map((item) => `<li>Line ${item.line}: ${escape(item.message)}</li>`).join('')}</ul></aside>`
      : ''
    const tags = metadata.tags.length
      ? `<div class="reader-tags">${metadata.tags.map((tag) => `<span>${escape(tag)}</span>`).join('')}</div>`
      : ''
    const header = `<header class="reader-header">
      <div class="reader-toolbar"><span>${escape(workspaceLabel)}</span>${compatibility}<button type="button" class="toolbar-button" data-action="openSource">Source</button></div>
      ${metadata.section ? `<p class="reader-section">${escape(metadata.section)}</p>` : ''}
      <h1>${escape(metadata.title)}</h1>
      ${metadata.summary ? `<p class="reader-summary">${escape(metadata.summary)}</p>` : ''}
      ${tags}
    </header>`
    return this.shell(webview, metadata.title, `<article class="reader-document">${header}${warning}${locationNotice}${diagnostics}<main class="reader-content">${markdown}</main></article>`, 'reader')
  }

  renderUnavailable(webview: vscode.Webview, documentUri: vscode.Uri) {
    const body = `<main class="empty-state"><p class="empty-state__eyebrow">TensorNote Reader</p><h1>Ordinary Markdown</h1><p><code>${escape(documentUri.fsPath)}</code> is not inside a folder with <code>tensornote.yaml</code> and contains no TensorNote Sidecar.</p><button type="button" class="primary-button" data-action="openSource">Open Markdown source</button></main>`
    return this.shell(webview, 'TensorNote Reader', body, 'reader')
  }

  renderDerivation(webview: vscode.Webview, documentUri: vscode.Uri, sidecar: DerivationSidecar) {
    const markdown = renderTensorNoteMarkdown(sidecar.markdown, {
      resolveResource: (source) => this.documentResource(webview, documentUri, source),
    })
    const body = `<article class="sidecar-document"><header class="sidecar-header"><p>Derivation / Supplement</p><h1>${escape(sidecar.title)}</h1><span>${escape(sidecar.id)}</span></header><main class="reader-content">${markdown}</main></article>`
    return this.shell(webview, sidecar.title, body, 'sidecar')
  }

  renderPrintPreview(webview: vscode.Webview, documentUri: vscode.Uri, document: ReaderDocument, context: TensorNoteDocumentContext) {
    const markdown = renderTensorNoteMarkdown(document.markdown, {
      mode: 'print',
      sidecars: document.sidecars,
      resolveResource: (source) => this.documentResource(webview, documentUri, source),
    })
    const workspaceLabel = context.workspace?.manifest.workspace.name ?? 'TensorNote Markdown'
    const body = `<article class="reader-document">
      <header class="reader-header">
        <div class="reader-toolbar"><span>${escape(workspaceLabel)} · PDF Preview</span><button type="button" class="toolbar-button" data-action="print">Print / Save as PDF</button></div>
        <h1>${escape(document.frontmatter.title)}</h1>
      </header>
      <main class="reader-content">${markdown}</main>
    </article>`
    return this.shell(webview, `${document.frontmatter.title} · PDF Preview`, body, 'reader')
  }
}
