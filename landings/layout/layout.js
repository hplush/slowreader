let root = document.documentElement

function checkTop() {
  root.classList.toggle('is-top', scrollY === 0)
}
addEventListener('scroll', checkTop, { passive: true })
checkTop()
