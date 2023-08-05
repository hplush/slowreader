import '../stores/locale.js'
import '../stores/log.js'
import '../stores/request.js'
import '../stores/router.js'

import { isGuestRoute, isSlowRoute, router } from '@slowreader/core'

import Main from './main.svelte'

import './colors.css'
import './index.css'
import './reset.css'

router.subscribe(route => {
  document.body.classList.toggle('is-slow', isSlowRoute(route))
  document.body.classList.toggle('is-guest', isGuestRoute(route))
})

const main = new Main({
  target: document.getElementById('main')!
})

export default main
