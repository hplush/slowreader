import { atom } from 'nanostores'

import { createLaterAdding } from '../later.ts'
import { closeLastPopup } from '../router.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const later = definePopup('later', () => {
  let adding = createLaterAdding()
  let $url = atom('')

  return Promise.resolve({
    async add() {
      if (await adding.add($url.get())) closeLastPopup()
    },
    adding: adding.adding,
    already: adding.already,
    destroy: adding.destroy,
    failure: adding.failure,
    url: $url
  })
})

export type LaterPopup = CreatedLoadedPopup<typeof later>
