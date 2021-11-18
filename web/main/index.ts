import { isSlowRoute, isGuestRoute } from '@slowreader/core'

import './reset.css'
import './colors.css'
import './index.css'
import '../stores/locale.js'
import { router } from '../stores/router'
import Main from './main.svelte'

router.subscribe(route => {
  document.body.classList.toggle('is-slow', isSlowRoute(route))
  document.body.classList.toggle('is-guest', isGuestRoute(route))
})

const main = new Main({
  target: document.getElementById('main')!
})

export default main
