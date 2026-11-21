/**
 * Every CRT knob in one place. Numeric keys are sent to crt.frag.glsl as
 * uniforms of the same name, and are re-read every frame, so in dev you can
 * tweak them live from the console: `crt.warp = 1`.
 */
export const crtConfig = {
  /** Screen curvature. Same maths as bettercrt.glsl (which uses 0.25). */
  warp: 0.4,
  /** Darkness between scanlines. Same maths as bettercrt.glsl (0.5 there). */
  scan: 0.9,
  /** Height of one scanline in CSS pixels. */
  scanSize: 1.5,
  /** Phosphor bloom around bright pixels. */
  glow: 0.5,
  /** Red/blue fringing towards the edges. */
  aberration: 0.35,
  /** Darkening towards the corners. */
  vignette: 0.45,
  /** Brightness flicker. */
  flicker: 0.03,
  /** Film grain. */
  noise: 0.05,
  /** Brightness of the slow band that rolls down the screen. */
  roll: 0.04,
  /** Corner radius of the glass in CSS pixels. */
  corner: 28,
  /** Colour outside the glass. */
  bezel: '#030506',
  /** Cap on devicePixelRatio, to keep the texture upload cheap. */
  maxDpr: 2,
  /** Length of the power-on sweep in ms (plays when the visitor boots). */
  powerOnMs: 700,
  /** Length of the fade-in when the page first loads, in ms. */
  fadeInMs: 600,
}

/**
 * Overrides for narrow screens (max-width: 700px, the same breakpoint as the
 * Mobile section of theme.css). Less curvature keeps text straight on a tall
 * narrow screen and makes taps land where the text is drawn.
 */
export const crtMobile: Partial<typeof crtConfig> = {
  warp: 0.2,
  corner: 16,
}

if (import.meta.env.DEV) {
  ;(window as unknown as { crt: typeof crtConfig }).crt = crtConfig
}
