export interface Batch {
  add(key: string): void
  flush(): void
}

/**
 * Call `process()` only once for the keys, which came in the same burst.
 *
 * @param delay How long to wait for the next key before the call.
 * @param process Called with the key when its burst is over.
 */
export function createBatch(
  delay: number,
  process: (key: string) => void
): Batch {
  let timers = new Map<string, NodeJS.Timeout>()

  function call(key: string): void {
    clearTimeout(timers.get(key))
    timers.delete(key)
    process(key)
  }

  return {
    add(key) {
      clearTimeout(timers.get(key))
      timers.set(
        key,
        setTimeout(() => {
          call(key)
        }, delay).unref()
      )
    },
    flush() {
      for (let key of timers.keys()) call(key)
    }
  }
}
