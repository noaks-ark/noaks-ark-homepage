import {
  Children,
  createElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useRouter } from '@tanstack/react-router'
import { playKey } from './audio'
import { Cursor } from './Cursor'
import { go } from './navigate'
import { useSequencer } from './sequencer'

export interface TypedOptions {
  /** Average milliseconds per character. */
  speed?: number
  /** Pause before the first character, in ms. */
  delay?: number
}

/** A run of typed text, optionally a link. */
export interface Segment {
  text: string
  href?: string
  /** Wraps the segment in a <span> with this class. */
  className?: string
}

/** Flattens JSX children to the plain string that gets typed. */
export function textOf(children: ReactNode) {
  return segmentsOf(children)
    .map((s) => s.text)
    .join('')
}

/**
 * Splits JSX children into typed segments. Plain text and <a href> elements
 * are understood; anything else is ignored.
 */
export function segmentsOf(children: ReactNode): Segment[] {
  return Children.toArray(children).flatMap((child): Segment[] => {
    if (typeof child === 'string' || typeof child === 'number') return [{ text: String(child) }]
    if (isValidElement<{ href?: string; children?: ReactNode }>(child) && child.type === 'a') {
      return [{ text: textOf(child.props.children), href: child.props.href }]
    }
    return []
  })
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

/** A link inside typed text. Internal links wipe the screen first. */
function TypedLink({ href, children }: { href: string; children: string }) {
  const router = useRouter()
  if (!href.startsWith('/')) {
    return (
      <a href={href} target="_blank" rel="noopener">
        {children}
      </a>
    )
  }
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // let the browser open a new tab
    e.preventDefault()
    void go(router, href)
  }
  return (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  )
}

interface TypedTextProps {
  text: string
  shown: number
  typing: boolean
  /** Pass these when the text contains links; otherwise `text` is enough. */
  segments?: Segment[]
}

/**
 * The typed part, a cursor while typing, and the rest kept invisible so the
 * line already takes up its final space and nothing reflows mid-word.
 */
export function TypedText({ text, shown, typing, segments }: TypedTextProps) {
  let offset = 0
  const visible = (segments ?? [{ text }]).map((segment, i) => {
    const part = segment.text.slice(0, Math.max(0, shown - offset))
    offset += segment.text.length
    if (!part) return null
    if (segment.href) {
      return (
        <TypedLink key={i} href={segment.href}>
          {part}
        </TypedLink>
      )
    }
    if (segment.className) {
      return (
        <span key={i} className={segment.className}>
          {part}
        </span>
      )
    }
    return part
  })
  return (
    <>
      {visible}
      {typing && <Cursor blink={false} />}
      {shown < text.length && <span style={{ visibility: 'hidden' }}>{text.slice(shown)}</span>}
    </>
  )
}

interface TypedProps extends TypedOptions {
  /** Which tag to render. Defaults to a paragraph. */
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'span' | 'li' | 'pre'
  className?: string
  /** Plain text, optionally with <a href="..."> links in it. */
  children: ReactNode
}

/** A line or paragraph of text that types itself out, with key sounds. */
export function Typed({ as = 'p', className, children, ...options }: TypedProps) {
  const segments = segmentsOf(children)
  const text = segments.map((s) => s.text).join('')
  const { ref, shown, typing } = useTyped(text, options)
  return createElement(
    as,
    { ref, className, 'data-line': '' },
    <TypedText text={text} shown={shown} typing={typing} segments={segments} />,
  )
}
