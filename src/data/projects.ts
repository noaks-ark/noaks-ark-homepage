import raw from './projects.json'

/**
 * One entry in projects.json. To add a project, add an object there; if it
 * has a demo video, put it at public/videos/demos/{mediaName}_demo.mp4,
 * otherwise set "noMedia": true.
 */
export interface Project {
  title: string
  date: string
  category: string
  /** Used for the URL (/projects/{mediaName}) and the video file name. */
  mediaName: string
  noMedia?: boolean
  projectLink?: string
  /** One HTML string per paragraph, list item, figure or <hr>. */
  description: string[]
}

export const projects = raw as Project[]

const FIGURE = /^<figure>(.*)<\/figure>$/
const IMG_SRC = /<img src='([^']+)'/

export interface Hero {
  video?: string
  image?: string
}

/**
 * The one piece of media that represents a project: its demo video if it
 * has one, otherwise the image its description opens with, otherwise nothing.
 */
export function heroOf(project: Project): Hero | null {
  if (!project.noMedia) return { video: `/videos/demos/${project.mediaName}_demo.mp4` }
  const image = FIGURE.test(project.description[0] ?? '') && IMG_SRC.exec(project.description[0])?.[1]
  return image ? { image } : null
}

export interface Block {
  kind: 'text' | 'item' | 'subhead' | 'figure' | 'rule'
  html: string
}

const SUBHEAD = /^<strong style='font-size:1\.5rem;'>(.*)<\/strong>$/
const ITEM = /^<li>(.*)<\/li>$/
/**
 * Sorts the description strings into the kinds of block the page styles.
 * When the project has a video, an opening image is dropped so the page
 * leads with the video alone.
 */
export function toBlocks(project: Project): Block[] {
  const lines = project.description
  const skipFirst = !project.noMedia && FIGURE.test(lines[0]?.trim() ?? '')
  return (skipFirst ? lines.slice(1) : lines).map((line): Block => {
    const html = line.trim()
    if (html === '<hr>') return { kind: 'rule', html: '' }
    const subhead = SUBHEAD.exec(html)
    if (subhead) return { kind: 'subhead', html: subhead[1] }
    // List bullets are pseudo-elements, which the CRT cannot draw, so the
    // dash is written into the text.
    const item = ITEM.exec(html)
    if (item) return { kind: 'item', html: `- ${item[1]}` }
    const figure = FIGURE.exec(html)
    if (figure) return { kind: 'figure', html: figure[1] }
    return { kind: 'text', html }
  })
}
