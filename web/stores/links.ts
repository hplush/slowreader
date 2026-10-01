import { persistentBoolean } from '@nanostores/persistent'
import { atom } from 'nanostores'

import { installation } from './install.ts'

export const openLinksInBrowser = persistentBoolean(
  'slowreader:links-in-browser'
)

let chromeAndroid =
  navigator.userAgentData?.platform === 'Android' &&
  navigator.userAgentData.brands.some(i => i.brand === 'Google Chrome')

export const hasInAppBrowser = atom(false)

installation.subscribe(value => {
  hasInAppBrowser.set(chromeAndroid && value === 'installed')
})

export function toBrowserIntent(url: URL): string {
  let scheme = url.protocol.slice(0, -1)
  return (
    `intent://${url.host}${url.pathname}${url.search}${url.hash}` +
    `#Intent;scheme=${scheme};action=android.intent.action.VIEW;` +
    'category=android.intent.category.BROWSABLE;launchFlags=0x10000000;end'
  )
}
