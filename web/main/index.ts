import './trusted-types.ts'
import './environment.ts'
import './browser.ts'

import './index.css'

import { busyUntilMenuLoader } from '@slowreader/core'
import { flushSync, mount } from 'svelte'

import { registerServiceWorker } from '../stores/client-update.ts'
import Main from './main.svelte'

void busyUntilMenuLoader()

if (import.meta.env.PROD) void registerServiceWorker()

let target = document.getElementById('main')
try {
  if (target) mount(Main, { target })
  // The app’s loader takes the animation phase from this one,
  // see ui/loader.svelte
  flushSync()
} catch (e) {
  // The app’s error page could be broken by the same error
  location.replace('/500.html')
  throw e
}
document.querySelector('#loader')?.remove()

document.querySelector('style:first-of-type')!.remove()
