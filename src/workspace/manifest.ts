import type { WorkspaceCompatibility, WorkspaceManifest } from '../tensornote/types'
import { parseTensorNoteManifest as parseStandaloneManifest } from '../tensornote/manifest'

export interface ParsedWorkspaceManifest {
  manifest: WorkspaceManifest
  compatibility: WorkspaceCompatibility
  inContentRoot: boolean
}

export function parseTensorNoteManifest(source: string, fallbackName: string, relativeDocumentPath?: string): ParsedWorkspaceManifest {
  return parseStandaloneManifest(source, fallbackName, relativeDocumentPath)
}
