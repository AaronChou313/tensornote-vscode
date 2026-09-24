export interface LabCell {
  id: string
  lab: string
  order: number
  title: string
  difficulty: 'basic'
  code: string
}

interface SidecarSource {
  start: number
  end: number
}

export interface DerivationSidecar {
  type: 'derivation'
  id: string
  title: string
  markdown: string
  source: SidecarSource
}

export interface JupyterSidecar {
  type: 'jupyter'
  id: string
  title: string
  cells: LabCell[]
  source: SidecarSource
}

export type Sidecar = DerivationSidecar | JupyterSidecar
export type SidecarType = Sidecar['type']

export interface SidecarDiagnostic {
  offset: number
  message: string
}

export interface WorkspaceManifest {
  schemaVersion: number
  workspace: {
    name: string
    description?: string
  }
  content: { root: string }
  assets: { root: string }
  navigation: { mode: 'filesystem' }
  features: { executable: boolean }
  environment: { files: string[] }
  publishing: {
    title?: string
    description?: string
    logo?: string
    accent?: string
    defaultNote?: string
  }
  extensions: Record<string, unknown>
}

export interface WorkspaceCompatibility {
  sourceVersion: number
  targetVersion: number
  status: 'supported' | 'migrated' | 'future'
  readOnly: boolean
  warnings: string[]
}
