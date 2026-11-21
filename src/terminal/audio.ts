const KEY_FILES = Array.from({ length: 8 }, (_, i) => `/sounds/keydown${i + 1}.wav`)
const BOOT_FILE = '/sounds/boot.mp3'
const STATIC_FILE = '/sounds/static.m4a'

interface Sample {
  buffer: AudioBuffer
  /** Seconds of near-silence before the sound, skipped on playback. */
  onset: number
}

// Downloading needs no user gesture, only playback does. So the files are
// fetched as soon as the page loads and are ready to decode at the key press.
const download = (url: string) => fetch(url).then((res) => res.arrayBuffer())
const bootBytes = download(BOOT_FILE)
const staticBytes = download(STATIC_FILE)
const keyBytes = KEY_FILES.map(download)
// Failures are reported when the sounds are decoded, in unlockAudio.
for (const pending of [bootBytes, staticBytes, ...keyBytes]) pending.catch(() => {})

let ctx: AudioContext | null = null
/** Everything plays through this, so muting is one volume change. */
let master: GainNode | null = null
let keys: Sample[] = []
let boot: Promise<Sample> | null = null
let hum: Promise<Sample> | null = null
let humStarted = false
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

async function decode(audio: AudioContext, bytes: Promise<ArrayBuffer>): Promise<Sample> {
  const buffer = await audio.decodeAudioData(await bytes)
  return { buffer, onset: findOnset(buffer) }
}

function play({ buffer, onset }: Sample, volume: number, rate = 1) {
  if (!ctx || !master) return
  const node = ctx.createBufferSource()
  node.buffer = buffer
  node.playbackRate.value = rate
  const gain = ctx.createGain()
  gain.gain.value = volume
  node.connect(gain).connect(master)
  node.start(0, onset)
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
  master = audio.createGain()
  master.connect(audio.destination)
  // A looping sound should not keep playing in a background tab.
  document.addEventListener('visibilitychange', () => {
    void (document.hidden ? audio.suspend() : audio.resume())
  })
  boot = decode(audio, bootBytes)
  boot.catch((err) => console.warn('[audio] could not load the boot sound', err))
  hum = decode(audio, staticBytes)
  hum.catch((err) => console.warn('[audio] could not load the static sound', err))
  Promise.all(keyBytes.map((bytes) => decode(audio, bytes)))
    .then((loaded) => {
      keys = loaded
    })
    .catch((err) => console.warn('[audio] could not load key sounds', err))
}

/** Plays the power-on sound once. Call after unlockAudio. */
export function playBoot(volume = 0.6) {
  void boot?.then((sample) => play(sample, volume), () => {})
}

/**
 * Starts the CRT static, looping for as long as the page is open. It fades
 * in over `fadeSeconds` so it slides in under the power-on sound. Call after
 * unlockAudio; calling it again does nothing.
 */
export function startStatic(volume = 0.5, fadeSeconds = 2) {
  if (humStarted) return
  humStarted = true
  void hum?.then(({ buffer }) => {
    if (!ctx || !master) return
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.loop = true
    // Compressed files have a sliver of silence at each end; looping just
    // inside it avoids a gap every time the sound comes round.
    node.loopStart = 0.1
    node.loopEnd = buffer.duration - 0.1
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeSeconds)
    node.connect(gain).connect(master)
    node.start(0, 0.1)
  }, () => {})
}

/** Plays one random key click, never the same sample twice in a row. */
export function playKey(volume = 0.5) {
  if (!ctx || keys.length === 0 || ctx.state !== 'running') return
  let index = Math.floor(Math.random() * keys.length)
  if (index === last) index = (index + 1) % keys.length
  last = index
  play(keys[index], volume * (0.8 + Math.random() * 0.2), 0.94 + Math.random() * 0.12)
}

/** Silences or restores everything: key clicks, power-on sound and static. */
export function toggleMute() {
  muted = !muted
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03)
  return muted
}
