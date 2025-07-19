import { type Theme, theme as themeSettings } from '@slowreader/core'
import { atom, computed } from 'nanostores'

let media = window.matchMedia('(prefers-color-scheme: dark)')
let systemTheme = atom<Omit<Theme, 'system'>>(media.matches ? 'dark' : 'light')
media.addEventListener('change', event => {
  systemTheme.set(event.matches ? 'dark' : 'light')
})

export const theme = computed(
  [themeSettings, systemTheme],
  (settings, system) => {
    return settings === 'system' ? system : settings
  }
)
