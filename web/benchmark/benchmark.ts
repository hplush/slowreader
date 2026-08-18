import { benchmarkStatistics, signOut } from '@slowreader/core'
import {
  BENCHMARK_GIVE_UP,
  fillBenchmarkData,
  type FillStatistics,
  getBenchmarkRuns,
  mockBenchmarkRequests,
  setBenchmarkDebug,
  signInBenchmark
} from '@slowreader/core/benchmark'

import {
  measure,
  type Measurement,
  median,
  START_TIMEOUT,
  waitIdle
} from './measure.ts'
import { createScenarios } from './scenarios.ts'
import { measureStorage, type StorageSize } from './storage.ts'

interface ScenarioResults {
  domSize: number
  duration: number
  failed: number
  freezes: number
  loaders: Record<string, number>
  longestFrame: number
  longestTask: number
  memory: number
}

interface BenchmarkTotal {
  domSize: number
  duration: number
  failed: number
  freezes: number
  loaders: number
  longestFrame: number
  longestTask: number
  memory: number
}

interface BenchmarkResults {
  feeds: number
  fill: number
  posts: number
  scenarios: Record<string, ScenarioResults>
  start: number
  storage: { end: StorageSize; start: StorageSize }
  total: BenchmarkTotal
}

function total(scenarios: ScenarioResults[]): BenchmarkTotal {
  function sum(cb: (scenario: ScenarioResults) => number): number {
    return scenarios.reduce((all, i) => all + cb(i), 0)
  }
  function max(cb: (scenario: ScenarioResults) => number): number {
    return Math.max(0, ...scenarios.map(cb))
  }
  return {
    domSize: sum(i => i.domSize),
    duration: sum(i => i.duration),
    failed: sum(i => i.failed),
    freezes: sum(i => i.freezes),
    loaders: sum(i => Object.values(i.loaders).reduce((all, j) => all + j, 0)),
    longestFrame: max(i => i.longestFrame),
    longestTask: max(i => i.longestTask),
    memory: max(i => i.memory)
  }
}

async function prepare(): Promise<void> {
  mockBenchmarkRequests()
  await signInBenchmark()
  try {
    await waitIdle(START_TIMEOUT)
  } catch {
    throw new Error(
      `App did not load database in ${START_TIMEOUT / 1000} seconds`
    )
  }
}

function merge(runs: Measurement[], failed: number): ScenarioResults {
  let loaders: Record<string, number> = {}
  for (let measurement of runs) {
    for (let loader of measurement.loaders) {
      loaders[loader.name] = Math.max(loaders[loader.name] ?? 0, loader.median)
    }
  }
  return {
    domSize: median(runs.map(i => i.domSize)),
    duration: median(runs.map(i => i.duration)),
    failed,
    freezes: median(runs.map(i => i.freezes)),
    loaders,
    longestFrame: Math.max(0, ...runs.map(i => i.longestFrame)),
    longestTask: Math.max(0, ...runs.map(i => i.longestTask)),
    memory: Math.max(0, ...runs.map(i => i.memory))
  }
}

async function fill(): Promise<FillStatistics> {
  mockBenchmarkRequests()
  await signInBenchmark()
  let statistics = await fillBenchmarkData()
  return statistics
}

async function clean(): Promise<void> {
  let mode = sessionStorage.getItem('benchmark')!
  await signOut()
  // `signOut()` cleans the whole storage, but the tab is still a benchmark:
  // the mark is written back before the reload of `signOut()` takes the tab
  sessionStorage.setItem('benchmark', mode)
}

function end(): void {
  sessionStorage.removeItem('benchmark')
  location.reload()
}

async function waitStart(): Promise<number> {
  try {
    await waitIdle(START_TIMEOUT)
    return Math.round(performance.now())
  } catch {
    return 0
  }
}

setBenchmarkDebug(sessionStorage.getItem('benchmark') === 'debug')

let startTime = waitStart()

async function fillOnFirstOpen(): Promise<void> {
  if (!benchmarkStatistics.get()) {
    await fill()
    location.reload()
  }
}

async function run(only?: string): Promise<BenchmarkResults> {
  let statistics = benchmarkStatistics.get()
  if (!statistics) {
    throw new Error('Run await benchmark.fill() and reload the page')
  }
  await prepare()
  let storageStart = await measureStorage()

  let scenarios = createScenarios(
    statistics.biggestCategory,
    statistics.readerFeed,
    statistics.slowFeeds
  ).filter(i => (only ? i.name === only : i.name !== 'freeze'))

  let list: Record<string, ScenarioResults> = {}
  for (let scenario of scenarios) {
    let runs: Measurement[] = []
    let failed = 0
    for (let i = 0; i < getBenchmarkRuns() && failed < BENCHMARK_GIVE_UP; i++) {
      try {
        await scenario.prepare?.()
        runs.push(await measure(() => scenario.run()))
      } catch (e) {
        failed += 1
        let message = e instanceof Error ? e.message : String(e)
        console.error(`${scenario.name} failed: ${message}`)
      }
    }
    let merged = merge(runs, failed)
    list[scenario.name] = merged
    console.log(`${scenario.name}: ${merged.duration} ms, ${failed} failed`)
  }

  window.benchmark.results = {
    feeds: statistics.feeds,
    fill: Math.round(statistics.duration),
    posts: statistics.posts,
    scenarios: list,
    start: await startTime,
    storage: { end: await measureStorage(), start: storageStart },
    total: total(Object.values(list))
  }
  return window.benchmark.results
}

declare global {
  interface Window {
    benchmark: {
      clean(): Promise<void>
      data: FillStatistics | undefined
      end(): void
      fill(): Promise<FillStatistics>
      results: BenchmarkResults | undefined
      run(only?: string): Promise<BenchmarkResults>
      scenarios: string[]
      storage(): Promise<StorageSize>
    }
  }
}

window.benchmark = {
  clean,
  data: benchmarkStatistics.get(),
  end,
  fill,
  results: undefined,
  run,
  scenarios: createScenarios('', '', ['', ''])
    .map(i => i.name)
    .filter(i => i !== 'freeze'),
  storage: measureStorage
}

void fillOnFirstOpen()
