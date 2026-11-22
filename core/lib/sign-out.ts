import { onClient } from '../client.ts'
import { getEnvironment } from '../environment.ts'
import { hasDatabase } from '../schema.ts'

let cleaning = false

/**
 * Sign-out cancels database writes, which were not finished yet. Their errors
 * are not bugs.
 */
export function warnIfOpened(error: unknown): void {
  if (!cleaning && hasDatabase()) getEnvironment().warn(error)
}

onClient(logux => {
  cleaning = false
  return logux.on('cleaning', () => {
    cleaning = true
  })
})
