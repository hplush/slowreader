import { isSlowRoutes } from '@slowreader/core'

import './reset.css'
import './colors.css'
import './index.css'
import '../stores/locale.js'
import { router } from '../stores/router'
import App from './App.svelte'

router.subscribe(route => {
  document.body.classList.toggle('is-slow', isSlowRoutes(route))
})

const app = new App({
  target: document.getElementById('app')!
})

export default app
