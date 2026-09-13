document.documentElement.className = localStorage.getItem('slowreader:userId')
  ? 'is-user'
  : 'is-guest'

let header = document.querySelector('.header')
let hero = document.querySelector('.section.is-hero')

// The header buttons start at the hero placeholders and follow the scroll
function fly() {
  for (let name of ['is-app', 'is-demo']) {
    let big = hero.querySelector(`.section_actions .${name}`)
    let small = header.querySelector(`.${name}`)
    let from = big.getBoundingClientRect()
    if (!from.width || !small.offsetWidth) continue
    small.style.setProperty('--from-x', `${from.left - small.offsetLeft}px`)
    small.style.setProperty(
      '--from-y',
      `${from.top + scrollY - small.offsetTop}px`
    )
    small.style.setProperty('--from-scale', `${from.width / small.offsetWidth}`)
  }
}

// Title reflow on font load moves the placeholders without resizing them
let resizes = new ResizeObserver(fly)
resizes.observe(hero.querySelector('.section_content'))
resizes.observe(header)
void document.fonts.ready.then(fly)

// Browsers without scroll-driven animations show header buttons after hero
let visibility = new IntersectionObserver(
  ([entry]) => {
    document.documentElement.classList.toggle(
      'is-scrolled',
      !entry.isIntersecting
    )
  },
  { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` }
)
visibility.observe(hero.querySelector('.section_actions'))
