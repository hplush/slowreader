// Script to merge benchmark results from CI runners into the file
// for `benchmark` branch.
// See docs/development/benchmark.md

import { readFileSync, writeFileSync } from 'node:fs'

interface StorageSize {
  indexedDB: number
  localStorage: number
  opfs: number
  total: number
}

interface Report {
  chromium: string
  commit: string
  cpu: string
  feeds: number
  fill: number
  posts: number
  scenarios: Record<
    string,
    {
      domSize: number
      duration: number
      failed: number
      freezes: number
      loaders: Record<string, number>
      longestFrame: number
      longestTask: number
      memory: number
    }
  >
  start: number
  storage: { end: StorageSize; start: StorageSize }
  total: { documents: number; listeners: number; renderer: number }
  upload: number
  uploadSync: number
}

function median(list: number[]): number {
  return list.toSorted((a, b) => a - b)[Math.floor(list.length / 2)]!
}

function toSeries(report: Report): Record<string, number> {
  let series: Record<string, number> = {
    documents: report.total.documents,
    feeds: report.feeds,
    fill_seconds: report.fill / 1000,
    listeners: report.total.listeners,
    posts: report.posts,
    renderer_bytes: report.total.renderer * 1024 * 1024,
    start_seconds: report.start / 1000,
    storage_growth_bytes: report.storage.end.total - report.storage.start.total,
    upload_seconds: report.upload / 1000,
    upload_sync_seconds: report.uploadSync / 1000
  }
  for (let type of ['indexedDB', 'localStorage', 'opfs'] as const) {
    series[`storage_bytes{type="${type}"}`] = report.storage.end[type]
  }
  for (let [name, scenario] of Object.entries(report.scenarios)) {
    let labels = `{scenario=${JSON.stringify(name)}}`
    series[`dom_size${labels}`] = scenario.domSize
    series[`duration_seconds${labels}`] = scenario.duration / 1000
    series[`failed${labels}`] = scenario.failed
    series[`freezes${labels}`] = scenario.freezes
    series[`heap_bytes${labels}`] = scenario.memory * 1024 * 1024
    series[`longest_frame_seconds${labels}`] = scenario.longestFrame / 1000
    series[`longest_task_seconds${labels}`] = scenario.longestTask / 1000
    for (let [loader, time] of Object.entries(scenario.loaders)) {
      series[
        `loader_seconds{loader=${JSON.stringify(loader)},` +
          `scenario=${JSON.stringify(name)}}`
      ] = time / 1000
    }
  }
  return series
}

function format(name: string, value: number): string {
  if (name.includes('_seconds')) return `${Math.round(value * 1000)} ms`
  if (!name.includes('_bytes')) return String(value)
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${Math.round(value / 1024 / 1024)} MB`
}

let reports = process.argv
  .slice(2)
  .map(file => JSON.parse(readFileSync(file, 'utf8')) as Report)

let runners: Record<string, Record<string, number[]>> = {}
for (let report of reports) {
  for (let [name, value] of Object.entries(toSeries(report))) {
    runners[name] ??= {}
    ;(runners[name][report.cpu] ??= []).push(value)
  }
}

let cpus = [...new Set(reports.map(i => i.cpu))].toSorted()
let rows = [['', ...cpus]]
let info =
  `info{chromium=${JSON.stringify(reports[0]!.chromium)},` +
  `commit=${JSON.stringify(reports[0]!.commit)}}`
let series: Record<string, number> = {
  [info]: 1,
  run_timestamp_seconds: Math.round(Date.now() / 1000)
}
for (let [name, byCpu] of Object.entries(runners)) {
  rows.push([
    name,
    ...cpus.map(cpu => {
      return (byCpu[cpu] ?? []).map(i => format(name, i)).join(' ')
    })
  ])
  for (let [cpu, values] of Object.entries(byCpu)) {
    let label = `{cpu=${JSON.stringify(cpu)}`
    series[
      name.includes('{') ? name.replace('{', `${label},`) : `${name}${label}}`
    ] = name.startsWith('failed')
      ? values.reduce((all, i) => all + i, 0)
      : median(values)
  }
}

let widths = rows[0]!.map((_, column) => {
  return Math.max(...rows.map(row => row[column]!.length))
})
for (let row of rows) {
  let line = row.map((cell, column) => cell.padEnd(widths[column]!))
  process.stdout.write(`${line.join('  ').trimEnd()}\n`)
}

writeFileSync(
  'metrics.prom',
  Object.entries(series)
    .map(([name, value]) => `slowreader_benchmark_${name} ${value}\n`)
    .join('')
)
