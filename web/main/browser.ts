import { getPagePath } from '@nanostores/router'
import { isSlowRoute, router, theme } from '@slowreader/core'

import { locale } from '../stores/locale.js'
import { urlRouter } from '../stores/router.js'

router.subscribe(page => {
  if (page.redirect) {
    let href
    if (page.route === 'preview') {
      href = getPagePath(urlRouter, page.route, page.params)
    } else {
      href = getPagePath(urlRouter, page.route)
    }
    urlRouter.open(href)
  }
})

let root = document.documentElement

router.subscribe(route => {
  root.classList.toggle('is-slow', isSlowRoute(route))
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark', themeValue === 'dark')
  root.classList.toggle('is-light', themeValue === 'light')
})

locale.subscribe(localeValue => {
  root.lang = localeValue
})
