import { useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { toggleMute } from './audio'
import { goUp } from './navigate'

// Nerd Font icons: fa-arrow_left, fa-volume_up, fa-volume_off.
const ICON = { back: '', sound: '', muted: '' }

/** Longest path shown before the middle is cut out. */
const MAX_PATH = 24

function shorten(pathname: string) {
  const path = pathname === '/' ? '~' : `~${pathname}`
  if (path.length <= MAX_PATH) return path
  const last = pathname.split('/').filter(Boolean).pop() ?? ''
  return `~/…/${last}`.slice(0, MAX_PATH)
}

/**
 * Touch-only status line pinned to the bottom of the screen (theme.css hides
 * it everywhere else). It gives phones what the keyboard gives desktop:
 * a way back (Escape) and a mute switch (M).
 */
export function StatusBar() {
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [muted, setMuted] = useState(false)

  return (
    <footer className="statusbar">
      {pathname !== '/' && (
        <button type="button" className="statusbar-button" onClick={() => void goUp(router)}>
          {ICON.back} back
        </button>
      )}
      <span className="statusbar-path">{shorten(pathname)}</span>
      <button
        type="button"
        className="statusbar-button"
        aria-pressed={muted}
        onClick={() => setMuted(toggleMute())}
      >
        {/* Two spaces: these icons are wider than one character cell. */}
        {muted ? `${ICON.muted}  muted` : `${ICON.sound}  sound`}
      </button>
    </footer>
  )
}
