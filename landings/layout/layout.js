// `?guest` shows pages as for a new user to demo or debug them
let guest =
  new URLSearchParams(location.search).has('guest') ||
  !localStorage.getItem('slowreader:userId')

let root = document.documentElement
root.classList.toggle('is-guest', guest)
root.classList.toggle('is-user', !guest)

function checkTop() {
  root.classList.toggle('is-top', scrollY === 0)
}
addEventListener('scroll', checkTop, { passive: true })
checkTop()
