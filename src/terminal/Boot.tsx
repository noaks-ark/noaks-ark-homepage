import { useEffect } from 'react'
import { powerOn } from '../crt/engine'
import { unlockAudio } from './audio'
import { Cursor } from './Cursor'

/**
 * First screen after every page load. Browsers block audio until the visitor
 * interacts, so the first key or tap unlocks sound and powers the CRT on.
 */
export function Boot({ onBoot }: { onBoot: () => void }) {
  useEffect(() => {
    const boot = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        // Leave shortcuts like Cmd+R and bare modifier presses alone.
        if (e.metaKey || e.ctrlKey || e.altKey || ['Shift', 'Meta', 'Control', 'Alt', 'Tab'].includes(e.key)) return
        e.preventDefault()
      }
      unlockAudio()
      powerOn()
      onBoot()
    }
    window.addEventListener('keydown', boot)
    window.addEventListener('pointerdown', boot)
    return () => {
      window.removeEventListener('keydown', boot)
      window.removeEventListener('pointerdown', boot)
    }
  }, [onBoot])

  return (
    <main className="screen boot">
      <p className="dim">NOAKS ARK TERMINAL</p>
      <p className="dim">SYSTEM READY</p>
      <p>
        PRESS ANY KEY TO BOOT
        <Cursor />
      </p>
    </main>
  )
}
