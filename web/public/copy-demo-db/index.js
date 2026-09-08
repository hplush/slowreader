const DATABASE = 'slowreader.sqlite'

// The app’s leader tab holds this lock while it is open
const APP_LOCK = 'logux_leader'

let caption = document.getElementById('caption')
let loader = document.getElementById('loader')

let theme = localStorage.getItem('slowreader:theme') || 'system'
document.documentElement.classList.toggle('is-dark-theme', theme === 'dark')
document.documentElement.classList.toggle('is-light-theme', theme === 'light')

function message(text) {
  loader.hidden = true
  caption.removeAttribute('aria-hidden')
  caption.classList.add('is-message')
  caption.textContent = text
}

async function appIsOpen() {
  if (!navigator.locks) return false
  let { held, pending } = await navigator.locks.query()
  return [...held, ...pending].some(lock => lock.name === APP_LOCK)
}

async function load(path) {
  let response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`)
  }
  return response
}

async function sha256(bytes) {
  let digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function copy() {
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

  let manifest = await (await load('/demo.json')).json()
  let bytes = new Uint8Array(
    await (await load(`/${manifest.database.file}`)).arrayBuffer()
  )
  // The settings cache the IDs of the rows of their own build, so a database
  // from another build would leave the menu pointing to missing feeds
  if ((await sha256(bytes)) !== manifest.database.sha256) {
    message('Demo files are from different builds. Rebuild them.')
    return
  }

  // The database goes first: the settings without it start the app with
  // an empty database, which its schema mark claims to be already filled
  let root = await navigator.storage.getDirectory()
  let file = await root.getFileHandle(DATABASE, { create: true })
  let writable = await file.createWritable()
  await writable.write(bytes)
  await writable.close()

  localStorage.clear()
  for (let [key, value] of Object.entries(manifest.storage)) {
    localStorage.setItem(key, value)
  }
  localStorage.setItem('slowreader:demo', 'yes')

  location.href = '/'
}

copy().catch(e => {
  message(`Failed to copy the demo: ${e.message}`)
})
