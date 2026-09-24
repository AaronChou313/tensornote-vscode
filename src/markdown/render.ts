import { katex } from '@mdit/plugin-katex'
import hljs from 'highlight.js'
import MarkdownIt, { type StateCore, type Token } from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import type { Sidecar } from '../tensornote/types'

export type RenderMode = 'interactive' | 'print'

export interface MarkdownRenderOptions {
  mode?: RenderMode
  sidecars?: Sidecar[]
  jupyterEnabled?: boolean
  resolveResource?: (source: string) => string
}

const calloutLabels: Record<string, string> = {
  intuition: '直觉',
  important: '重点',
  pitfall: '易错',
  bridge: '知识衔接',
  question: '问题',
  remember: '需要记住',
}

function escape(value: string) {
  return MarkdownIt().utils.escapeHtml(value)
}

function safeId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function addHeadingIds(state: StateCore) {
  const seen = new Map<string, number>()
  for (let index = 0; index < state.tokens.length; index += 1) {
    const token = state.tokens[index]
    if (token.type !== 'heading_open') continue
    const text = state.tokens[index + 1]?.content ?? ''
    const base = safeId(text) || 'section'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    token.attrSet('id', count ? `${base}-${count}` : base)
  }
}

function addCallouts(state: StateCore) {
  for (let index = 0; index < state.tokens.length; index += 1) {
    const opening = state.tokens[index]
    if (opening.type !== 'blockquote_open') continue
    const inlineIndex = state.tokens.findIndex((token, candidate) => candidate > index && token.type === 'inline')
    const inline = state.tokens[inlineIndex]
    const match = inline?.content.match(/^\[!(\w+)]\s*/)
    const kind = match?.[1]?.toLocaleLowerCase()
    if (!match || !kind || !calloutLabels[kind]) continue

    opening.tag = 'aside'
    opening.attrSet('class', `callout callout--${kind}`)
    inline.content = inline.content.slice(match[0].length)
    const firstText = inline.children?.find((child) => child.type === 'text')
    if (firstText) firstText.content = firstText.content.replace(/^\[!(\w+)]\s*/, '')
    const label = new state.Token('html_inline', '', 0)
    label.content = `<strong class="callout__label">${calloutLabels[kind]}</strong>`
    inline.children?.unshift(label)

    let depth = 0
    for (let candidate = index; candidate < state.tokens.length; candidate += 1) {
      if (state.tokens[candidate].type === 'blockquote_open') depth += 1
      if (state.tokens[candidate].type === 'blockquote_close') depth -= 1
      if (depth === 0) {
        state.tokens[candidate].tag = 'aside'
        break
      }
    }
  }
}

function addTaskLists(state: StateCore) {
  for (let index = 0; index < state.tokens.length; index += 1) {
    const inline = state.tokens[index]
    const match = inline.type === 'inline' ? inline.content.match(/^\[([ xX])]\s+/) : undefined
    if (!match) continue
    inline.content = inline.content.slice(match[0].length)
    const firstText = inline.children?.find((child) => child.type === 'text')
    if (firstText) firstText.content = firstText.content.replace(/^\[([ xX])]\s+/, '')
    const checkbox = new state.Token('html_inline', '', 0)
    checkbox.content = `<input class="task-list-item-checkbox" type="checkbox" disabled${match[1] === ' ' ? '' : ' checked'}>`
    inline.children?.unshift(checkbox)
    for (let candidate = index; candidate >= 0; candidate -= 1) {
      if (state.tokens[candidate].type !== 'list_item_open') continue
      state.tokens[candidate].attrJoin('class', 'task-list-item')
      break
    }
  }
}

function printSidecar(sidecar: Sidecar, options: MarkdownRenderOptions) {
  const kind = sidecar.type === 'derivation' ? '推导 / 补充' : 'Python 实验'
  const content = sidecar.type === 'derivation'
    ? renderTensorNoteMarkdown(sidecar.markdown, { ...options, mode: 'print', sidecars: [] })
    : sidecar.cells.map((cell, index) => [
      '<section class="print-cell">',
      `<h3>${escape(cell.title || `Cell ${index + 1}`)}</h3>`,
      `<pre><code class="language-python">${escape(cell.code)}</code></pre>`,
      '</section>',
    ].join('')).join('')
  return `<section class="print-sidecar print-sidecar--${sidecar.type}"><header><p>${kind}</p><h2>${escape(sidecar.title)}</h2></header>${content}</section>`
}

function sidecarTrigger(sidecar: Sidecar, options: MarkdownRenderOptions) {
  const derivation = sidecar.type === 'derivation'
  const disabled = !derivation && options.jupyterEnabled === false
  const label = derivation ? '查看推导' : '打开 Python 实验'
  const detail = derivation
    ? '在右侧展开补充说明'
    : disabled
      ? '已在当前 Workspace 设置中禁用'
    : sidecar.cells.length > 0
      ? `${sidecar.cells.length} 个 Python Cell · 使用 VS Code Jupyter 打开`
      : '未找到有效 Python Cell · 检查代码围栏格式'
  return [
    `<button type="button" class="sidecar-trigger sidecar-trigger--${sidecar.type}" data-action="${derivation ? 'openDerivation' : 'openJupyter'}" data-sidecar-id="${escape(sidecar.id)}"${disabled ? ' disabled' : ''}>`,
    '<span class="sidecar-trigger__icon" aria-hidden="true">↗</span>',
    '<span class="sidecar-trigger__copy">',
    `<strong>${escape(sidecar.title)}</strong>`,
    `<span>${label} · ${detail}</span>`,
    '</span>',
    '</button>',
  ].join('')
}

function sanitize(rendered: string) {
  return sanitizeHtml(rendered, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'article', 'aside', 'button', 'details', 'figcaption', 'figure', 'footer', 'header', 'main', 'section', 'summary',
      'img', 'input', 'del', 'mark', 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mfrac', 'msqrt', 'mroot',
      'msup', 'msub', 'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'title', 'aria-hidden', 'aria-label', 'role'],
      a: ['href', 'target', 'rel', 'data-tensornote-link'],
      button: ['type', 'disabled', 'data-action', 'data-sidecar-id'],
      code: ['class'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      input: ['type', 'checked', 'disabled'],
      ol: ['start'],
      span: ['style'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    allowedStyles: {
      span: {
        height: [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
        top: [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
        width: [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
        'margin-right': [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
        'padding-left': [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
        'vertical-align': [/^-?\d+(?:\.\d+)?(?:em|px|%)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  })
}

export function renderTensorNoteMarkdown(source: string, options: MarkdownRenderOptions = {}) {
  const sidecars = new Map((options.sidecars ?? []).map((sidecar) => [sidecar.id, sidecar]))
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight(code, language) {
      const highlighted = language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : escape(code)
      return `<pre><code class="hljs${language ? ` language-${escape(language)}` : ''}">${highlighted}</code></pre>`
    },
  })
  md.use(katex, { delimiters: 'all', throwOnError: false, strict: 'ignore' })
  md.core.ruler.push('tensornote_heading_ids', addHeadingIds)
  md.core.ruler.push('tensornote_callouts', addCallouts)
  md.core.ruler.push('tensornote_task_lists', addTaskLists)

  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens: Token[], index, ruleOptions, env, renderer) => {
    const token = tokens[index]
    const language = token.info.trim().split(/\s+/)[0]
    if (language === 'tensornote-sidecar') {
      const sidecar = sidecars.get(token.content.trim())
      if (!sidecar) return ''
      return options.mode === 'print' ? printSidecar(sidecar, options) : sidecarTrigger(sidecar, options)
    }
    if (language === 'mermaid') return `<div class="mermaid">${escape(token.content)}</div>`
    return defaultFence ? defaultFence(tokens, index, ruleOptions, env, renderer) : ''
  }

  const defaultImage = md.renderer.rules.image?.bind(md.renderer.rules)
  md.renderer.rules.image = (tokens: Token[], index, ruleOptions, env, renderer) => {
    const sourceValue = String(tokens[index].attrGet('src') ?? '')
    if (options.resolveResource && !/^(?:https?:|data:)/i.test(sourceValue)) {
      tokens[index].attrSet('src', options.resolveResource(sourceValue))
    }
    tokens[index].attrSet('loading', 'lazy')
    return defaultImage ? defaultImage(tokens, index, ruleOptions, env, renderer) : renderer.renderToken(tokens, index, ruleOptions)
  }

  const defaultLinkOpen = md.renderer.rules.link_open?.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens: Token[], index, ruleOptions, env, renderer) => {
    const href = String(tokens[index].attrGet('href') ?? '')
    if (!href.startsWith('#')) {
      tokens[index].attrSet('href', '#')
      tokens[index].attrSet('data-tensornote-link', href)
    }
    return defaultLinkOpen ? defaultLinkOpen(tokens, index, ruleOptions, env, renderer) : renderer.renderToken(tokens, index, ruleOptions)
  }

  return sanitize(md.render(source))
}
