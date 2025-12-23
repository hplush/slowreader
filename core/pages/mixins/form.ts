import type { ReadableAtom, WritableAtom } from 'nanostores'

import { getEnvironment } from '../../environment.ts'
import { UserFacingError } from '../../errors.ts'
import { commonMessages as t } from '../../messages/index.ts'

export function createFormSubmit<
  Errors extends string,
  Messages extends { [K in Errors]: string }
>(
  submit: () => Promise<void>,
  $submitting: WritableAtom<boolean>,
  $error: WritableAtom<string | undefined>,
  errors: Record<Errors, string>,
  messages: ReadableAtom<Messages>
): () => Promise<boolean> {
  return async () => {
    $error.set(undefined)
    $submitting.set(true)
    let done = false
    try {
      await submit()
      done = true
    } catch (e: unknown) {
      if (e instanceof UserFacingError) {
        let error = e.message
        for (let code in errors) {
          if (errors[code] === e.message) {
            error = messages.get()[code]
          }
        }
        $error.set(error)
        /* node:coverage ignore next 4 */
      } else {
        getEnvironment().warn(e)
        $error.set(t.get().internalError)
      }
    } finally {
      $submitting.set(false)
    }
    return done
  }
}
