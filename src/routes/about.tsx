import { createFileRoute } from '@tanstack/react-router'
import { Item, Menu, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/about')({ component: About })

/** Long paragraphs type faster than headings and menu rows. */
const SPEED = 14

function About() {
  return (
    <Screen>
      <Typed as="h1">About</Typed>
      <Typed speed={SPEED}>
        I'm Noah Lundberg, a creative developer currently working at{' '}
        <a href="https://www.pigello.se/">Pigello</a>.
      </Typed>
      <Typed speed={SPEED}>
        I graduated from Hyper Island in 2023, worked at{' '}
        <a href="https://www.deptagency.com/">DEPT Amsterdam</a> for two years, and have been at Pigello
        since 2025.
      </Typed>

      <Typed as="h2">Trivia</Typed>
      <Typed className="item" speed={SPEED}>
        - Got into code by making games. The first one I was proud of was{' '}
        <a href="/projects/savemissx">SavemissX</a>, a 2D side-scroller, in 2019.
      </Typed>
      <Typed className="item" speed={SPEED}>
        - Based in Stockholm.
      </Typed>
      <Typed className="item" speed={SPEED}>
        - Lives in Ghostty and Neovim. The colours here are borrowed from my terminal theme, Everforest.
      </Typed>

      <Menu>
        <Item to="/">Back</Item>
      </Menu>
    </Screen>
  )
}
