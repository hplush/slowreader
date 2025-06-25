import { comfortMode, theme } from '@slowreader/core'
import { pressKeyUX, startKeyUX } from 'keyux'

import { locale } from '../stores/locale.ts'

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

comfortMode.subscribe(mode => {
  root.classList.toggle('is-comfort-mode', mode)
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

window.addEventListener('load', () => {
  updateTheme()
})

window.addEventListener('load', () => {
  import('./devtools.ts').then(() => {})
})

startKeyUX(window, [pressKeyUX('is-pseudo-active')])
