import { createFileRoute } from '@tanstack/react-router'
import { Item, Menu, Reveal, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <Screen>
      <Typed as="h1">Welcome to Noaks Ark</Typed>
      <Menu>
        <Item to="/projects">Projects</Item>
        <Item to="/about">About</Item>
        <Item to="/contact">Contact</Item>
      </Menu>
      <Reveal as="p" className="hint">
        ↑/↓ select · enter open · esc back · m mute
      </Reveal>
    </Screen>
  )
}
