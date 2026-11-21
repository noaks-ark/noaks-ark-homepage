import { createFileRoute } from '@tanstack/react-router'
import { Item, Menu, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/contact')({ component: Contact })

function Contact() {
  return (
    <Screen>
      <Typed as="h1">Contact</Typed>
      <Menu>
        <Item href="https://github.com/noaks-ark/" note="github.com/noaks-ark">
          GitHub
        </Item>
        <Item href="mailto:nhlund@gmail.com" note="nhlund@gmail.com">
          Email
        </Item>
        <Item href="https://se.linkedin.com/in/noah-lundberg-02142021b" note="linkedin.com/in/noah-lundberg">
          LinkedIn
        </Item>
        <Item to="/">Back</Item>
      </Menu>
    </Screen>
  )
}
