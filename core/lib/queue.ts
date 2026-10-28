import { delay } from 'nanodelay'

import { HTTPStatusError, NetworkError } from '../errors.ts'
import { createDownloadTask, type DownloadTask } from './download.ts'

const MAX_ATTEMPTS = 3
const MAX_DELAY = getExponentialDelay(MAX_ATTEMPTS)

export interface QueueCallback {
  (task: DownloadTask): Promise<QueueCallback | void>
}

interface QueueErrorCallback<Data> {
  (data: Data, error: Error): void
}

interface QueueTask<Data> {
  after: number | undefined
  callback?: QueueCallback
  data: Data
  fails: number
}

interface QueueProcessor<Data> {
  (data: Data): QueueCallback
}

interface Queue<Data> {
  start(
    workers: number,
    processor: QueueProcessor<Data>,
    opts: {
      onRequestError: QueueErrorCallback<Data>
      onTaskFail: QueueErrorCallback<Data>
    }
  ): Promise<void[]>
  stop(): void
}

function getExponentialDelay(attempt: number): number {
  return Math.ceil(2 ** (attempt - 1)) * 1000
}

function runAfter(attempt: number, error: Error): number | undefined {
  if (!HTTPStatusError.is(error, [429, 503])) {
    return undefined
  }
  let now = Date.now()
  let fromHeader =
    error.headers.get('Retry-After') ??
    error.headers.get('RateLimit-Reset') ??
    error.headers.get('X-Rate-Limit-Reset')
  if (fromHeader) {
    let seconds = parseInt(fromHeader, 10)
    if (!isNaN(seconds)) return now + Math.min(MAX_DELAY, seconds * 1000)

    let resetTime = new Date(fromHeader).getTime()
    if (!isNaN(resetTime)) return Math.min(now + MAX_DELAY, resetTime)
  }
  return now + getExponentialDelay(attempt)
}

function findNext<Data>(
  tasks: QueueTask<Data>[]
): [QueueTask<Data>, undefined] | [undefined, number] | [undefined, undefined] {
  let now = Date.now()
  let minAfter: number | undefined

  for (let i = 0; i < tasks.length; i++) {
    let task = tasks[i]!
    if (!task.after || task.after <= now) {
      tasks.splice(i, 1)
      return [task, undefined]
    } else if (!minAfter || task.after < minAfter) {
      minAfter = task.after
    }
  }

  /* node:coverage ignore next 5 */
  if (minAfter) {
    return [undefined, minAfter - now]
  } else {
    return [undefined, undefined]
  }
}

/**
 * Tasks run in the order of the list. Retries and next steps
 * keep the place of their task: before the tasks, which did not start.
 * Only retry after 500 goes to the end.
 */
export function createQueue<Data>(initial: Data[]): Queue<Data> {
  // The queue repeats failed tasks by itself, no need in repeating requests
  let download = createDownloadTask({ tries: 1 })
  let tasks: QueueTask<Data>[] = initial.map(data => {
    return { after: undefined, data, fails: 0 }
  })
  let stopped = false
  let onRequestError: QueueErrorCallback<Data> = () => {}
  let onTaskFail: QueueErrorCallback<Data> = () => {}

  function processError(task: QueueTask<Data>, e: Error): void {
    if (e.name === 'AbortError') return

    if (HTTPStatusError.is(e) || NetworkError.is(e)) {
      task.fails += 1
      onRequestError(task.data, e)
      if (task.fails === MAX_ATTEMPTS) {
        onTaskFail(task.data, e)
      } else {
        task.after = runAfter(task.fails, e)
        if (HTTPStatusError.is(e, [500])) {
          tasks.push(task)
        } else {
          tasks.unshift(task)
        }
      }
      /* node:coverage ignore next 3 */
    } else {
      onTaskFail(task.data, e)
    }
  }

  async function worker(processor: QueueProcessor<Data>): Promise<void> {
    if (stopped) return
    let [task, wait] = findNext(tasks)
    if (wait) {
      await delay(wait)
      return worker(processor)
    }
    if (!task) return
    try {
      let callback = task.callback ?? processor(task.data)
      let next = await callback(download)
      if (next) {
        tasks.unshift({
          after: undefined,
          callback: next,
          data: task.data,
          fails: 0
        })
      }
    } catch (e) {
      if (e instanceof Error) {
        processError(task, e)
      }
    }
    return worker(processor)
  }

  return {
    start(workers, processor, opts) {
      onRequestError = opts.onRequestError
      onTaskFail = opts.onTaskFail
      let promises: Promise<void>[] = []
      for (let i = 0; i < workers; i++) {
        promises.push(worker(processor))
      }
      return Promise.all(promises)
    },
    stop() {
      stopped = true
      download.destroy()
    }
  }
}
