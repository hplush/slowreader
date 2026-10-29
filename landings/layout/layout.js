let root = document.documentElement

export const isDev =
  location.hostname === 'dev.slowreader.app' ||
  location.hostname.endsWith('.slowreader.hplush.dev') ||
  new URLSearchParams(location.search).has('dev')

if (isDev) {
  document.querySelector('link[href="/favicon.ico"]')?.remove()
  document.querySelector('link[type="image/svg+xml"]').href =
    '/icon-staging.svg'
}

function checkTop() {
  // Root landing scrolls body on mobile to keep the URL bar
  root.classList.toggle('is-top', scrollY + document.body.scrollTop === 0)
}
// Body’s scroll event does not bubble
document.addEventListener('scroll', checkTop, { capture: true, passive: true })
checkTop()

function track(name) {
  if (location.hostname !== 'slowreader.app') return
  let url = new URL(location.href)
  url.searchParams.delete('guest')
  fetch('https://lens.hplush.dev/api/event', {
    body: JSON.stringify({
      d: 'slowreader.app',
      n: name,
      p: { user: root.classList.contains('is-user') ? 'yes' : 'no' },
      r: document.referrer || null,
      u: url.href
    }),
    // Plain text avoids CORS preflight request
    headers: { 'Content-Type': 'text/plain' },
    keepalive: true,
    method: 'POST'
  }).catch(() => {})
}

track('pageview')
document.addEventListener('click', e => {
  let button = e.target.closest('.is-app, .is-demo')
  if (button) {
    track(button.classList.contains('is-app') ? 'Open app' : 'Start demo')
  }
})
