import { createHash } from 'node:crypto'
import type { JupyterSidecar } from '../tensornote/types'

export interface SidecarNotebookCellModel {
  kind: 'markup' | 'code'
  languageId: 'markdown' | 'python'
  value: string
  metadata: Record<string, unknown>
}

export interface SidecarNotebookModel {
  title: string
  signature: string
  metadata: Record<string, unknown>
  cells: SidecarNotebookCellModel[]
}

function markdownEscape(value: string) {
  return value.replace(/[\\`*_{}[\]()#+.!|>~-]/g, '\\$&')
}

export function createSidecarNotebookModel(noteLabel: string, sidecar: JupyterSidecar): SidecarNotebookModel {
  const source = JSON.stringify({
    noteLabel,
    id: sidecar.id,
    title: sidecar.title,
    cells: sidecar.cells.map((cell) => ({ id: cell.id, title: cell.title, code: cell.code })),
  })
  const signature = createHash('sha256').update(source).digest('hex')
  const introduction = [
    `# ${markdownEscape(sidecar.title)}`,
    '',
    `> TensorNote runtime view from \`${markdownEscape(noteLabel)}\`, Sidecar \`${markdownEscape(sidecar.id)}\`.`,
    '>',
    '> Markdown remains the source of truth. Outputs stay in this VS Code session; saving creates a separate notebook snapshot and does not update the note.',
  ].join('\n')

  return {
    title: sidecar.title,
    signature,
    metadata: {
      language_info: { name: 'python' },
      tensornote: {
        source: noteLabel,
        sidecarId: sidecar.id,
        sidecarTitle: sidecar.title,
        signature,
      },
    },
    cells: [
      {
        kind: 'markup',
        languageId: 'markdown',
        value: introduction,
        metadata: { tensornote: { generated: true } },
      },
      ...sidecar.cells.map((cell, index) => ({
        kind: 'code' as const,
        languageId: 'python' as const,
        value: cell.code,
        metadata: {
          tensornote: {
            cellId: cell.id,
            title: cell.title || `Cell ${index + 1}`,
            order: index + 1,
          },
        },
      })),
    ],
  }
}
