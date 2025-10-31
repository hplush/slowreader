import { computed, type ReadableAtom } from 'nanostores'

import { router } from '../../router.ts'

export function injectOpenedFeed(): {
  opened: ReadableAtom<string | undefined>
} {
  let $opened = computed(router, route => {
    let popup = route.popups[0]
    if (popup?.popup === 'feed') {
      return popup.param
    }
  })

  return {
    opened: $opened
  }
}
