import { saveData } from '@slowreader/core'
import { atom } from 'nanostores'

import type { ToServiceWorker } from '../main/sw.ts'

// `undefined` when no service worker controls the page
export const clientUpdate = atom<
  | 'available'
  | 'checking'
  | 'latest'
  | 'offline'
  | 'unchecked'
  | 'updating'
  | undefined
>()

let registration: ServiceWorkerRegistration | undefined

async function findWaitingWorker(
  worker: ServiceWorkerRegistration
): Promise<null | ServiceWorker> {
  await worker.update()
  let installing = worker.installing
  if (installing) {
    await new Promise(resolve => {
      installing.addEventListener('statechange', resolve, { once: true })
    })
  }
  return worker.waiting
}

export async function checkClientUpdate(): Promise<void> {
  if (!registration || !clientUpdate.get()) return
  clientUpdate.set('checking')
  try {
    let waiting = await findWaitingWorker(registration)
    clientUpdate.set(waiting ? 'available' : 'latest')
  } catch {
    clientUpdate.set(registration.waiting ? 'available' : 'offline')
  }
}

async function startClientUpdates(): Promise<void> {
  if (saveData.get()) {
    clientUpdate.set(registration?.waiting ? 'available' : 'unchecked')
  } else {
    clientUpdate.set('checking')
    await checkClientUpdate()
  }
}

export async function registerServiceWorker(): Promise<void> {
  try {
    registration = await navigator.serviceWorker.register('/sw.js')
  } catch {
    return
  }
  // The first service worker takes the page without new version
  let controlled = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) {
      location.reload()
    } else {
      controlled = true
      void startClientUpdates()
    }
  })
  if (controlled) await startClientUpdates()
}

export async function unregisterServiceWorkers(): Promise<void> {
  try {
    let registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(i => i.unregister()))
  } catch {}
}

export async function updateClient(): Promise<void> {
  if (!registration?.waiting) await checkClientUpdate()
  let waiting = registration?.waiting
  if (waiting) {
    clientUpdate.set('updating')
    // Browser ignores the message while the old worker loads any image
    // and does not retry after it. Every tab reloads on `controllerchange`.
    let skipWaiting = (): void => {
      waiting.postMessage('skipWaiting' satisfies ToServiceWorker)
    }
    skipWaiting()
    setInterval(skipWaiting, 1000)
  } else {
    location.reload()
  }
}
