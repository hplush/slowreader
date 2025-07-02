import './environment.ts'
import './browser.ts'

import './index.css'

import { busyUntilMenuLoader } from '@slowreader/core'
import { mount } from 'svelte'

import Main from './main.svelte'

busyUntilMenuLoader()

let target = document.getElementById('main')
if (target) mount(Main, { target })

document.querySelector('title + style')!.remove()
