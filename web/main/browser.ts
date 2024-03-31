import { isFastRoute, router, theme } from '@slowreader/core'
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

const actualizeThemeColor = (themeColorTag: Element | null): void => {
  let backgroundColor = window
    .getComputedStyle(document.body)
    .getPropertyValue('background-color')

  if (themeColorTag && backgroundColor) {
    themeColorTag.setAttribute('content', backgroundColor)
  }
}

let root = document.documentElement
let themeColorTag = document.querySelector('meta[name="theme-color"]')

router.subscribe(route => {
  root.classList.toggle('is-slow-theme', !isFastRoute(route))
  actualizeThemeColor(themeColorTag)
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark-theme', themeValue === 'dark')
  root.classList.toggle('is-light-theme', themeValue === 'light')
  actualizeThemeColor(themeColorTag)
})

locale.subscribe(localeValue => {
  root.lang = localeValue
})

if (!likelyWithKeyboard(window)) {
  root.classList.add('is-hotkey-disabled')
}

window.onload = () => {
  actualizeThemeColor(themeColorTag)
}

startKeyUX(window, [
  pressKeyUX('is-pseudo-active'),
  hotkeyKeyUX(),
  focusGroupKeyUX(),
  jumpKeyUX(),
  hiddenKeyUX()
])
