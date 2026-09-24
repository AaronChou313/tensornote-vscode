import { describe, expect, it } from 'vitest'
import { parseSidecarDirectives } from './sidecars'

describe('TensorNote Sidecar parser', () => {
  it('supports exactly derivation and jupyter Sidecars', () => {
    const source = [
      ':::tensornote{type="derivation" id="proof" title="Proof"}',
      '$$x^2$$',
      ':::',
      ':::tensornote{type="jupyter" id="demo" title="Demo"}',
      '```python title="Run"',
      'answer = 42',
      '```',
      ':::',
    ].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars).toMatchObject([
      { type: 'derivation', id: 'proof', markdown: '$$x^2$$' },
      { type: 'jupyter', id: 'demo', cells: [{ title: 'Run', code: 'answer = 42' }] },
    ])
    expect(result.diagnostics).toEqual([])
  })

  it('accepts whitespace before the exact python language name', () => {
    const source = [':::tensornote{type="jupyter" id="demo"}', '``` python', 'x = 1', '```', '```pythonic', 'x = 2', '```', ':::'].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars[0]).toMatchObject({ type: 'jupyter', cells: [{ code: 'x = 1' }] })
  })

  it('keeps malformed blocks diagnosable instead of executing them', () => {
    const source = [':::tensornote{type="jupyter" id="open"}', '```python', 'x = 1', ':::'].join('\n')
    const result = parseSidecarDirectives(source)
    expect(result.sidecars[0]).toMatchObject({ type: 'jupyter', cells: [] })
    expect(result.diagnostics[0].message).toContain('缺少结束标记')
  })
})
