import { crtConfig, crtMobile } from './config'
import { paint, paintVideos } from './painter'
import fragSource from './crt.frag.glsl?raw'

// One fullscreen triangle, no buffers needed.
const vertSource = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

export interface Crt {
  /** Replay the power-on animation. */
  powerOn(): void
  /** Force a repaint of the DOM on the next frame. */
  invalidate(): void
  destroy(): void
}

let active: Crt | null = null
export const powerOn = () => active?.powerOn()

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed')
  }
  return shader
}

/** Parses a computed colour such as "rgb(239, 235, 212)". */
function cssToRgb(color: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)
  return [r / 255, g / 255, b / 255]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Mirrors `source` (a live DOM subtree) into `canvas` through the CRT shader.
 * Returns null if WebGL2 is unavailable.
 */
export function createCrt(canvas: HTMLCanvasElement, source: HTMLElement): Crt | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false })
  if (!gl) return null

  let program: WebGLProgram
  try {
    program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertSource))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed')
    }
  } catch (err) {
    console.error('[crt]', err)
    return null
  }
  gl.useProgram(program)

  const locations = new Map<string, WebGLUniformLocation | null>()
  const loc = (name: string) => {
    if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name))
    return locations.get(name)!
  }

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  // The DOM is painted here first, then uploaded as the shader's texture.
  const page = document.createElement('canvas')
  const ctx = page.getContext('2d', { alpha: false })!

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const narrow = window.matchMedia('(max-width: 700px)')
  let width = 0
  let height = 0
  let dpr = 1
  let dirty = true
  let background: [number, number, number] = [0, 0, 0]
  let raf = 0
  // The page fades in on load; the power-on sweep only runs when asked.
  let powerStart = -Infinity
  let fadeStart = -1

  const invalidate = () => {
    dirty = true
  }

  // Anything that can change what the DOM looks like marks the texture dirty.
  const mutations = new MutationObserver(invalidate)
  mutations.observe(source, { subtree: true, childList: true, characterData: true, attributes: true })
  const resizes = new ResizeObserver(invalidate)
  resizes.observe(source)
  const events = new AbortController()
  const listen = (target: EventTarget, type: string, capture = false) =>
    target.addEventListener(type, invalidate, { signal: events.signal, passive: true, capture })
  listen(window, 'resize')
  listen(window.matchMedia('(prefers-color-scheme: light)'), 'change') // system theme switched
  listen(source, 'scroll', true)
  listen(source, 'load', true) // images
  listen(source, 'loadedmetadata', true) // videos get their size
  listen(source, 'loadeddata', true)
  listen(source, 'pointermove')
  listen(source, 'pointerleave')
  listen(source, 'pointerdown') // :active styles
  listen(window, 'pointerup')
  listen(window, 'pointercancel')
  listen(source, 'focusin')
  listen(source, 'focusout')
  listen(document.fonts, 'loadingdone')
  document.fonts.ready.then(invalidate)

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)

    const nextDpr = Math.min(window.devicePixelRatio || 1, crtConfig.maxDpr)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    if (w !== width || h !== height || nextDpr !== dpr) {
      width = w
      height = h
      dpr = nextDpr
      canvas.width = page.width = Math.round(w * dpr)
      canvas.height = page.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      dirty = true
    }

    // CSS animations and transitions don't fire mutations, so poll for them.
    let upload = false
    if (dirty || source.getAnimations({ subtree: true }).length > 0) {
      dirty = false
      paint(ctx, source, width, height, dpr)
      background = cssToRgb(getComputedStyle(source).backgroundColor)
      upload = true
    } else {
      // Nothing changed except video frames: redraw only those rectangles
      // rather than walking the whole DOM 60 times a second.
      upload = paintVideos(ctx, source, width, height, dpr)
    }
    if (upload) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, page)
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    const still = reducedMotion.matches
    const config = narrow.matches ? { ...crtConfig, ...crtMobile } : crtConfig
    for (const [name, value] of Object.entries(config)) {
      if (typeof value === 'number') gl.uniform1f(loc(name), value)
    }
    if (still) {
      gl.uniform1f(loc('flicker'), 0)
      gl.uniform1f(loc('roll'), 0)
    }
    gl.uniform3fv(loc('bezel'), hexToRgb(config.bezel))
    gl.uniform3fv(loc('uBg'), background)
    gl.uniform2f(loc('uRes'), canvas.width, canvas.height)
    gl.uniform1f(loc('uDpr'), dpr)
    gl.uniform1f(loc('uTime'), still ? 0 : now / 1000)
    gl.uniform1f(loc('uPower'), still ? 1 : Math.min(1, (now - powerStart) / crtConfig.powerOnMs))
    if (fadeStart < 0) fadeStart = now
    const fade = still ? 1 : Math.min(1, (now - fadeStart) / crtConfig.fadeInMs)
    gl.uniform1f(loc('uFade'), fade * fade * (3 - 2 * fade))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  raf = requestAnimationFrame(frame)

  const crt: Crt = {
    powerOn() {
      powerStart = performance.now()
    },
    invalidate,
    destroy() {
      cancelAnimationFrame(raf)
      mutations.disconnect()
      resizes.disconnect()
      events.abort()
      gl.deleteTexture(texture)
      gl.deleteProgram(program)
      if (active === crt) active = null
    },
  }
  active = crt
  return crt
}
