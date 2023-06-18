import { match, unreachable } from 'uvu/assert'

export async function rejects(
  wait: Promise<unknown>,
  test: ((error: Error) => void) | RegExp | string
): Promise<void> {
  try {
    await wait
    unreachable()
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    if (error.message === 'Assertion: Expected not to be reached!') {
      throw new Error('Error was not thrown from Promise')
    }
    if (typeof test === 'function') {
      test(error)
    } else {
      match(error.message, test)
    }
  }
}
