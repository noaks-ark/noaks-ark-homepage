import { useCallback, useEffect, useState } from 'react'
import { Outlet, createRootRoute, useRouter } from '@tanstack/react-router'
import { Crt } from '../crt/Crt'
import { toggleMute } from '../terminal/audio'
import { Boot } from '../terminal/Boot'
import { go } from '../terminal/navigate'

export const Route = createRootRoute({ component: Root })

function Root() {
  const router = useRouter()
  const [booted, setBooted] = useState(false)
  const boot = useCallback(() => setBooted(true), [])

  // Global keys: Escape goes up one level, M mutes, and the usual keys scroll
  // the page unless a menu or the typing-skip already used them.
  useEffect(() => {
    if (!booted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (e.key === 'Escape') {
        const parent = router.state.location.pathname.split('/').filter(Boolean).slice(0, -1)
        void go(router, '/' + parent.join('/'))
        return
      }
      if (e.key === 'm') {
        toggleMute()
        return
      }
      const page = document.querySelector('.crt-source')
      if (!page) return
      const view = page.clientHeight
      const scroll: Record<string, number> = {
        ArrowDown: 80,
        j: 80,
        ArrowUp: -80,
        k: -80,
        PageDown: view * 0.8,
        ' ': view * 0.8,
        PageUp: -view * 0.8,
        Home: -page.scrollHeight,
        End: page.scrollHeight,
      }
      if (e.key in scroll) {
        e.preventDefault()
        page.scrollBy({ top: scroll[e.key] })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booted, router])

  return <Crt>{booted ? <Outlet /> : <Boot onBoot={boot} />}</Crt>
}
