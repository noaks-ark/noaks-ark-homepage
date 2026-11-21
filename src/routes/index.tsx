import { createFileRoute } from '@tanstack/react-router'
import { Banner, Item, Menu, Reveal, Screen } from '../terminal'

export const Route = createFileRoute('/')({ component: Home })

// Nerd Font icons (nerdfonts.com/cheat-sheet): fa-folder_open, fa-user, fa-envelope.
const ICON = { projects: '\uf07c', about: '\uf007', contact: '\uf0e0' }

/** Laid out like the LazyVim dashboard: banner, shortcuts, footer line. */
function Home() {
  return (
    <Screen className="home">
      <Banner text="NOAKS ARK" label="Noaks Ark" />
      <Menu variant="dashboard">
        <Item to="/projects" icon={ICON.projects} hotkey="p">
          Projects
        </Item>
        <Item to="/about" icon={ICON.about} hotkey="a">
          About
        </Item>
        <Item to="/contact" icon={ICON.contact} hotkey="c">
          Contact
        </Item>
      </Menu>
      <Reveal as="p" className="home-footer">
        ↑/↓ select · enter open · m mute
      </Reveal>
    </Screen>
  )
}
