import { isFastRoute, router, theme } from '@slowreader/core'
import {
  hiddenKeyUX,
  hotkeyKeyUX,
  jumpKeyUX,
  likelyWithKeyboard,
  menuKeyUX,
  pressKeyUX,
  startKeyUX
} from 'keyux'

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

if (!likelyWithKeyboard(window)) {
  root.classList.add('is-hotkey-disabled')
}

startKeyUX(window, [
  pressKeyUX('is-pseudo-active'),
  hotkeyKeyUX(),
  menuKeyUX(),
  jumpKeyUX(),
  hiddenKeyUX()
])
