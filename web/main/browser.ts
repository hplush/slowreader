import { devtools, isFastRoute, router, theme } from '@slowreader/core'
import {
  focusGroupKeyUX,
  hiddenKeyUX,
  hotkeyKeyUX,
  jumpKeyUX,
  likelyWithKeyboard,
  pressKeyUX,
  startKeyUX
} from 'keyux'

import { locale } from '../stores/locale.js'

let root = document.documentElement
let themeTag = document.querySelector('meta[name="theme-color"]')

function updateTheme(): void {
  let background = window
    .getComputedStyle(document.body)
    .getPropertyValue('background-color')

  if (themeTag && background) {
    themeTag.setAttribute('content', background)
  }
}

router.subscribe(route => {
  root.classList.toggle('is-slow-theme', !isFastRoute(route))
  updateTheme()
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark-theme', themeValue === 'dark')
  root.classList.toggle('is-light-theme', themeValue === 'light')
  updateTheme()
})

locale.subscribe(lang => {
  root.lang = lang
})

if (!likelyWithKeyboard(window)) {
  root.classList.add('is-hotkey-disabled')
}

window.addEventListener('load', () => {
  updateTheme()
})

startKeyUX(window, [
  pressKeyUX('is-pseudo-active'),
  hotkeyKeyUX(),
  focusGroupKeyUX(),
  jumpKeyUX(),
  hiddenKeyUX()
])

declare global {
  interface Window {
    slowreader: typeof devtools
  }
}

window.slowreader = devtools
