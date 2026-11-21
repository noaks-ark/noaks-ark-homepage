import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { setCurrentScreen } from './navigate'
import { Sequencer, SequencerContext, useSequencer } from './sequencer'

interface ScreenProps {
  children: ReactNode
  className?: string
  seenKey?: string
}

// sessionStorage lasts for the tab, and can throw in private browsing.
function wasSeen(key: string) {
  try {
    return sessionStorage.getItem(`seen:${key}`) !== null
  } catch {
    return false
  }
}

function markSeen(key: string) {
  try {
    sessionStorage.setItem(`seen:${key}`, '1')
  } catch {
    // Not being able to remember just means the page types again.
  }
}

/**
 * Wrapper for one page. Everything inside types out in order, top to bottom.
 * Enter or Space skips the typing; navigating away wipes the screen.
 *
 * Give it a `seenKey` to type only on the first visit in this tab: on later
 * visits everything appears at once, without typing or key sounds.
 */
export function Screen({ children, className, seenKey }: ScreenProps) {
  const ref = useRef<HTMLElement>(null)
  const seq = useMemo(() => {
    const sequencer = new Sequencer()
    if (seenKey && wasSeen(seenKey)) sequencer.fast = true
    return sequencer
    // Decided once, when the screen is created.
  }, [])

  useEffect(() => {
    if (seenKey) markSeen(seenKey)
  }, [seenKey])

  useEffect(() => {
    setCurrentScreen(ref.current)
    ref.current?.closest('.crt-source')?.scrollTo(0, 0)
    return () => setCurrentScreen(null)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (seq.busy && !seq.fast && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        seq.fast = true
      }
    }
    // Capture phase, so this runs before the page-scroll keys in __root.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [seq])

  return (
    <SequencerContext.Provider value={seq}>
      <main ref={ref} className={className ? `screen ${className}` : 'screen'}>
        {children}
      </main>
    </SequencerContext.Provider>
  )
}

interface RevealProps {
  as?: 'div' | 'p' | 'h2' | 'section' | 'ul' | 'pre' | 'figure'
  className?: string
  /** Pause before appearing, in ms. */
  delay?: number
  /** Trusted HTML to render instead of children. */
  html?: string
  children?: ReactNode
}

/**
 * For content that should not be typed (images, tables, rich markup): it
 * stays hidden until the lines above it have finished, then appears at once.
 */
export function Reveal({ as = 'div', className, delay = 0, html, children }: RevealProps) {
  const seq = useSequencer()
  const [on, setOn] = useState(false)

  useEffect(
    () =>
      seq.enqueue(async (task) => {
        await task.sleep(delay)
        if (!task.cancelled) setOn(true)
      }),
    [seq, delay],
  )

  return createElement(
    as,
    {
      className,
      'data-line': '',
      style: on ? undefined : { visibility: 'hidden' },
      dangerouslySetInnerHTML: html === undefined ? undefined : { __html: html },
    },
    html === undefined ? children : undefined,
  )
}
