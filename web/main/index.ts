import './environment.ts'
import './browser.ts'

import './index.css'

import Main from './main.svelte'

let target = document.getElementById('main')
if (target) new Main({ target })

document.getElementById('loader')?.remove()
document.querySelector('title + style')!.remove()
