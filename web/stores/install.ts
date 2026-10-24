import { hasCloud } from '@slowreader/core'
import { atom, computed } from 'nanostores'

import { tabletMedia } from './media-queries.ts'

let standalone = matchMedia('(display-mode:standalone)')

export const installation = atom<'available' | 'installed' | 'unavailable'>(
  standalone.matches ? 'installed' : 'unavailable'
)

function detectSafari(): boolean {
  let agent = navigator.userAgent
  return (
    agent.includes('Safari') && !/Chrome|CriOS|FxiOS|EdgiOS|Android/.test(agent)
  )
}

export const safariBrowser = atom(detectSafari())

let prompt: BeforeInstallPromptEvent | undefined

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  prompt = event
  installation.set('available')
})

standalone.addEventListener('change', () => {
  if (standalone.matches) installation.set('installed')
})

export async function installApp(): Promise<void> {
  if (!prompt) return
  let current = prompt
  prompt = undefined
  installation.set('unavailable')
  await current.prompt()
}

/** Safari deletes data of not installed apps after 7 days without visits. */
export const safariNeedsInstall = computed(
  [safariBrowser, installation, tabletMedia, hasCloud],
  (safari, status, tablet, cloud) => {
    return safari && tablet && status !== 'installed' && !cloud
  }
)

export const mobileInstall = computed(
  [safariNeedsInstall, installation, tabletMedia],
  (safariNeeds, status, tablet) => {
    if (safariNeeds) {
      return {
        help: 'https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios',
        type: 'guide' as const
      }
    } else if (tablet && status === 'available') {
      return { type: 'prompt' as const }
    } else {
      return { type: 'none' as const }
    }
  }
)
