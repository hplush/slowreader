export interface TaskQueue {
  add(task: () => Promise<void>): void
  destroy(): void
  finish(): Promise<void>
  start(): void
}

/**
 * Queue of the tasks, which must not be run in parallel.
 *
 * The queue is paused until `start()`, so the tasks can be collected
 * before the storage is ready for them.
 */
export function createTaskQueue(onError: (error: unknown) => void): TaskQueue {
  let destroyed = false
  let starting: () => void
  let queue = new Promise<void>(resolve => {
    starting = resolve
  })

  return {
    add(task) {
      queue = queue.then(async () => {
        if (destroyed) return
        try {
          await task()
          /* node:coverage ignore next 4 */
        } catch (error) {
          if (!destroyed) onError(error)
        }
      })
    },
    destroy() {
      destroyed = true
      starting()
    },
    finish() {
      return queue
    },
    start() {
      starting()
    }
  }
}
