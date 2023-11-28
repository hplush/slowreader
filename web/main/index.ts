import './environment.js'
import './browser.js'

import './index.css'

import Main from './main.svelte'

document.getElementById('loader')?.remove()

let target = document.getElementById('main')
if (target) new Main({ target })
