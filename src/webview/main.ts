import 'highlight.js/styles/github-dark-dimmed.css'
import 'katex/dist/katex.min.css'
import mermaid from 'mermaid'
import './styles.css'

interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): { scrollY?: number } | undefined
  setState(state: { scrollY?: number }): void
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()

async function renderMermaid() {
  const nodes = [...document.querySelectorAll<HTMLElement>('.mermaid')]
  if (!nodes.length) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'neutral',
    fontFamily: 'var(--vscode-font-family)',
  })
  try {
    await mermaid.run({ nodes, suppressErrors: true })
  } catch {
    for (const node of nodes) node.classList.add('mermaid-error')
  }
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action], [data-tensornote-link]') : undefined
  if (!target) return
  const action = target.dataset.action
  const href = target.dataset.tensornoteLink
  if (action || href) event.preventDefault()
  if (action === 'openSource') vscode.postMessage({ type: 'openSource' })
  if (action === 'openDerivation') vscode.postMessage({ type: 'openDerivation', id: target.dataset.sidecarId })
  if (action === 'openJupyter') vscode.postMessage({ type: 'openJupyter', id: target.dataset.sidecarId })
  if (action === 'print') window.print()
  if (href) vscode.postMessage({ type: 'openLink', href })
})

let scrollTimer: number | undefined
window.addEventListener('scroll', () => {
  window.clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(() => vscode.setState({ scrollY: window.scrollY }), 80)
}, { passive: true })

const previousState = vscode.getState()
if (previousState?.scrollY) requestAnimationFrame(() => window.scrollTo({ top: previousState.scrollY }))

void renderMermaid()
