import { isSlowRoute, router, theme } from '@slowreader/core'

import { likelyToHavePhysicalKeyboard } from '../lib/hotkeys.js'
import { locale } from '../stores/locale.js'

let root = document.documentElement

router.subscribe(route => {
  root.classList.toggle('is-slow-theme', isSlowRoute(route))
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark-theme', themeValue === 'dark')
  root.classList.toggle('is-light-theme', themeValue === 'light')
})

locale.subscribe(localeValue => {
  root.lang = localeValue
})

if (!likelyToHavePhysicalKeyboard()) {
  root.classList.add('is-hotkey-disabled')
}
