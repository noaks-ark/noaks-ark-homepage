import { createFileRoute } from '@tanstack/react-router'
import { heroOf, projects, toBlocks } from '../data/projects'
import { Item, Menu, Reveal, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/projects/$id')({ component: ProjectPage })

/** Pause between description blocks appearing, in ms. */
const BLOCK_DELAY = 45

function ProjectPage() {
  const { id } = Route.useParams()
  const project = projects.find((p) => p.mediaName === id)

  if (!project) {
    return (
      <Screen>
        <Typed as="h1">{`No such project: ${id}`}</Typed>
        <Menu>
          <Item to="/projects">Back</Item>
        </Menu>
      </Screen>
    )
  }

  const video = heroOf(project)?.video
  const meta = [project.date, project.category].filter(Boolean).join(' · ')

  return (
    // The key restarts the typing if you move straight between two projects.
    <Screen key={project.mediaName} className="project" seenKey={`/projects/${project.mediaName}`}>
      <Typed as="h1">{project.title}</Typed>
      {meta && (
        <Reveal as="p" className="meta">
          {meta}
        </Reveal>
      )}
      <Menu direction="row">
        <Item to="/projects">Back</Item>
        {project.projectLink && <Item href={project.projectLink}>Visit site</Item>}
      </Menu>
      {video && (
        <Reveal className="video">
          <video src={video} autoPlay muted loop playsInline />
        </Reveal>
      )}
      {toBlocks(project).map((block, i) =>
        block.kind === 'rule' ? (
          <Reveal key={i} className="rule" delay={BLOCK_DELAY} />
        ) : (
          <Reveal
            key={i}
            as={block.kind === 'subhead' ? 'h2' : block.kind === 'figure' ? 'figure' : 'p'}
            className={block.kind}
            delay={BLOCK_DELAY}
            html={block.html}
          />
        ),
      )}
      <Reveal as="p" className="hint" delay={BLOCK_DELAY}>
        ↑/↓ scroll · ←/→ select · enter open · esc back
      </Reveal>
    </Screen>
  )
}
