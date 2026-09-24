import { describe, expect, it } from 'vitest'
import { parseTensorNoteManifest } from './manifest'

describe('parseTensorNoteManifest', () => {
  it('detects configured content roots without changing schema v1', () => {
    const result = parseTensorNoteManifest([
      'schemaVersion: 1',
      'workspace:',
      '  name: Research Notes',
      'content:',
      '  root: knowledge',
      'assets:',
      '  root: media',
      'features:',
      '  executable: true',
    ].join('\n'), 'Fallback', 'knowledge/attention.md')

    expect(result.manifest.workspace.name).toBe('Research Notes')
    expect(result.manifest.content.root).toBe('knowledge')
    expect(result.manifest.features.executable).toBe(true)
    expect(result.compatibility.status).toBe('supported')
    expect(result.inContentRoot).toBe(true)
  })

  it('keeps future schemas readable but non-executable', () => {
    const result = parseTensorNoteManifest('schemaVersion: 2\nfeatures:\n  executable: true', 'Future', 'notes/a.md')

    expect(result.compatibility).toMatchObject({ status: 'future', readOnly: true })
    expect(result.manifest.features.executable).toBe(false)
    expect(result.compatibility.warnings[0]).toContain('禁用写入与执行')
  })
})
