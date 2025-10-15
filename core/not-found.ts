import type { LoguxUndoError } from '@logux/client'
import { atom } from 'nanostores'

import { onEnvironment } from './environment.ts'
import { router } from './router.ts'

export const notFound = atom(false)

export class NotFoundError extends Error {
  constructor() {
    super('Not found')
    this.name = 'NotFoundError'
    Error.captureStackTrace(this, NotFoundError)
  }
}

/* node:coverage disable */
export function isNotFoundError(
  error: unknown
): error is LoguxUndoError | NotFoundError {
  if (error instanceof Error) {
    return (
      error.name === 'NotFoundError' ||
      (error.name === 'LoguxUndoError' && error.message.includes('notFound'))
    )
  }
  return false
}
/* node:coverage enable */

onEnvironment(({ errorEvents }) => {
  errorEvents.addEventListener('unhandledrejection', event => {
    if (isNotFoundError(event.reason)) {
      notFound.set(true)
    }

    let unbindRouter = router.listen(() => {
      notFound.set(false)
      unbindRouter()
    })
  })
})
