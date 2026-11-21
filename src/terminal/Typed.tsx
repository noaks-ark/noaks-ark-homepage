import { Children, createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { playKey } from './audio'
import { Cursor } from './Cursor'
import { useSequencer } from './sequencer'

export interface TypedOptions {
  /** Average milliseconds per character. */
  speed?: number
  /** Pause before the first character, in ms. */
  delay?: number
}

/** Flattens JSX children to the plain string that gets typed. */
export function textOf(children: ReactNode) {
  return Children.toArray(children)
    .filter((c) => typeof c === 'string' || typeof c === 'number')
    .join('')
}

/**
 * Types `text` when its turn comes in the surrounding <Screen>.
 * Returns how many characters are showing and whether it is typing right now.
 */
export function useTyped(text: string, { speed = 34, delay = 0 }: TypedOptions = {}) {
  const seq = useSequencer()
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    setShown(0)
    return seq.enqueue(async (task) => {
      setTyping(true)
      ref.current?.scrollIntoView({ block: 'nearest' })
      await task.sleep(delay)
      for (let i = 1; i <= text.length && !task.cancelled && !task.fast; i++) {
        setShown(i)
        if (text[i - 1] !== ' ') playKey()
        await task.sleep(speed * (0.55 + Math.random() * 0.9))
      }
      if (task.cancelled) return
      setShown(text.length)
      setTyping(false)
    })
  }, [seq, text, speed, delay])

  return { ref, shown, typing, done: shown >= text.length }
}

/**
 * The typed part, a cursor while typing, and the rest kept invisible so the
 * line already takes up its final space and nothing reflows mid-word.
 */
export function TypedText({ text, shown, typing }: { text: string; shown: number; typing: boolean }) {
  return (
    <>
      {text.slice(0, shown)}
      {typing && <Cursor blink={false} />}
      {shown < text.length && <span style={{ visibility: 'hidden' }}>{text.slice(shown)}</span>}
    </>
  )
}

interface TypedProps extends TypedOptions {
  /** Which tag to render. Defaults to a paragraph. */
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'span' | 'li' | 'pre'
  className?: string
  /** Plain text only: the string is what gets typed. */
  children: ReactNode
}

/** A line or paragraph of text that types itself out, with key sounds. */
export function Typed({ as = 'p', className, children, ...options }: TypedProps) {
  const text = textOf(children)
  const { ref, shown, typing } = useTyped(text, options)
  return createElement(
    as,
    { ref, className, 'data-line': '' },
    <TypedText text={text} shown={shown} typing={typing} />,
  )
}
