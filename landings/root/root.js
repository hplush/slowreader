// `?guest` shows the landing as for a new user to demo or debug it
let guest =
  new URLSearchParams(location.search).has('guest') ||
  !localStorage.getItem('slowreader:userId')

document.documentElement.className = guest ? 'is-guest' : 'is-user'

let header = document.querySelector('.header')
let hero = document.querySelector('.section.is-hero')

// The header buttons start at the hero placeholders and follow the scroll
function fly() {
  for (let name of ['is-app', 'is-demo']) {
    let big = hero.querySelector(`.section_actions .${name}`)
    let small = header.querySelector(`.${name}`)
    let from = big.getBoundingClientRect()
    if (!from.width || !small.offsetWidth) continue
    // The button is mid-flight, so only the dock tells where it will land
    let dock = small.offsetParent.getBoundingClientRect()
    small.style.setProperty(
      '--from-x',
      `${from.left - dock.left - small.offsetLeft}px`
    )
    small.style.setProperty(
      '--from-y',
      `${from.top + scrollY - dock.top - small.offsetTop}px`
    )
    small.style.setProperty('--from-scale', `${from.width / small.offsetWidth}`)
  }
}

// Title reflow on font load moves the placeholders without resizing them
let resizes = new ResizeObserver(fly)
resizes.observe(hero.querySelector('.section_content'))
// Not the header: it also resizes mid-flight, when the label shrinks, and
// then the shrunken button would become the scale of the next flight
resizes.observe(hero)
void document.fonts.ready.then(fly)

// Browsers without scroll-driven animations show header buttons after hero
let visibility = new IntersectionObserver(
  ([entry]) => {
    document.documentElement.classList.toggle(
      'is-scrolled',
      !entry.isIntersecting
    )
  },
  // The hero buttons hide behind the top header, but leave the screen above
  // the bottom one
  {
    rootMargin:
      header.getBoundingClientRect().top > 0
        ? '0px'
        : `-${header.offsetHeight}px 0px 0px 0px`
  }
)
visibility.observe(hero.querySelector('.section_actions'))
