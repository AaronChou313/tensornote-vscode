import { describe, expect, it } from 'vitest'
import type { Sidecar } from '../tensornote/types'
import { renderTensorNoteMarkdown } from './render'

const derivation: Sidecar = {
  id: 'scale',
  type: 'derivation',
  title: 'Scaling proof',
  markdown: '$$x^2$$\n\n> [!intuition]\n> Stable scale.',
  source: { start: 0, end: 1 },
}

describe('renderTensorNoteMarkdown', () => {
  it('renders math, tables, tasks, callouts, and a derivation trigger', () => {
    const source = [
      '## Section',
      '',
      '- [x] done',
      '',
      '| A | B |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '> [!important]',
      '> Read this.',
      '',
      '```tensornote-sidecar',
      'scale',
      '```',
      '',
      '$x^2$',
    ].join('\n')

    const html = renderTensorNoteMarkdown(source, { sidecars: [derivation] })

    expect(html).toContain('id="section"')
    expect(html).toContain('task-list-item-checkbox')
    expect(html).toContain('<table>')
    expect(html).toContain('callout--important')
    expect(html).toContain('data-action="openDerivation"')
    expect(html).toContain('class="katex"')
  })

  it('expands Sidecars for future print/PDF output', () => {
    const html = renderTensorNoteMarkdown('```tensornote-sidecar\nscale\n```', {
      mode: 'print',
      sidecars: [derivation],
    })

    expect(html).toContain('print-sidecar--derivation')
    expect(html).toContain('Scaling proof')
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('data-action="openDerivation"')
  })

  it('sanitizes raw HTML and rewrites local assets', () => {
    const html = renderTensorNoteMarkdown([
      '<script>alert(1)</script>',
      '<img src="javascript:alert(1)" onerror="alert(2)">',
      '',
      '![diagram](../assets/plot.png)',
    ].join('\n'), { resolveResource: (source) => `https://workspace.invalid/${source}` })

    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('https://workspace.invalid/../assets/plot.png')
  })
})
