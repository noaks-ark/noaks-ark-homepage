import { useEffect, useState } from 'react'

/**
 * Block cursor. Blinks with a timer rather than a CSS animation so the CRT
 * only has to repaint twice a second while idle. Pass blink={false} while
 * typing so it stays solid.
 */
export function Cursor({ blink = true }: { blink?: boolean }) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (!blink) {
      setOn(true)
      return
    }
    const id = setInterval(() => setOn((v) => !v), 530)
    return () => clearInterval(id)
  }, [blink])

  return <span className="cursor" aria-hidden style={on ? undefined : { visibility: 'hidden' }} />
}
