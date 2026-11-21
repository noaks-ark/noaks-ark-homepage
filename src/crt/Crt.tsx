import { useEffect, useRef, type ReactNode } from 'react'
import { createCrt } from './engine'

/**
 * Renders `children` as ordinary DOM in an invisible layer and mirrors that
 * layer into a WebGL canvas with the CRT shader. The DOM stays on top, so
 * links, clicks, selection and screen readers keep working.
 */
export function Crt({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const source = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const crt = createCrt(canvas.current!, source.current!)
    if (!crt) {
      // No WebGL2: show the plain DOM instead (see .no-webgl in theme.css).
      document.documentElement.classList.add('no-webgl')
      return
    }
    return crt.destroy
  }, [])

  return (
    <>
      <canvas ref={canvas} className="crt-canvas" aria-hidden />
      <div ref={source} className="crt-source">
        {children}
      </div>
    </>
  )
}
