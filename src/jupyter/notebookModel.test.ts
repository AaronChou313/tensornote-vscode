import { describe, expect, it } from 'vitest'
import type { JupyterSidecar } from '../tensornote/types'
import { createSidecarNotebookModel } from './notebookModel'

const sidecar: JupyterSidecar = {
  id: 'attention-demo',
  type: 'jupyter',
  title: 'Attention demo',
  source: { start: 0, end: 100 },
  cells: [
    { id: 'attention-demo-1', lab: 'attention-demo', order: 1, title: 'Prepare', difficulty: 'basic', code: 'x = 1' },
    { id: 'attention-demo-2', lab: 'attention-demo', order: 2, title: 'Check', difficulty: 'basic', code: 'x + 1' },
  ],
}

describe('createSidecarNotebookModel', () => {
  it('creates a runtime introduction followed by ordered Python cells', () => {
    const model = createSidecarNotebookModel('notes/attention.md', sidecar)

    expect(model.cells).toHaveLength(3)
    expect(model.cells[0]).toMatchObject({ kind: 'markup', languageId: 'markdown' })
    expect(model.cells[0].value).toContain('Markdown remains the source of truth')
    expect(model.cells.slice(1)).toMatchObject([
      { kind: 'code', languageId: 'python', value: 'x = 1', metadata: { tensornote: { title: 'Prepare', order: 1 } } },
      { kind: 'code', languageId: 'python', value: 'x + 1', metadata: { tensornote: { title: 'Check', order: 2 } } },
    ])
  })

  it('changes the signature when executable source changes', () => {
    const first = createSidecarNotebookModel('notes/attention.md', sidecar)
    const changed = createSidecarNotebookModel('notes/attention.md', {
      ...sidecar,
      cells: sidecar.cells.map((cell, index) => index === 0 ? { ...cell, code: 'x = 2' } : cell),
    })

    expect(first.signature).not.toBe(changed.signature)
  })
})
