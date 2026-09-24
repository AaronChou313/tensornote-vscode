import { parse } from 'yaml'
import type { WorkspaceCompatibility, WorkspaceManifest } from './types'

export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1

const defaultManifest: WorkspaceManifest = {
  schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
  workspace: { name: 'Markdown Workspace' },
  content: { root: 'notes' },
  assets: { root: 'assets' },
  navigation: { mode: 'filesystem' },
  features: { executable: false },
  environment: { files: [] },
  publishing: {},
  extensions: {},
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeWorkspacePath(value: string) {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new Error(`Workspace path must be relative and cannot contain "..": ${value}`)
  }
  return normalized
}

export function parseTensorNoteManifest(source: string | undefined, fallbackName: string, relativeDocumentPath?: string) {
  const parsed = source?.trim() ? objectValue(parse(source)) : {}
  const workspace = objectValue(parsed.workspace)
  const content = objectValue(parsed.content)
  const assets = objectValue(parsed.assets)
  const features = objectValue(parsed.features)
  const environment = objectValue(parsed.environment)
  const publishing = objectValue(parsed.publishing)
  const declaredSchemaVersion = parsed.schemaVersion
  const sourceVersion = declaredSchemaVersion === undefined ? (source?.trim() ? 0 : 1) : Number(declaredSchemaVersion)

  if (!Number.isInteger(sourceVersion) || sourceVersion < 0 || declaredSchemaVersion !== undefined && sourceVersion < 1) {
    throw new Error('tensornote.yaml 的 schemaVersion 必须是正整数')
  }

  const futureSchema = sourceVersion > CURRENT_WORKSPACE_SCHEMA_VERSION
  const legacySchema = sourceVersion < CURRENT_WORKSPACE_SCHEMA_VERSION
  const warnings = futureSchema
    ? [`Workspace 使用较新的 Schema v${sourceVersion}；将按 v1 读取已知字段，并禁用写入与执行。`]
    : legacySchema
      ? ['未声明 Workspace Schema；已在内存中按 v1 读取，原文件不会被改写。']
      : []
  const contentRoot = normalizeWorkspacePath(String(content.root ?? defaultManifest.content.root))
  const normalizedDocument = relativeDocumentPath?.replace(/\\/g, '/').replace(/^\/+/, '')
  const manifest: WorkspaceManifest = {
    schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    workspace: {
      name: String(workspace.name ?? fallbackName ?? defaultManifest.workspace.name),
      ...(workspace.description ? { description: String(workspace.description) } : {}),
    },
    content: { root: contentRoot },
    assets: { root: normalizeWorkspacePath(String(assets.root ?? defaultManifest.assets.root)) },
    navigation: { mode: 'filesystem' },
    features: { executable: !futureSchema && features.executable === true },
    environment: {
      files: Array.isArray(environment.files)
        ? environment.files.map(String).map(normalizeWorkspacePath).filter(Boolean)
        : [],
    },
    publishing: {
      ...(publishing.title ? { title: String(publishing.title) } : {}),
      ...(publishing.description ? { description: String(publishing.description) } : {}),
      ...(typeof publishing.logo === 'string' && !/^[/\\]/.test(publishing.logo) && !publishing.logo.split(/[\\/]+/).includes('..')
        ? { logo: normalizeWorkspacePath(publishing.logo) }
        : {}),
      ...(typeof publishing.accent === 'string' && /^#[0-9a-f]{6}$/i.test(publishing.accent)
        ? { accent: publishing.accent.toLowerCase() }
        : {}),
      ...(publishing.defaultNote ? { defaultNote: String(publishing.defaultNote) } : {}),
    },
    extensions: objectValue(parsed.extensions),
  }
  const compatibility: WorkspaceCompatibility = {
    sourceVersion,
    targetVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
    status: futureSchema ? 'future' : legacySchema ? 'migrated' : 'supported',
    readOnly: futureSchema,
    warnings,
  }
  return {
    manifest,
    compatibility,
    inContentRoot: normalizedDocument === contentRoot || normalizedDocument?.startsWith(`${contentRoot}/`) === true,
  }
}
