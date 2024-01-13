import { isFastRoute, router, theme } from '@slowreader/core'

import { jumpBack, likelyToHavePhysicalKeyboard } from '../lib/hotkeys.js'
import { locale } from '../stores/locale.js'

let root = document.documentElement

router.subscribe(route => {
  root.classList.toggle('is-slow-theme', !isFastRoute(route))
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

document.body.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!e.defaultPrevented) jumpBack()
  }
})
