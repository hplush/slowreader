import { checkClientUpdate, loadedScripts } from '../stores/client-update.ts'

const KEY = 'slowreader:updated'

async function reloadIfServerChanged(): Promise<void> {
  let update = await checkClientUpdate()
  if (update === 'available') {
    location.reload()
  } else if (update === 'latest') {
    // Other tab has an outdated version and must check the server too
    localStorage.setItem(KEY, loadedScripts)
  }
}

if (loadedScripts) {
  localStorage.setItem(KEY, loadedScripts)

  window.addEventListener('storage', e => {
    if (e.key !== KEY || e.newValue === null) return
    if (e.newValue !== loadedScripts) void reloadIfServerChanged()
  })
}
