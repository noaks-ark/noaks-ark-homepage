import { createFileRoute } from '@tanstack/react-router'
import { Item, Menu, Screen, Typed } from '../terminal'

export const Route = createFileRoute('/about')({ component: About })

// Placeholder content: replace with your own text.
function About() {
  return (
    <Screen>
      <Typed as="h1">About</Typed>
      <Typed speed={14}>
        This is placeholder text. Write a couple of sentences about who you are and what you build.
        Long paragraphs wrap like normal HTML, because they are normal HTML.
      </Typed>
      <Typed speed={14}>Add as many paragraphs as you like: each one types out after the one above it.</Typed>
      <Menu>
        <Item to="/">Back</Item>
      </Menu>
    </Screen>
  )
}
