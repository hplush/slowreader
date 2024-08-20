import './browser.ts'
import './environment.ts'

import './index.css'

import { mount } from 'svelte'

import Main from './main.svelte'

let target = document.getElementById('main')
if (target) mount(Main, { target })

document.getElementById('loader')?.remove()
document.querySelector('title + style')!.remove()
