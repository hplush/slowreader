import debounce from 'just-debounce-it'

export interface DebouncedTask {
  call(): void
  cancel(): void
  wait(): Promise<void>
}

/**
 * Calls during the run start one more run after it, not a parallel one.
 */
export function debounceTask(
  task: () => Promise<void>,
  ms: number
): DebouncedTask {
  let running: Promise<void> | undefined
  let again = false
  let start = debounce(() => {
    running ??= (async () => {
      try {
        while (again) {
          again = false
          await task()
        }
      } finally {
        running = undefined
      }
    })()
  }, ms)
  return {
    call() {
      again = true
      start()
    },
    cancel() {
      again = false
      start.cancel()
    },
    async wait() {
      await running
    }
  }
}
