// Bind browser’s API to client core API.

import {
  closeLastPopup,
  comfortMode,
  errorMode,
  openedPopups,
  type Route,
  router,
  theme,
  useQuietCursor,
  useReducedMotion
} from '@slowreader/core'
import { focusGroupKeyUX, jumpKeyUX, pressKeyUX, startKeyUX } from 'keyux'

import { locale } from '../stores/locale.ts'
import { onlyTouch, pageTheme } from '../stores/media-queries.ts'

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

function fromParam(page: Route): number | undefined {
  if (page.route === 'fast' || page.route === 'slow') {
    return page.params.from
  } else {
    return undefined
  }
}
let main = document.getElementById('main')
if (main) {
  let prevPage: Route = router.get()
  router.listen(page => {
    if (
      prevPage.route !== page.route ||
      fromParam(prevPage) !== fromParam(page)
    ) {
      main.scrollTo(0, 0)
    }
    prevPage = page
  })
}

errorMode.subscribe(() => {
  updateTheme()
})

comfortMode.subscribe(mode => {
  root.classList.toggle('is-comfort-mode', mode)
  root.classList.toggle('is-non-comfort-mode', !mode)
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

useQuietCursor.subscribe(quiet => {
  root.classList.toggle('is-quiet-cursor', quiet)
})

useReducedMotion.subscribe(reduced => {
  root.classList.toggle('is-reduced-motion', reduced)
})

onlyTouch.subscribe(touch => {
  root.classList.toggle('is-only-touch', touch)
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

window.addEventListener('keyup', e => {
  if (e.key === 'Escape') {
    if (openedPopups.get().length > 0) {
      let target = e.target as Element | null
      let isSpecialKey = e.ctrlKey || e.metaKey || e.altKey
      let insideEditable =
        target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT'
      if (!isSpecialKey && !insideEditable) {
        closeLastPopup()
      }
    }
  }
})
