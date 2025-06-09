import { computed, type ReadableAtom } from 'nanostores'

import { type Popup, popups } from './popups/index.ts'
import { router } from './router.ts'

let prevPopups: Popup[] = []

/**
 * Manages popup lifecycle by reusing existing popup instances when possible
 * and destroying unused ones to prevent memory leaks
 */
export const openedPopups: ReadableAtom<Popup[]> = computed(router, route => {
  let lastIndex = 0
  let nextPopups = route.popups.map((popup, index) => {
    lastIndex = index
    let prevPopup = prevPopups[index]
    if (
      prevPopup &&
      prevPopup.name === popup.popup &&
      prevPopup.param === popup.param
    ) {
      return prevPopup
    } else {
      if (prevPopup) prevPopup.destroy()
      return popups[popup.popup](popup.param)
    }
  })
  for (let closedPopup of prevPopups.slice(lastIndex + 1)) {
    closedPopup.destroy()
  }
  prevPopups = nextPopups
  return nextPopups
})
