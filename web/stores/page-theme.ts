import { type Theme, theme as themeSettings } from '@slowreader/core'
import { atom, computed, type ReadableAtom } from 'nanostores'

type PageTheme = Omit<Theme, 'system'>

let media = window.matchMedia('(prefers-color-scheme: dark)')
let systemTheme = atom<PageTheme>(media.matches ? 'dark' : 'light')
media.addEventListener('change', event => {
  systemTheme.set(event.matches ? 'dark' : 'light')
})

export const pageTheme: ReadableAtom<PageTheme> = computed(
  [themeSettings, systemTheme],
  (settings, system) => {
    return settings === 'system' ? system : settings
  }
)
