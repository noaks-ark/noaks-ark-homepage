import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useRouter } from '@tanstack/react-router'
import { playKey } from './audio'
import { go } from './navigate'
import { useSequencer } from './sequencer'
import { textOf, TypedText, useTyped } from './Typed'

interface MenuState {
  /** Id of the highlighted item, once the menu has finished typing. */
  selected: string | null
  register(id: string, activate: () => void, value?: string): () => void
  select(id: string): void
  highlight(value: string | undefined): void
}

const MenuContext = createContext<MenuState | null>(null)

/**
 * A keyboard menu. Up/Down (or k/j) move, Enter opens. Hover and click work
 * too. It only takes input once its items have finished typing.
 *
 * direction="row" puts the items on one line and uses Left/Right (or h/l)
 * instead, which leaves Up/Down free to scroll a long page.
 */
export function Menu({ children, direction = 'column', defaultValue, onHighlight }: MenuProps) {
  const seq = useSequencer()
  const actions = useRef(new Map<string, () => void>())
  const values = useRef(new Map<string, string | undefined>())
  const onHighlightRef = useRef(onHighlight)
  onHighlightRef.current = onHighlight
  const highlight = useCallback((value: string | undefined) => onHighlightRef.current?.(value), [])
  const [ids, setIds] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)

  const register = useCallback((id: string, activate: () => void, value?: string) => {
    actions.current.set(id, activate)
    values.current.set(id, value)
    setIds((prev) => [...prev, id])
    return () => {
      actions.current.delete(id)
      values.current.delete(id)
      setIds((prev) => prev.filter((x) => x !== id))
    }
  }, [])

  const idsRef = useRef(ids)
  idsRef.current = ids
  const select = useCallback((id: string) => {
    const i = idsRef.current.indexOf(id)
    if (i >= 0) setIndex(i)
  }, [])

  // Queued after the items (child effects run first), so it fires last.
  useEffect(
    () =>
      seq.enqueue(() => {
        const start = idsRef.current.findIndex((id) => defaultValue && values.current.get(id) === defaultValue)
        if (start >= 0) setIndex(start)
        setReady(true)
      }),
    // defaultValue only matters at the moment the menu becomes ready.
    [seq],
  )

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const [next, prev] = direction === 'row' ? ['ArrowRight', 'ArrowLeft'] : ['ArrowDown', 'ArrowUp']
      const [nextKey, prevKey] = direction === 'row' ? ['l', 'h'] : ['j', 'k']
      const step = e.key === next || e.key === nextKey ? 1 : e.key === prev || e.key === prevKey ? -1 : 0
      // With a single item there is nothing to move between, so the key is
      // left for __root, which scrolls the page.
      if (step && ids.length > 1) {
        e.preventDefault()
        setIndex((i) => (i + step + ids.length) % ids.length)
        playKey(0.35)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        playKey()
        actions.current.get(ids[index])?.()
      }
    }
    // Capture phase, so this runs before the page-scroll keys in __root.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [ready, ids, index, direction])

  const selected = ready ? (ids[Math.min(index, ids.length - 1)] ?? null) : null

  return (
    <MenuContext.Provider value={{ selected, register, select, highlight }}>
      <nav className="menu" data-direction={direction}>
        {children}
      </nav>
    </MenuContext.Provider>
  )
}

interface MenuProps {
  children: ReactNode
  direction?: 'column' | 'row'
  /** `value` of the item to start on, instead of the first one. */
  defaultValue?: string
  /** Called with the selected item's `value` whenever the selection moves. */
  onHighlight?: (value: string | undefined) => void
}

interface ItemProps {
  /** Identifies this item to the menu's onHighlight and defaultValue. */
  value?: string
  /** Internal route, e.g. "/about". The screen is wiped before navigating. */
  to?: string
  /** External link or mailto:. */
  href?: string
  /** Custom action instead of navigation. */
  onSelect?: () => void
  /** Dim text shown after the label once it has typed. */
  note?: string
  /** Plain text label. */
  children: ReactNode
}

/** One row in a <Menu>. */
export function Item({ value, to, href, onSelect, note, children }: ItemProps) {
  const id = useId()
  const menu = useContext(MenuContext)
  const router = useRouter()
  const text = textOf(children)
  const { ref, shown, typing, done } = useTyped(text)

  const activate = () => {
    if (onSelect) onSelect()
    else if (to) void go(router, to)
    else if (href?.startsWith('mailto:')) window.location.href = href
    else if (href) window.open(href, '_blank', 'noopener')
  }
  const latest = useRef(activate)
  latest.current = activate

  const register = menu?.register
  useEffect(() => register?.(id, () => latest.current(), value), [register, id, value])

  const selected = menu?.selected === id
  const highlight = menu?.highlight
  useEffect(() => {
    if (!selected) return
    ref.current?.scrollIntoView({ block: 'nearest' })
    highlight?.(value)
  }, [selected, ref, highlight, value])
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // let the browser open a new tab
    e.preventDefault()
    playKey()
    activate()
  }

  return (
    <a
      ref={ref as Ref<HTMLAnchorElement>}
      className="item"
      data-line=""
      data-selected={selected || undefined}
      aria-current={selected || undefined}
      href={to ?? href}
      onClick={onClick}
      onPointerEnter={() => menu?.select(id)}
    >
      <span className="item-marker">{selected ? '> ' : '  '}</span>
      <span className="item-label">
        <TypedText text={text} shown={shown} typing={typing} />
      </span>
      {note && (
        <span className="item-note" style={done ? undefined : { visibility: 'hidden' }}>
          {'  '}
          {note}
        </span>
      )}
    </a>
  )
}
