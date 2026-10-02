let root = document.documentElement

function checkTop() {
  // Root landing scrolls body on mobile to keep the URL bar
  root.classList.toggle('is-top', scrollY + document.body.scrollTop === 0)
}
// Body’s scroll event does not bubble
document.addEventListener('scroll', checkTop, { capture: true, passive: true })
checkTop()
