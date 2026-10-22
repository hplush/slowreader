import { atom } from 'nanostores'

import type { ToServiceWorker } from '../main/sw.ts'

// `undefined` when no service worker controls the page
export const clientUpdate = atom<
  'available' | 'checking' | 'latest' | 'offline' | undefined
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
  clientUpdate.set('checking')
  await checkClientUpdate()
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

export function updateClient(): void {
  let waiting = registration?.waiting
  if (waiting) {
    // Every tab reloads on `controllerchange`
    waiting.postMessage('skipWaiting' satisfies ToServiceWorker)
  } else {
    location.reload()
  }
}
