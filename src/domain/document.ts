import matter from 'gray-matter'
import { hasTensorNoteDirective, parseSidecarDirectives } from '../tensornote/sidecars'
import type { Sidecar } from '../tensornote/types'

export interface ReaderFrontmatter {
  id?: string
  title: string
  section?: string
  summary?: string
  tags: string[]
  [key: string]: unknown
}

export interface ReaderDiagnostic {
  line: number
  message: string
}

export interface ReaderDocument {
  frontmatter: ReaderFrontmatter
  markdown: string
  sidecars: Sidecar[]
  diagnostics: ReaderDiagnostic[]
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

function fallbackTitle(path: string) {
  const name = path.split(/[\\/]/).pop() ?? 'Untitled'
  return name.replace(/\.md$/i, '') || 'Untitled'
}

function sourceLineAtOffset(content: string, offset: number) {
  return content.slice(0, Math.max(0, offset)).split('\n').length
}

function stripDuplicateTitle(markdown: string, title: string) {
  const match = markdown.match(/^(\s*)#\s+(.+?)\s*#*\s*(?:\r?\n|$)/)
  if (!match || match[2].trim() !== title.trim()) return markdown
  return `${match[1]}${markdown.slice(match[0].length)}`.replace(/^\s*\r?\n/, '')
}

export function parseReaderDocument(path: string, raw: string, options: { sidecarEnabled?: boolean } = {}): ReaderDocument {
  const parsed = matter(raw)
  const data = parsed.data as Record<string, unknown>
  const title = String(data.title ?? fallbackTitle(path))
  const sidecarResult = options.sidecarEnabled === false
    ? { sidecars: [], renderedContent: parsed.content, diagnostics: [] }
    : parseSidecarDirectives(parsed.content)

  return {
    frontmatter: {
      ...data,
      ...(typeof data.id === 'string' && data.id.trim() ? { id: data.id.trim() } : {}),
      title,
      ...(data.section ? { section: String(data.section) } : {}),
      ...(data.summary ? { summary: String(data.summary) } : {}),
      tags: strings(data.tags),
    },
    markdown: stripDuplicateTitle(sidecarResult.renderedContent, title),
    sidecars: sidecarResult.sidecars,
    diagnostics: sidecarResult.diagnostics.map((diagnostic) => ({
      line: sourceLineAtOffset(parsed.content, diagnostic.offset),
      message: diagnostic.message,
    })),
  }
}

export { hasTensorNoteDirective }
