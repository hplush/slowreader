type TaskTypes = object

type Task<Types extends TaskTypes> = {
  [Key in keyof Types]: {
    payload: Types[Key]
    type: Key
  }
}[keyof Types]

type QueueProcessor<Types extends TaskTypes> = {
  [Key in keyof Types]: (
    payload: Types[Key],
    tasks: Task<Types>[]
  ) => Promise<void>
}

export interface Queue<Types extends TaskTypes> {
  start(workers: number, processors: QueueProcessor<Types>): Promise<void>
  stop(): void
  tasks: Task<Types>[]
}

/**
 * Process big queue of tasks by limited number of workers with retrying
 * on errors.
 *
 * We are using it in feeds refresh and moved to separated abstraction
 * to simplify refreshing code.
 */
export function createQueue<Types extends TaskTypes>(
  tasks: Task<Types>[] = []
): Queue<Types> {
  let stopped = false
  return {
    async start(workers, processors) {
      async function worker(): Promise<void> {
        if (stopped) return
        let task = tasks.shift()
        if (!task) return
        await processors[task.type](task.payload, tasks)
        await worker()
      }

      let promises: Promise<void>[] = []
      for (let i = 0; i < workers; i++) {
        promises.push(worker())
      }
      await Promise.all(promises)
    },
    stop() {
      stopped = true
    },
    tasks
  }
}

/* node:coverage disable */
export async function retryOnError<Result>(
  cb: () => Promise<Result>,
  onFirstError: () => void,
  attempts = 3
): Promise<'abort' | 'error' | Result> {
  let result: Result | undefined
  try {
    result = await cb()
    return result
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        return 'abort'
      } else {
        attempts -= 1
        if (attempts === 0) {
          return 'error'
        } else {
          onFirstError()
          return retryOnError(cb, () => {}, attempts)
        }
      }
    }
    throw e
  }
}
/* node:coverage enable */
