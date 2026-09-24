export type WorkspaceDetectionReason = 'settings' | 'manifest' | 'sidecar' | 'disabled' | 'none'

export function resolveWorkspaceDetection(input: {
  workspaceEnabled?: boolean
  hasManifest: boolean
  hasSidecar: boolean
}): { active: boolean; reason: WorkspaceDetectionReason } {
  if (input.workspaceEnabled === false) return { active: false, reason: 'disabled' }
  if (input.workspaceEnabled === true) return { active: true, reason: 'settings' }
  if (input.hasManifest) return { active: true, reason: 'manifest' }
  if (input.hasSidecar) return { active: true, reason: 'sidecar' }
  return { active: false, reason: 'none' }
}
