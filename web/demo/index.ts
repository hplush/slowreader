import type { FromWorker, ToWorker } from './opfs-worker.ts'

type Manifest = {
  database: { file: string; sha256: string }
  storage: Record<string, string>
}

const DATABASE = 'slowreader.sqlite'

// The app’s leader tab holds this lock while it is open
const APP_LOCK = 'logux_leader'

// CSP requires Trusted Types for the worker URL and allows only these
// policy names
if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createScriptURL(url) {
      if (new URL(url, location.href).origin !== location.origin) {
        throw new Error(`Blocked script from ${url}`)
      }
      return url
    }
  })
}

let caption = document.getElementById('caption')!
let loader = document.getElementById('loader')!

let theme = localStorage.getItem('slowreader:theme') || 'system'
document.documentElement.classList.toggle('is-dark-theme', theme === 'dark')
document.documentElement.classList.toggle('is-light-theme', theme === 'light')

function message(text: string): void {
  loader.hidden = true
  caption.removeAttribute('aria-hidden')
  caption.classList.add('is-message')
  caption.textContent = text
}

async function appIsOpen(): Promise<boolean> {
  if (!navigator.locks) return false
  let { held = [], pending = [] } = await navigator.locks.query()
  return [...held, ...pending].some(lock => lock.name === APP_LOCK)
}

async function load(path: string): Promise<Response> {
  let response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`)
  }
  return response
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  let digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Safari has no createWritable(), but every browser has the sync handle
// in a worker
function write(bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  return new Promise((resolve, reject) => {
    let worker = new Worker(new URL('./opfs-worker.ts', import.meta.url), {
      type: 'module'
    })
    worker.addEventListener('message', ({ data }: MessageEvent<FromWorker>) => {
      worker.terminate()
      if (data.done) {
        resolve()
      } else {
        reject(new Error(data.error))
      }
    })
    worker.addEventListener('error', e => {
      worker.terminate()
      reject(new Error(e.message))
    })
    worker.postMessage({ bytes, name: DATABASE } satisfies ToWorker, [
      bytes.buffer
    ])
  })
}

async function copy(): Promise<void> {
  if (await appIsOpen()) {
    message('Slow Reader is open in another tab. Close it and reload.')
    return
  }
  // “Delete all local data” keeps the empty database file in OPFS,
  // so only the user says whether the browser has data to lose
  if (localStorage.getItem('slowreader:userId')) {
    message('Slow Reader has data here. Delete it in Storage settings.')
    return
  }

  let manifest = (await (await load('/demo.json')).json()) as Manifest
  let bytes = new Uint8Array(
    await (await load(`/${manifest.database.file}`)).arrayBuffer()
  )
  // The settings cache the IDs of the rows of their own build, so a database
  // from another build would leave the menu pointing to missing feeds
  if ((await sha256(bytes)) !== manifest.database.sha256) {
    message('Demo files are from different builds. Reload the page.')
    return
  }

  // The database goes first: the settings without it start the app with
  // an empty database, which its schema mark claims to be already filled
  await write(bytes)

  localStorage.clear()
  for (let [key, value] of Object.entries(manifest.storage)) {
    localStorage.setItem(key, value)
  }
  localStorage.setItem('slowreader:demo', 'yes')

  location.href = '/app'
}

copy().catch((e: unknown) => {
  message(
    `Failed to copy the demo: ${e instanceof Error ? e.message : String(e)}`
  )
})
