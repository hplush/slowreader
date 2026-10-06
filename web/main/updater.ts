const KEY = 'slowreader:updated'

let loadedScripts = Array.from(document.querySelectorAll('script[src]'), i =>
  i.getAttribute('src')
).join(' ')

function scriptsInHtml(html: string): string {
  return Array.from(
    html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g),
    i => i[1]
  ).join(' ')
}

async function reloadIfServerChanged(): Promise<void> {
  try {
    let response = await fetch('/app.html', { cache: 'no-cache' })
    if (!response.ok) return
    if (scriptsInHtml(await response.text()) !== loadedScripts) {
      location.reload()
    } else {
      // Other tab has an outdated version and must check the server too
      localStorage.setItem(KEY, loadedScripts)
    }
  } catch {}
}

if (loadedScripts) {
  localStorage.setItem(KEY, loadedScripts)

  window.addEventListener('storage', e => {
    if (e.key !== KEY || e.newValue === null) return
    if (e.newValue !== loadedScripts) void reloadIfServerChanged()
  })
}
