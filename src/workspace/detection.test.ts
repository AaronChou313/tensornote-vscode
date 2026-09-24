import { describe, expect, it } from 'vitest'
import { resolveWorkspaceDetection } from './detection'

describe('resolveWorkspaceDetection', () => {
  it('gives an explicit Workspace setting the highest priority', () => {
    expect(resolveWorkspaceDetection({ workspaceEnabled: false, hasManifest: true, hasSidecar: true })).toEqual({ active: false, reason: 'disabled' })
    expect(resolveWorkspaceDetection({ workspaceEnabled: true, hasManifest: false, hasSidecar: false })).toEqual({ active: true, reason: 'settings' })
  })

  it('uses tensornote.yaml before automatic Sidecar detection', () => {
    expect(resolveWorkspaceDetection({ hasManifest: true, hasSidecar: true })).toEqual({ active: true, reason: 'manifest' })
    expect(resolveWorkspaceDetection({ hasManifest: false, hasSidecar: true })).toEqual({ active: true, reason: 'sidecar' })
    expect(resolveWorkspaceDetection({ hasManifest: false, hasSidecar: false })).toEqual({ active: false, reason: 'none' })
  })
})
