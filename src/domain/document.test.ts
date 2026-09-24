import { describe, expect, it } from 'vitest'
import { hasTensorNoteDirective, parseReaderDocument } from './document'

describe('parseReaderDocument', () => {
  it('keeps Frontmatter metadata and reuses TensorNote Sidecar parsing', () => {
    const raw = [
      '---',
      'id: attention',
      'title: Attention',
      'section: Models',
      'tags: [transformer, math]',
      'customField: preserved',
      '---',
      '# Attention',
      '',
      'Narrative.',
      '',
      ':::tensornote{type="derivation" id="scale" title="Scaling"}',
      '$$x / \\sqrt{d}$$',
      ':::',
      '',
      ':::tensornote{type="jupyter" id="demo" title="Demo"}',
      '```python title="Run"',
      'answer = 42',
      '```',
      ':::',
    ].join('\n')

    const result = parseReaderDocument('notes/attention.md', raw)

    expect(result.frontmatter).toMatchObject({
      id: 'attention',
      title: 'Attention',
      section: 'Models',
      tags: ['transformer', 'math'],
      customField: 'preserved',
    })
    expect(result.markdown).not.toContain('# Attention')
    expect(result.sidecars).toHaveLength(2)
    expect(result.sidecars[1]).toMatchObject({ type: 'jupyter', cells: [{ title: 'Run', code: 'answer = 42' }] })
  })

  it('preserves malformed Sidecar source and reports its line', () => {
    const result = parseReaderDocument('note.md', '# Note\n\n:::tensornote{type="derivation" id="open"}\nbody')

    expect(result.markdown).toContain(':::tensornote')
    expect(result.diagnostics).toEqual([{ line: 3, message: 'Sidecar 缺少结束标记 :::' }])
  })

  it('detects Sidecar-only Markdown outside a declared Workspace', () => {
    expect(hasTensorNoteDirective('text\n:::tensornote{type="derivation" id="x"}')).toBe(true)
    expect(hasTensorNoteDirective('# Ordinary Markdown')).toBe(false)
  })
})
