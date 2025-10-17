// Bind browser’s API to client core API.

import { comfortMode, errorMode, theme } from '@slowreader/core'
import { focusGroupKeyUX, jumpKeyUX, pressKeyUX, startKeyUX } from 'keyux'

import { locale } from '../stores/locale.ts'
import { pageTheme } from '../stores/page-theme.ts'

let root = document.documentElement
let themeTag = document.querySelector('meta[name="theme-color"]')

function updateTheme(): void {
  if (errorMode.get()) {
    themeTag?.setAttribute('content', 'var(--dangerous-text-color)')
    return
  }

  let background = window
    .getComputedStyle(document.body)
    .getPropertyValue('--theme-color')
  if (themeTag && background) {
    themeTag.setAttribute('content', background)
  }
}

errorMode.subscribe(() => {
  updateTheme()
})

comfortMode.subscribe(mode => {
  root.classList.toggle('is-comfort-mode', mode)
  updateTheme()
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark-theme', themeValue === 'dark')
  root.classList.toggle('is-light-theme', themeValue === 'light')
  updateTheme()
})

pageTheme.listen(() => {
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

startKeyUX(window, [
  pressKeyUX('is-pseudo-active'),
  focusGroupKeyUX(),
  jumpKeyUX()
])
