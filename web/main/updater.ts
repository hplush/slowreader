const KEY = 'slowreader:updated'

let stored = localStorage.getItem(KEY)
if (stored !== String(COMMIT_TIME)) {
  localStorage.setItem(KEY, String(COMMIT_TIME))
}

window.addEventListener('storage', e => {
  if (e.key !== KEY || e.newValue === null) return
  let other = parseInt(e.newValue)
  if (other > COMMIT_TIME) {
    location.reload()
  } else if (other < COMMIT_TIME) {
    localStorage.setItem(KEY, String(COMMIT_TIME))
  }
})
