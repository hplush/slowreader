import { match, unreachable } from 'uvu/assert'

export async function rejects(
  wait: Promise<unknown>,
  pattern: RegExp | string
): Promise<void> {
  try {
    await wait
    unreachable()
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err
    }
    if (err.message === 'Assertion: Expected not to be reached!') {
      throw new Error('Error was not thrown from Promise')
    }
    match(err.message, pattern)
  }
}
