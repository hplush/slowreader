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
  getItems: (el: HTMLElement) => NodeListOf<HTMLElement>
  select?: (el: HTMLElement) => void
  selectOnFocus?: boolean
}): [KeyboardListener, KeyboardListener] {
  function focus(prevEl: HTMLElement, nextEl: HTMLElement): void {
    nextEl.tabIndex = 0
    nextEl.focus()
    prevEl.tabIndex = -1
    if (opts.selectOnFocus) nextEl.click()
  }

  function first(current: HTMLElement): HTMLElement {
    return opts.getItems(current)[0] as HTMLElement
  }

  function last(current: HTMLElement): HTMLElement {
    let items = opts.getItems(current)
    return items[items.length - 1] as HTMLElement
  }

  function prev(current: HTMLElement): HTMLElement | undefined {
    let items = opts.getItems(current)
    let index = Array.from(items).indexOf(current)
    return items[index - 1] as HTMLElement | undefined
  }

  function next(current: HTMLElement): HTMLElement | undefined {
    let items = opts.getItems(current)
    let index = Array.from(items).indexOf(current)
    return items[index + 1] as HTMLElement | undefined
  }

  let up: KeyboardListener = e => {
    unmarkPressed()
    let current = e.target as HTMLElement
    if (e.key === 'ArrowUp') {
      focus(current, prev(current) || last(current))
    } else if (e.key === 'ArrowDown') {
      focus(current, next(current) || first(current))
    } else if (e.key === 'Home') {
      focus(current, first(current))
    } else if (e.key === 'End') {
      focus(current, last(current))
    } else if (e.key === 'Enter') {
      if (opts.select) opts.select(current)
    }
  }

  let down: KeyboardListener = e => {
    let current = e.target as HTMLElement
    let future: HTMLElement | undefined
    if (e.key === 'Enter') {
      if (opts.selectOnFocus) markPressed(current)
    } else if (e.key === 'ArrowUp') {
      future = prev(current) || last(current)
    } else if (e.key === 'ArrowDown') {
      future = next(current) || first(current)
    } else if (e.key === 'Home') {
      future = first(current)
    } else if (e.key === 'End') {
      future = last(current)
    }
    if (future) {
      e.preventDefault()
      if (opts.selectOnFocus) {
        markPressed(future)
      } else {
        markHovered(future)
      }
    }
  }

  return [down, up]
}

let jumps: WeakRef<HTMLElement>[] = []

export function jumpInto(el: HTMLElement | null | undefined): void {
  let current = document.activeElement
  if (current instanceof HTMLElement && current !== document.body) {
    jumps.push(new WeakRef(current))
  }
  if (el) {
    let focusable = el.querySelector(
      'button:not([tabindex="-1"]), ' +
        'a:not([tabindex="-1"]), ' +
        'input:not([tabindex="-1"]), ' +
        '[tabindex="0"]'
    )
    if (focusable instanceof HTMLElement) focusable.focus()
  }
}

export function jumpBack(): void {
  let ref = jumps.pop()
  if (!ref) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    return
  }
  let el = ref.deref()
  if (el) {
    el.focus()
  } else {
    jumpBack()
  }
}
