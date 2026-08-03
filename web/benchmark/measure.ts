import {
  getRenderedLoaders,
  type LoaderSpan,
  recordLoaders
} from '@slowreader/core/benchmark'

export interface LoaderReport {
  count: number
  max: number
  median: number
  name: string
}

export interface Measurement {
  domSize: number
  duration: number
  freezes: number
  loaders: LoaderReport[]
  longestFrame: number
  longestTask: number
  memory: number
}

const FREEZE = 50

const IDLE_TIMEOUT = 60000

// Remove after fixing app’s loading time on big database
export const START_TIMEOUT = 600000

const CALM = 30

export function nextFrame(): Promise<number> {
  return new Promise(resolve => {
    requestAnimationFrame(resolve)
  })
}

export function median(list: number[]): number {
  if (list.length === 0) return 0
  let sorted = list.toSorted((a, b) => a - b)
  return Math.round(sorted[Math.floor(sorted.length / 2)]!)
}

export function percentile(list: number[], share: number): number {
  if (list.length === 0) return 0
  let sorted = list.toSorted((a, b) => a - b)
  return Math.round(
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))]!
  )
}

function trackFrames(): () => { freezes: number; longestFrame: number } {
  let freezes = 0
  let longest = 0
  let prev = performance.now()
  let stopped = false

  function frame(time: number): void {
    if (stopped) return
    let gap = time - prev
    prev = time
    if (gap > longest) longest = gap
    if (gap > FREEZE) freezes += 1
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return () => {
    stopped = true
    return { freezes, longestFrame: Math.round(longest) }
  }
}

function trackLongTasks(): () => number {
  let longest = 0
  let observer: PerformanceObserver | undefined
  try {
    observer = new PerformanceObserver(list => {
      for (let entry of list.getEntries()) {
        if (entry.duration > longest) longest = entry.duration
      }
    })
    observer.observe({ type: 'longtask' })
  } catch {
    observer = undefined
  }
  return () => {
    observer?.disconnect()
    return Math.round(longest)
  }
}

function reportLoaders(spans: LoaderSpan[]): LoaderReport[] {
  let byName = new Map<string, number[]>()
  for (let span of spans) {
    let durations = byName.get(span.name) ?? []
    durations.push((span.end ?? performance.now()) - span.start)
    byName.set(span.name, durations)
  }
  return [...byName.entries()].map(([name, durations]) => ({
    count: durations.length,
    max: Math.round(Math.max(...durations)),
    median: median(durations),
    name
  }))
}

export function isBusy(): boolean {
  return getRenderedLoaders().length > 0 || !!document.getElementById('loader')
}

export async function waitIdle(timeout = IDLE_TIMEOUT): Promise<number> {
  let finish = performance.now() + timeout
  let ended = performance.now()
  let calm = 0
  while (calm < CALM) {
    await nextFrame()
    if (!isBusy()) {
      if (calm === 0) ended = performance.now()
      calm += 1
    } else {
      calm = 0
    }
    if (performance.now() > finish) {
      throw new Error(`Loaders are still rendered after ${timeout} ms`)
    }
  }
  return ended
}

export async function measure(
  action: () => Promise<void> | void
): Promise<Measurement> {
  let stopLoaders = recordLoaders()
  let stopFrames = trackFrames()
  let stopTasks = trackLongTasks()
  let started = performance.now()

  await action()
  let ended = await waitIdle()

  let duration = ended - started
  let frames = stopFrames()
  return {
    domSize: document.querySelectorAll('*').length,
    duration: Math.round(duration),
    freezes: frames.freezes,
    loaders: reportLoaders(stopLoaders()),
    longestFrame: frames.longestFrame,
    longestTask: stopTasks(),
    memory: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1024 / 1024)
  }
}
