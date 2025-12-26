import { delay } from 'nanodelay'

import { HTTPStatusError, NetworkError } from '../errors.ts'
import { createDownloadTask, type DownloadTask } from './download.ts'

const MAX_ATTEMPTS = 3

interface QueueCallback {
  (task: DownloadTask): Promise<void>
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
  add(data: Data, callback?: QueueCallback): void
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

function buildTask<Data>(
  data: Data,
  callback?: QueueCallback
): QueueTask<Data> {
  return { after: undefined, callback, data, fails: 0 }
}

function runAfter(attempt: number, error: Error): number | undefined {
  if (!(error instanceof HTTPStatusError)) {
    return undefined
  }
  if (error.status !== 429 && error.status !== 503) {
    return undefined
  }
  let fromHeader =
    error.headers.get('Retry-After') ??
    error.headers.get('RateLimit-Reset') ??
    error.headers.get('X-Rate-Limit-Reset')
  if (fromHeader) {
    let seconds = parseInt(fromHeader, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }

    let resetTime = new Date(fromHeader).getTime()
    if (!isNaN(resetTime)) {
      return Math.max(0, Math.ceil(resetTime - Date.now()))
    }
  }
  return Math.ceil(2 ** (attempt - 1)) * 1000
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

export function createQueue<Data>(initial: Data[]): Queue<Data> {
  let download = createDownloadTask()
  let tasks = initial.map(i => buildTask(i))
  let stopped = false
  let onRequestError: QueueErrorCallback<Data> = () => {}
  let onTaskFail: QueueErrorCallback<Data> = () => {}

  function processError(task: QueueTask<Data>, e: Error): void {
    if (e.name === 'AbortError') return

    if (e instanceof HTTPStatusError || e instanceof NetworkError) {
      task.fails += 1
      onRequestError(task.data, e)
      if (task.fails === MAX_ATTEMPTS) {
        onTaskFail(task.data, e)
      } else {
        let wait = runAfter(task.fails, e)
        task.after = wait ? Date.now() + wait : undefined
        tasks.push(task)
      }
      /* node:coverage ignore next 3 */
    } else {
      onTaskFail(task.data, e)
    }
  }

  async function worker(processor: QueueProcessor<Data>): Promise<void> {
    if (stopped) return
    if (tasks.length === 0) return
    let [task, wait] = findNext(tasks)
    if (wait) {
      await delay(wait)
    } else if (task) {
      try {
        let callback = task.callback ?? processor(task.data)
        await callback(download)
      } catch (e) {
        if (e instanceof Error) {
          processError(task, e)
        }
      }
    }
    await worker(processor)
  }

  return {
    add(data, callback) {
      tasks.push(buildTask(data, callback))
    },
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
