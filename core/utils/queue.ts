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

export async function retryOnError<Result>(
  cb: () => Promise<Result>,
  onFirstError: () => void,
  attempts = 3
): Promise<Result | undefined> {
  let result: Result | undefined
  try {
    result = await cb()
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        return undefined
      } else {
        attempts -= 1
        if (attempts === 0) {
          return undefined
        } else {
          onFirstError()
          return retryOnError(cb, () => {}, attempts)
        }
      }
    }
  }
  return result
}
