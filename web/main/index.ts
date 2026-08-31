import './trusted-types.ts'
import './environment.ts'
import './browser.ts'
import './updater.ts'

import './index.css'

import { busyUntilMenuLoader } from '@slowreader/core'
import { flushSync, mount } from 'svelte'

import Main from './main.svelte'

void busyUntilMenuLoader()

let target = document.getElementById('main')
if (target) mount(Main, { target })

// The app’s loader takes the animation phase from this one,
// see ui/loader.svelte
flushSync()
document.querySelector('#loader')?.remove()

document.querySelector('style:first-of-type')!.remove()
