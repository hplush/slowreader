interface KeyListener {
  command(event: KeyboardEvent): void
  element?: HTMLElement
}

let hotkeys: Record<string, KeyListener[]> = {}
let listeners = 0
let pressed: HTMLElement[] = []

function ignoreTags(e: KeyboardEvent): boolean {
  let el = e.target as Element
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
}

function getListener(
  e: KeyboardEvent,
  cb: (listener: KeyListener) => void
): void {
  if (!ignoreTags(e)) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return
    let keyListeners = hotkeys[e.key]
    if (keyListeners) {
      let firstListener = keyListeners[0]
      if (firstListener) {
        cb(firstListener)
      }
    }
  }
}

function onKeyDown(e: KeyboardEvent): void {
  getListener(e, ({ element }) => {
    markPressed(element)
  })
}

function onKeyUp(e: KeyboardEvent): void {
  getListener(e, ({ command }) => {
    unmarkPressed()
    command(e)
  })
}

export function addHotkey(
  key: string,
  element: KeyListener['element'],
  command: KeyListener['command']
): () => void {
  let listener = { command, element }
  if (import.meta.env.DEV) {
    if (hotkeys[key] && hotkeys[key]!.length > 1) {
      alert(`Hotkey ${key} was used multiple times`)
    }
  }
  if (!hotkeys[key]) hotkeys[key] = []
  hotkeys[key]!.unshift(listener)

  listeners += 1
  if (listeners === 1) {
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('keydown', onKeyDown)
  }

  return () => {
    hotkeys[key] = hotkeys[key]!.filter(i => i !== listener)

    listeners -= 1
    if (listeners === 0) {
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }
}

export function likelyToHavePhysicalKeyboard(): boolean {
  let agent = navigator.userAgent.toLowerCase()
  return !['iphone', 'ipad', 'android'].some(device => agent.includes(device))
}

export function markPressed(element: Element | null | undefined): void {
  if (element instanceof HTMLElement) {
    element.classList.add('is-pseudo-active')
    pressed.push(element)
  }
}

function markHovered(element: Element | null | undefined): void {
  if (element instanceof HTMLElement) {
    element.classList.add('is-pseudo-hover')
    pressed.push(element)
  }
}

export function unmarkPressed(): void {
  for (let element of pressed) {
    element.classList.remove('is-pseudo-active')
    element.classList.remove('is-pseudo-hover')
  }
  pressed = []
}

interface KeyboardListener {
  (event: KeyboardEvent): void
}

export function generateMenuListeners(opts: {
  first(el: HTMLElement): Element
  last(el: HTMLElement): Element
  next(el: HTMLElement): Element | null | undefined
  prev(el: HTMLElement): Element | null | undefined
  select?: (el: HTMLElement) => void
  selectOnFocus?: boolean
}): [KeyboardListener, KeyboardListener] {
  function focus(prev: HTMLElement, next: HTMLElement): void {
    next.tabIndex = 0
    next.focus()
    prev.tabIndex = -1
    if (opts.selectOnFocus) next.click()
  }

  let up: KeyboardListener = e => {
    unmarkPressed()
    let current = e.target as HTMLElement
    if (e.key === 'ArrowUp') {
      let prev = opts.prev(current) || opts.last(current)
      focus(current, prev as HTMLElement)
    } else if (e.key === 'ArrowDown') {
      let next = opts.next(current) || opts.first(current)
      focus(current, next as HTMLElement)
    } else if (e.key === 'Home') {
      focus(current, opts.first(current) as HTMLElement)
    } else if (e.key === 'End') {
      focus(current, opts.last(current) as HTMLElement)
    } else if (e.key === 'Enter') {
      if (opts.select) opts.select(current)
    }
  }

  let down: KeyboardListener = e => {
    let current = e.target as HTMLElement
    let next: Element | undefined
    if (e.key === 'Enter') {
      if (opts.selectOnFocus) markPressed(current)
    } else if (e.key === 'ArrowUp') {
      next = opts.prev(current) || opts.last(current)
    } else if (e.key === 'ArrowDown') {
      next = opts.next(current) || opts.first(current)
    } else if (e.key === 'Home') {
      next = opts.first(current)
    } else if (e.key === 'End') {
      next = opts.last(current)
    }
    if (next) {
      e.preventDefault()
      if (opts.selectOnFocus) {
        markPressed(next)
      } else {
        markHovered(next)
      }
    }
  }

  return [down, up]
}
