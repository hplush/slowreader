import { atom } from 'nanostores'

import { getEnvironment } from '../environment.ts'
import { errorToMessage, isRemoteError, UserFacingError } from '../errors.ts'
import { addLaterPost } from '../later.ts'
import { createDownloadTask } from '../lib/download.ts'
import { closeLastPopup } from '../router.ts'
import { type CreatedLoadedPopup, definePopup } from './common.ts'

export const later = definePopup('later', () => {
  let task = createDownloadTask()
  let $url = atom('')
  let $adding = atom(false)
  let $already = atom(false)
  let $error = atom<string | undefined>()

  async function add(): Promise<void> {
    $adding.set(true)
    $already.set(false)
    $error.set(undefined)
    try {
      let result = await addLaterPost(task, $url.get())
      if (result === 'already') {
        $already.set(true)
      } else {
        closeLastPopup()
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      if (!(e instanceof UserFacingError) && !isRemoteError(e)) {
        getEnvironment().warn(e)
      }
      $error.set(errorToMessage(e))
    } finally {
      $adding.set(false)
    }
  }

  return Promise.resolve({
    add,
    adding: $adding,
    already: $already,
    destroy() {
      task.destroy()
    },
    failure: $error,
    url: $url
  })
})

export type LaterPopup = CreatedLoadedPopup<typeof later>
