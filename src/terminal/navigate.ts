import type { AnyRouter } from '@tanstack/react-router'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let screen: HTMLElement | null = null
let busy = false

/** <Screen> registers itself here so navigation can wipe it. */
export function setCurrentScreen(el: HTMLElement | null) {
  screen = el
}

/**
 * The rows to clear: everything marked data-line, plus any direct child of
 * the screen that has no marked rows inside it.
 */
export function collectLines(root: HTMLElement) {
  const lines = new Set<HTMLElement>(root.querySelectorAll<HTMLElement>('[data-line]'))
  for (const child of root.children) {
    if (child instanceof HTMLElement && !child.matches('[data-line]') && !child.querySelector('[data-line]')) {
      lines.add(child)
    }
  }
  return [...lines].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  )
}

/** Milliseconds per row, so a page of any length takes about a third of a second. */
export const rowStep = (rows: number) => Math.min(40, 360 / Math.max(1, rows))

/** Clears the current screen row by row, bottom to top. */
export async function wipe() {
  if (!screen) return
  const lines = collectLines(screen).reverse()
  const step = rowStep(lines.length)
  for (const line of lines) {
    line.style.visibility = 'hidden'
    await sleep(step)
  }
  await sleep(140)
}

/** Go up one level: /projects/x -> /projects -> /. What Escape and the mobile Back button do. */
export function goUp(router: AnyRouter) {
  const parent = router.state.location.pathname.split('/').filter(Boolean).slice(0, -1)
  return go(router, '/' + parent.join('/'))
}

/** Wipe the screen, then go to `to`. Ignored while a wipe is in progress. */
export async function go(router: AnyRouter, to: string) {
  if (busy || router.state.location.pathname === to) return
  busy = true
  try {
    await wipe()
    router.history.push(to)
  } finally {
    busy = false
  }
}
