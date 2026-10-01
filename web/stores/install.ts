import { atom } from 'nanostores'

let standalone = matchMedia('(display-mode:standalone)')

export const installation = atom<'available' | 'installed' | 'unavailable'>(
  standalone.matches ? 'installed' : 'unavailable'
)

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
