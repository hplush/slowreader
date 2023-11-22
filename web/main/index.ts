import './environment.js'

import { getPagePath } from '@nanostores/router'
import { isGuestRoute, isSlowRoute, router, theme } from '@slowreader/core'

import { urlRouter } from '../stores/router.js'
import Main from './main.svelte'

import './index.css'

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
  root.classList.toggle('is-guest', isGuestRoute(route))
})

theme.subscribe(themeValue => {
  root.classList.toggle('is-dark', themeValue === 'dark')
  root.classList.toggle('is-light', themeValue === 'light')
})

const main = new Main({ target: document.getElementById('main')! })

export default main
