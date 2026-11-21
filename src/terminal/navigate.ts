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
function collectLines(root: HTMLElement) {
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

/** Clears the current screen row by row, bottom to top. */
export async function wipe() {
  if (!screen) return
  const lines = collectLines(screen).reverse()
  const step = Math.min(40, 360 / Math.max(1, lines.length))
  for (const line of lines) {
    line.style.visibility = 'hidden'
    await sleep(step)
  }
  await sleep(140)
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
