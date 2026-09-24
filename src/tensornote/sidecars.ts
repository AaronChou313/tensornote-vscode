import type { LabCell, Sidecar, SidecarDiagnostic } from './types'

const OPENING = /^:::tensornote\{([^}]*)\}\s*$/
const CLOSING = /^:::\s*$/
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g
const CODE_FENCE = /```[ \t]*python(?=[ \t\n])(?:[ \t]+exec)?([^\n]*)\n([\s\S]*?)```/g

function attributes(source: string) {
  return Object.fromEntries([...source.matchAll(ATTRIBUTE)].map((match) => [match[1], match[2]]))
}

function safeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function jupyterCells(id: string, body: string): LabCell[] {
  const cells: LabCell[] = []
  for (const match of body.matchAll(CODE_FENCE)) {
    const metadata = attributes(match[1])
    const order = cells.length + 1
    cells.push({
      id: `${id}-${order}`,
      lab: id,
      order,
      title: metadata.title || `Cell ${order}`,
      difficulty: 'basic',
      code: match[2].trim(),
    })
  }
  return cells
}

export function hasTensorNoteDirective(source: string) {
  return /^:::tensornote\{/m.test(source)
}

export function parseSidecarDirectives(content: string): {
  sidecars: Sidecar[]
  renderedContent: string
  diagnostics: SidecarDiagnostic[]
} {
  const sidecars: Sidecar[] = []
  const diagnostics: SidecarDiagnostic[] = []
  const ids = new Set<string>()
  const lines = content.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? []
  let offset = 0
  let cursor = 0
  let renderedContent = ''

  while (cursor < lines.length) {
    const line = lines[cursor]
    const opening = line.replace(/\r?\n$/, '').match(OPENING)
    if (!opening) {
      renderedContent += line
      offset += line.length
      cursor += 1
      continue
    }

    const start = offset
    let closing = cursor + 1
    while (closing < lines.length && !CLOSING.test(lines[closing].replace(/\r?\n$/, ''))) closing += 1
    if (closing >= lines.length) {
      diagnostics.push({ offset: start, message: 'Sidecar 缺少结束标记 :::' })
      renderedContent += line
      offset += line.length
      cursor += 1
      continue
    }

    const rawBlock = lines.slice(cursor, closing + 1).join('')
    const body = lines.slice(cursor + 1, closing).join('').trim()
    const values = attributes(opening[1])
    const type = values.type
    const id = safeId(values.id || '')
    const nested = lines.slice(cursor + 1, closing).some((candidate) => OPENING.test(candidate.replace(/\r?\n$/, '')))
    if ((type !== 'derivation' && type !== 'jupyter') || !id || ids.has(id) || nested) {
      const reason = nested
        ? 'Sidecar 不支持嵌套'
        : !id
          ? 'Sidecar 缺少有效 id'
          : ids.has(id)
            ? `Sidecar id 重复：${id}`
            : `不支持的 Sidecar 类型：${type || '(空)'}`
      diagnostics.push({ offset: start, message: reason })
      renderedContent += rawBlock
    } else {
      ids.add(id)
      const base = { id, title: values.title?.trim() || id, source: { start, end: start + rawBlock.length } }
      if (type === 'derivation') {
        sidecars.push({ ...base, type, markdown: body })
      } else {
        const cells = jupyterCells(id, body)
        sidecars.push({ ...base, type, cells })
        if (cells.length === 0) {
          diagnostics.push({
            offset: start,
            message: /```[ \t]*python(?=[ \t\n])/.test(body)
              ? 'Jupyter Sidecar 的 Python 代码围栏缺少结束标记 ```'
              : 'Jupyter Sidecar 未找到有效的 Python 代码围栏',
          })
        }
      }
      renderedContent += `\n\`\`\`tensornote-sidecar\n${id}\n\`\`\`\n`
    }
    offset += rawBlock.length
    cursor = closing + 1
  }

  return { sidecars, renderedContent, diagnostics }
}
