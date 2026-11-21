/**
 * Copies a live DOM subtree onto a 2D canvas, using the browser's own layout.
 *
 * Supported: text (font, colour, letter-spacing, uppercase, underline),
 * background colours, solid borders, opacity, visibility, and
 * <img>/<canvas>/<video>. Anything else (shadows, gradients, transforms,
 * pseudo-elements, SVG) is laid out but not drawn.
 */

const range = document.createRange()
const TRANSPARENT = /^(transparent|rgba\(0, 0, 0, 0\))$/

type Ctx = CanvasRenderingContext2D
let ctx: Ctx
let viewW = 0
let viewH = 0

export function paint(target: Ctx, root: HTMLElement, width: number, height: number, dpr: number) {
  ctx = target
  viewW = width
  viewH = height
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // The root itself is invisible (opacity: 0), so only its background is read.
  const bg = getComputedStyle(root).backgroundColor
  if (!TRANSPARENT.test(bg)) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
  }
  paintChildren(root, getComputedStyle(root), 1, false)
}

function onScreen(r: DOMRect) {
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < viewH && r.right > 0 && r.left < viewW
}

function paintChildren(el: Element, cs: CSSStyleDeclaration, alpha: number, underline: boolean) {
  const visible = cs.visibility === 'visible'
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      if (visible) paintText(child as Text, cs, alpha, underline)
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      paintElement(child as Element, alpha, underline)
    }
  }
}

function paintElement(el: Element, parentAlpha: number, underline: boolean) {
  const cs = getComputedStyle(el)
  if (cs.display === 'none') return
  const alpha = parentAlpha * parseFloat(cs.opacity)
  if (alpha < 0.01) return

  if (cs.visibility === 'visible') {
    ctx.globalAlpha = alpha
    // Inline elements can span several line boxes; blocks have one rect.
    const rects = cs.display.startsWith('inline') ? el.getClientRects() : [el.getBoundingClientRect()]
    for (const r of rects) {
      if (!onScreen(r)) continue
      if (!TRANSPARENT.test(cs.backgroundColor)) {
        ctx.fillStyle = cs.backgroundColor
        ctx.fillRect(r.left, r.top, r.width, r.height)
      }
      paintBorders(cs, r)
      if (el instanceof HTMLImageElement) {
        if (el.complete && el.naturalWidth > 0) ctx.drawImage(el, r.left, r.top, r.width, r.height)
      } else if (el instanceof HTMLCanvasElement || el instanceof HTMLVideoElement) {
        ctx.drawImage(el, r.left, r.top, r.width, r.height)
      }
    }
  }

  paintChildren(el, cs, alpha, underline || cs.textDecorationLine.includes('underline'))
}

function paintBorders(cs: CSSStyleDeclaration, r: DOMRect) {
  const top = cs.borderTopStyle === 'none' ? 0 : parseFloat(cs.borderTopWidth)
  const right = cs.borderRightStyle === 'none' ? 0 : parseFloat(cs.borderRightWidth)
  const bottom = cs.borderBottomStyle === 'none' ? 0 : parseFloat(cs.borderBottomWidth)
  const left = cs.borderLeftStyle === 'none' ? 0 : parseFloat(cs.borderLeftWidth)
  if (top) {
    ctx.fillStyle = cs.borderTopColor
    ctx.fillRect(r.left, r.top, r.width, top)
  }
  if (bottom) {
    ctx.fillStyle = cs.borderBottomColor
    ctx.fillRect(r.left, r.bottom - bottom, r.width, bottom)
  }
  if (left) {
    ctx.fillStyle = cs.borderLeftColor
    ctx.fillRect(r.left, r.top, left, r.height)
  }
  if (right) {
    ctx.fillStyle = cs.borderRightColor
    ctx.fillRect(r.right - right, r.top, right, r.height)
  }
}

function paintText(node: Text, cs: CSSStyleDeclaration, alpha: number, underline: boolean) {
  const text = node.data
  if (!text.trim()) return

  range.selectNodeContents(node)
  const bounds = range.getBoundingClientRect()
  if (!onScreen(bounds)) return

  ctx.globalAlpha = alpha
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  ctx.fillStyle = cs.color
  ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
  const metrics = ctx.measureText('Mg')
  // Where the baseline sits inside an inline box, as a fraction of its height.
  const baseline =
    metrics.fontBoundingBoxAscent / (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)
  const upper = cs.textTransform === 'uppercase'
  const thickness = Math.max(1, parseFloat(cs.fontSize) / 14)

  const draw = (str: string, left: number, top: number, width: number, height: number) => {
    const y = top + height * baseline
    ctx.fillText(upper ? str.toUpperCase() : str, left, y)
    if (underline) ctx.fillRect(left, y + thickness * 1.5, width, thickness)
  }

  // Fast path: the whole node sits on one line and no whitespace was collapsed.
  const rects = range.getClientRects()
  const collapses = !cs.whiteSpace.startsWith('pre') || cs.whiteSpace === 'pre-line'
  if (rects.length === 1 && !(collapses && /^\s|\s\s|[\n\r\t]/.test(text))) {
    const r = rects[0]
    draw(text, r.left, r.top, r.width, r.height)
    return
  }

  // Slow path: measure each character and merge neighbours into per-line runs.
  let run = ''
  let left = 0
  let top = 0
  let right = 0
  let height = 0
  const flush = () => {
    if (run.trim() && top < viewH && top + height > 0) draw(run, left, top, right - left, height)
    run = ''
  }
  for (let i = 0; i < text.length; ) {
    const size = text.codePointAt(i)! > 0xffff ? 2 : 1
    range.setStart(node, i)
    range.setEnd(node, i + size)
    const r = range.getClientRects()[0]
    const ch = text.slice(i, i + size)
    i += size
    if (!r || r.width === 0) continue // collapsed whitespace or a line break
    if (run && Math.abs(r.top - top) < 1 && Math.abs(r.left - right) < 1) {
      run += ch
      right = r.right
    } else {
      flush()
      run = ch
      left = r.left
      top = r.top
      right = r.right
      height = r.height
    }
  }
  flush()
}

/**
 * Redraws only the playing videos, on top of the last full paint.
 * Returns true if anything was drawn.
 */
export function paintVideos(target: Ctx, root: HTMLElement, width: number, height: number, dpr: number) {
  let drawn = false
  for (const video of root.querySelectorAll('video')) {
    if (video.paused || video.readyState < 2) continue
    const r = video.getBoundingClientRect()
    if (r.width === 0 || r.bottom <= 0 || r.top >= height || r.right <= 0 || r.left >= width) continue
    if (getComputedStyle(video).visibility !== 'visible') continue
    target.setTransform(dpr, 0, 0, dpr, 0, 0)
    target.globalAlpha = 1
    target.drawImage(video, r.left, r.top, r.width, r.height)
    drawn = true
  }
  return drawn
}
