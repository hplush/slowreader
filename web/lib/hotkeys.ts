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
    if (element) {
      element.classList.add('is-pseudo-active')
      pressed.push(element)
    }
  })
}

function onKeyUp(e: KeyboardEvent): void {
  getListener(e, ({ command }) => {
    command(e)
    for (let element of pressed) {
      element.classList.remove('is-pseudo-active')
    }
    pressed = []
  })
}

export function addHotkey(
  key: string,
  element: KeyListener['element'],
  command: KeyListener['command']
): () => void {
  let listener = { command, element }
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
