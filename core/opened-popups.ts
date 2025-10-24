import { atom, computed, onMount, type ReadableAtom } from 'nanostores'

import { type LoadedPopup, type Popup, popups } from './popups/index.ts'
import { router } from './router.ts'

let prevPopups: Popup[] = []

/**
 * Manages popup life-cycle by reusing existing popup instances when possible
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

export type PopupsStatus =
  | {
      last: LoadedPopup<Popup>
      loading: boolean
      notFound: boolean
      other: Popup[]
    }
  | { last: undefined; loading: undefined; notFound: undefined; other: [] }

export const popupsStatus = atom<PopupsStatus>({
  last: undefined,
  loading: undefined,
  notFound: undefined,
  other: []
})

onMount(popupsStatus, () => {
  let unbindLast: (() => void) | undefined
  let unbindPopups = openedPopups.subscribe(popups => {
    let last = popups[popups.length - 1]
    if (last) {
      unbindLast?.()
      unbindLast = last.loading.subscribe(loading => {
        popupsStatus.set({
          // Could not make proper branded type in Svelte
          last: last as LoadedPopup<Popup>,
          loading,
          notFound: last.notFound,
          other: popups.slice(0, -1).reverse()
        })
      })
    } else {
      unbindLast?.()
      unbindLast = undefined
      popupsStatus.set({
        last: undefined,
        loading: undefined,
        notFound: undefined,
        other: []
      })
    }
  })
  return () => {
    unbindLast?.()
    unbindPopups()
  }
})
