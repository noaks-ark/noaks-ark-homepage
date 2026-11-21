const FILES = Array.from({ length: 8 }, (_, i) => `/sounds/keydown${i + 1}.wav`)

interface Sample {
  buffer: AudioBuffer
  /** Seconds of near-silence before the click, skipped on playback. */
  onset: number
}

let ctx: AudioContext | null = null
let samples: Sample[] = []
let last = -1
let muted = false

function findOnset(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0)
  let peak = 0
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  const threshold = peak * 0.1
  let i = 0
  while (i < data.length && Math.abs(data[i]) < threshold) i++
  return Math.max(0, i / buffer.sampleRate - 0.003)
}

/**
 * Browsers only allow audio after a user gesture, so call this from a key or
 * pointer handler (Boot does). Safe to call more than once.
 */
export function unlockAudio() {
  if (ctx) {
    void ctx.resume()
    return
  }
  ctx = new AudioContext()
  const audio = ctx
  void Promise.all(
    FILES.map(async (url) => {
      const buffer = await audio.decodeAudioData(await (await fetch(url)).arrayBuffer())
      return { buffer, onset: findOnset(buffer) }
    }),
  )
    .then((loaded) => {
      samples = loaded
    })
    .catch((err) => console.warn('[audio] could not load key sounds', err))
}

/** Plays one random key click, never the same sample twice in a row. */
export function playKey(volume = 0.5) {
  if (!ctx || muted || samples.length === 0 || ctx.state !== 'running') return
  let index = Math.floor(Math.random() * samples.length)
  if (index === last) index = (index + 1) % samples.length
  last = index

  const { buffer, onset } = samples[index]
  const node = ctx.createBufferSource()
  node.buffer = buffer
  node.playbackRate.value = 0.94 + Math.random() * 0.12
  const gain = ctx.createGain()
  gain.gain.value = volume * (0.8 + Math.random() * 0.2)
  node.connect(gain).connect(ctx.destination)
  node.start(0, onset)
}

export function toggleMute() {
  muted = !muted
  return muted
}
