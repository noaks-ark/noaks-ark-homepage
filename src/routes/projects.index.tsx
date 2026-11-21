import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { heroOf, projects } from '../data/projects'
import { Item, Menu, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/projects/')({ component: Projects })

// Remembers which project was selected, so coming back from a project page
// lands on the same row. Lasts for the tab.
const LAST = 'projects:last'
function readLast() {
  try {
    return sessionStorage.getItem(LAST) ?? undefined
  } catch {
    return undefined
  }
}

function Projects() {
  const [highlighted, setHighlighted] = useState<string>()
  const project = projects.find((p) => p.mediaName === highlighted)
  const hero = project && heroOf(project)

  const onHighlight = (value: string | undefined) => {
    setHighlighted(value)
    try {
      if (value) sessionStorage.setItem(LAST, value)
    } catch {
      // Private browsing: the list just starts at the top next time.
    }
  }

  return (
    <Screen className="project-list" seenKey="/projects">
      <Typed as="h1">Projects</Typed>
      <Menu defaultValue={readLast()} onHighlight={onHighlight}>
        {projects.map((p) => (
          <Item
            key={p.mediaName}
            value={p.mediaName}
            to={`/projects/${p.mediaName}`}
            note={[p.date, p.category].filter(Boolean).join(' · ')}
          >
            {p.title}
          </Item>
        ))}
        <Item to="/">Back</Item>
      </Menu>

      {/* Preview of the selected project. Hidden on narrow screens (theme.css). */}
      <aside className="preview" aria-hidden>
        {project && hero && (
          <>
            <div className="preview-media">
              {hero.video ? (
                <video key={hero.video} src={hero.video} autoPlay muted loop playsInline />
              ) : (
                <img key={hero.image} src={hero.image} alt="" />
              )}
            </div>
            <p className="preview-caption">{project.title}</p>
          </>
        )}
      </aside>
    </Screen>
  )
}
