import { fromMediaQuery } from '@nanostores/media-query'
import { theme } from '@slowreader/core'
import { computed } from 'nanostores'

let systemTheme = fromMediaQuery(
  '(prefers-color-scheme: dark)',
  'dark',
  'light'
)

export const pageTheme = computed([theme, systemTheme], (settings, system) => {
  return settings === 'system' ? system : settings
})
