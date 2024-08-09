import { LoguxUndoError } from '@logux/client'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { router } from './router.ts'

export const notFound = atom(false)

onEnvironment(({ errorEvents }) => {
  errorEvents.addEventListener('unhandledrejection', event => {
    if (
      event.reason instanceof LoguxUndoError &&
      event.reason.message.includes('notFound')
    ) {
      notFound.set(true)
    }

    let unbindRouter = router.listen(() => {
      notFound.set(false)
      unbindRouter()
    })
  })
})
