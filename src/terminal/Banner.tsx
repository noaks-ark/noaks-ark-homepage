import { Reveal } from './Screen'

/**
 * Block-letter banner, in the style of the LazyVim dashboard logo.
 *
 * The letters are drawn with coloured rectangles rather than block
 * characters: the web font has no block glyphs, and rectangles are something
 * the CRT painter reproduces exactly. To support more letters, add a 7x5
 * bitmap to GLYPHS.
 */
const GLYPHS: Record<string, string[]> = {
  N: ['##...##', '###..##', '##.#.##', '##..###', '##...##'],
  O: ['.#####.', '##...##', '##...##', '##...##', '.#####.'],
  A: ['.#####.', '##...##', '#######', '##...##', '##...##'],
  K: ['##...##', '##..##.', '#####..', '##..##.', '##...##'],
  S: ['.######', '##.....', '.#####.', '.....##', '######.'],
  R: ['######.', '##...##', '######.', '##..##.', '##...##'],
  ' ': ['..', '..', '..', '..', '..'],
}
const ROWS = 5

interface Run {
  start: number
  length: number
}

/** The filled stretches of one pixel row, e.g. "##..#" -> [0-2), [4-5). */
function runsOf(text: string, row: number): Run[] {
  const line = [...text].map((ch) => GLYPHS[ch]?.[row] ?? GLYPHS[' '][row]).join('.')
  const runs: Run[] = []
  for (const match of line.matchAll(/#+/g)) runs.push({ start: match.index, length: match[0].length })
  return runs
}

const widthOf = (text: string) =>
  [...text].reduce((sum, ch) => sum + (GLYPHS[ch] ?? GLYPHS[' '])[0].length, 0) + text.length - 1

const cell = (run: Run) => ({
  left: `calc(var(--banner-cell) * ${run.start})`,
  width: `calc(var(--banner-cell) * ${run.length})`,
})

/**
 * Renders `text` (capital letters from GLYPHS) as the page's <h1>. Each pixel
 * row is a row for the sequencer, so the banner prints top to bottom and
 * wipes row by row like any other content.
 */
export function Banner({ text, label = text }: { text: string; label?: string }) {
  return (
    <h1 className="banner" aria-label={label} style={{ width: `calc(var(--banner-cell) * ${widthOf(text)})` }}>
      {Array.from({ length: ROWS }, (_, row) => {
        const runs = runsOf(text, row)
        return (
          <Reveal key={row} className="banner-row" delay={70}>
            {/* Shadow first, so the letters are painted over it. */}
            {runs.map((run) => (
              <span key={`s${run.start}`} className="banner-shadow" style={cell(run)} />
            ))}
            {runs.map((run) => (
              <span key={run.start} className="banner-block" style={cell(run)} />
            ))}
          </Reveal>
        )
      })}
    </h1>
  )
}
