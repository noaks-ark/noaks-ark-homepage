import { createFileRoute } from '@tanstack/react-router'
import { Item, Menu, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/contact')({ component: Contact })

// Placeholder links: replace with your own.
function Contact() {
  return (
    <Screen>
      <Typed as="h1">Contact</Typed>
      <Menu>
        <Item href="mailto:hello@example.com" note="hello@example.com">
          Email
        </Item>
        <Item href="https://github.com" note="github.com/your-handle">
          GitHub
        </Item>
        <Item to="/">Back</Item>
      </Menu>
    </Screen>
  )
}
