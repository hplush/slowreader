// Script to run UI benchmark in Chromium and print results.
// See docs/benchmark.md

import { spawn, spawnSync } from 'node:child_process'
import { globSync, readdirSync, readFileSync, rmSync, writeSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  error,
  finish,
  printAboveProgress,
  semiSuccess,
  startProgress,
  success,
  warning
} from '../../scripts/progress.ts'

const ROOT = join(import.meta.dirname, '..')

const PROFILE = join(tmpdir(), 'slowreader-benchmark')

const PORT = 2557

const FILL_ATTEMPTS = 900

const PEAK_INTERVAL = 500

interface FillStatistics {
  duration: number
  feeds: number
  posts: number
}

interface StorageSize {
  indexedDB: number
  localStorage: number
  opfs: number
  total: number
}

interface Peaks {
  documents: number
  listeners: number
  renderer: number
}

interface BenchmarkResults {
  feeds: number
  fill: number
  posts: number
  scenarios: Record<string, Record<string, unknown>>
  start: number
  storage: { end: StorageSize; start: StorageSize }
  total: Record<string, number>
}

const FLAGS = ['--clean', '--dev', '--help', '--json', '-h']

const OPTIONS = ['--scenario', '--url']

let args = process.argv.slice(2)

function option(name: string): string | undefined {
  let index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1] ?? ''
}

let debug = process.env.DEBUG === '1'
let dev = args.includes('--dev')
let clean = args.includes('--clean')
let json = args.includes('--json')
let scenario = option('--scenario')
let url = option('--url')

const HELP = `Run UI benchmark in Chromium and print the report.

Usage:
  pnpm -F web benchmark [options]

Options:
  --clean            Remove browser profile with database before the run
  --scenario NAME    Run only this scenario
  --json             Print full report as JSON instead of total numbers
  --dev              Use Vite dev server instead of production build
  --url URL          Use already running server instead of starting new one
  --help             Show this help

Environment:
  DEBUG=1            Small database and single run of every scenario
  CHROMIUM_PATH      Path to Chromium binary`

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${HELP}\n`)
  process.exit(0)
}

function print(message: string): void {
  writeSync(1, `${message}\n`)
}

function status(message: string): void {
  if (json) return
  printAboveProgress(message, 'status')
}

function fail(message: string): never {
  error(message)
  finish('Benchmark failed')
  process.exit(1)
}

for (let i = 0; i < args.length; i++) {
  let arg = args[i]!
  if (OPTIONS.includes(arg)) {
    let value = args[i + 1]
    if (!value || value.startsWith('-')) fail(`${arg} needs a value`)
    i += 1
  } else if (!FLAGS.includes(arg)) {
    fail(`Unknown argument ${arg}\n\n${HELP}`)
  }
}

function findChromium(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  let found = globSync(
    join(homedir(), '.cache/ms-playwright/chromium-*/chrome-linux*/chrome')
  )
  let binary = found.toSorted().pop()
  if (!binary) fail('No Chromium. Set CHROMIUM_PATH')
  return binary
}

async function waitServer(address: string): Promise<void> {
  for (let i = 0; i < 300; i++) {
    try {
      await fetch(address)
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  fail(`Server ${address} did not start`)
}

async function startServer(): Promise<[string, () => void]> {
  if (url) return [url, () => {}]
  let address = `http://localhost:${PORT}`
  try {
    await fetch(address)
    fail(`Port ${PORT} is busy. Stop that server or use --url`)
  } catch (e) {
    if (e instanceof Error && e.message.includes('busy')) throw e
  }

  let serverArgs = ['--port', String(PORT), '--strictPort']
  if (!dev) {
    status('Building app…')
    let build = spawnSync(join(ROOT, 'node_modules/.bin/vite'), ['build'], {
      cwd: ROOT,
      stdio: 'ignore'
    })
    if (build.status !== 0) fail('Vite build failed')
    serverArgs.unshift('preview')
  }
  let child = spawn(join(ROOT, 'node_modules/.bin/vite'), serverArgs, {
    cwd: ROOT,
    stdio: 'ignore'
  })

  await waitServer(address)
  return [
    address,
    () => {
      child.kill()
    }
  ]
}

class Chromium {
  private closed = false

  private handlers = new Map<
    number,
    { reject: (error: Error) => void; resolve: (result: unknown) => void }
  >()

  private last = 0

  private session = ''

  private socket: WebSocket

  private constructor(socket: WebSocket) {
    this.socket = socket
    socket.addEventListener('message', event => {
      if (this.closed) return
      let message = JSON.parse(String(event.data)) as {
        error?: { message: string }
        id?: number
        method?: string
        params?: Record<string, unknown>
        result?: unknown
      }
      if (message.id) {
        let handler = this.handlers.get(message.id)
        this.handlers.delete(message.id)
        if (message.error) {
          handler?.reject(new Error(`Chromium: ${message.error.message}`))
        } else {
          handler?.resolve(message.result)
        }
      } else if (message.method === 'Page.javascriptDialogOpening') {
        void this.send('Page.handleJavaScriptDialog', { accept: true })
      } else if (message.method === 'Runtime.consoleAPICalled') {
        let params = message.params as {
          args: { description?: string; value?: string }[]
          type: string
        }
        let text = params.args
          .map(i => i.value ?? i.description ?? '')
          .join(' ')
        let scenarioLine = text.match(/^(\S+): (\d+ ms), (\d+) failed$/)
        if (params.type === 'error') {
          error(text)
        } else if (json) {
          // Only errors in JSON mode
        } else if (scenarioLine) {
          let [, name, time, failed] = scenarioLine
          if (failed === '0') {
            success(name!, time)
          } else if (time === '0 ms') {
            warning(`${name} failed in every run`)
          } else {
            semiSuccess(name!, `${failed} failed`)
          }
        } else {
          status(text)
        }
      }
    })
  }

  static async start(binary: string): Promise<Chromium> {
    if (clean) rmSync(PROFILE, { force: true, recursive: true })
    let child = spawn(binary, [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--window-size=1280,900',
      '--enable-precise-memory-info'
    ])
    let endpoint = await new Promise<string>(resolve => {
      child.stderr.on('data', (chunk: Buffer) => {
        let match = chunk.toString().match(/ws:\/\/\S+/)
        if (match) resolve(match[0])
      })
    })
    let socket = new WebSocket(endpoint)
    await new Promise(resolve => {
      socket.addEventListener('open', resolve, { once: true })
    })
    let chromium = new Chromium(socket)
    chromium.kill = () => {
      child.kill()
    }
    return chromium
  }

  kill: () => void = () => {}

  close(): void {
    this.closed = true
    this.socket.close()
    this.kill()
  }

  async evaluate<Value>(expression: string): Promise<Value> {
    let result = (await this.send('Runtime.evaluate', {
      awaitPromise: true,
      expression,
      returnByValue: true
    })) as {
      exceptionDetails?: { exception?: { description?: string } }
      result: { value: Value }
    }
    if (result.exceptionDetails) {
      let details = result.exceptionDetails.exception?.description ?? ''
      throw new Error(`Page: ${details.split('\n')[0]}`)
    }
    return result.result.value
  }

  async metrics(): Promise<Record<string, number>> {
    let result = (await this.send('Performance.getMetrics', {})) as {
      metrics: { name: string; value: number }[]
    }
    let values: Record<string, number> = {}
    for (let metric of result.metrics) values[metric.name] = metric.value
    return values
  }

  async open(address: string): Promise<void> {
    let target = (await this.send('Target.createTarget', {
      url: 'about:blank'
    })) as { targetId: string }
    let attached = (await this.send('Target.attachToTarget', {
      flatten: true,
      targetId: target.targetId
    })) as { sessionId: string }
    this.session = attached.sessionId
    await this.send('Page.enable', {})
    await this.send('Runtime.enable', {})
    await this.send('Performance.enable', {})
    await this.send('Page.navigate', { url: address })
    await this.waitApi()
  }

  async reload(): Promise<void> {
    await this.send('Page.reload', {})
    await this.waitApi()
  }

  async waitFilled(): Promise<void> {
    for (let i = 0; i < FILL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      try {
        if (await this.evaluate<boolean>('!!window.benchmark?.data')) return
      } catch {
        continue
      }
    }
    fail('Database was not filled')
  }

  private send(method: string, params: object): Promise<unknown> {
    this.last += 1
    let id = this.last
    let message: Record<string, unknown> = { id, method, params }
    if (this.session) message.sessionId = this.session
    this.socket.send(JSON.stringify(message))
    return new Promise((resolve, reject) => {
      this.handlers.set(id, { reject, resolve })
    })
  }

  private async waitApi(): Promise<void> {
    for (let i = 0; i < 300; i++) {
      try {
        if (await this.evaluate<boolean>('!!window.benchmark')) return
      } catch {
        // Page is still navigating
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    fail('Benchmark API did not load')
  }
}

// performance.memory shows only JS heap of the main isolate. Renderer is
// killed by the whole process memory: DOM, IndexedDB, images, workers.
function rendererMemory(): number {
  let total = 0
  let processes: string[]
  try {
    processes = readdirSync('/proc')
  } catch {
    return 0
  }
  for (let pid of processes) {
    try {
      let cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8')
      if (!cmdline.includes(PROFILE)) continue
      if (!cmdline.includes('--type=renderer')) continue
      let used = readFileSync(`/proc/${pid}/status`, 'utf8').match(
        /VmRSS:\s+(\d+) kB/
      )
      if (used) total += Number(used[1]) * 1024
    } catch {
      // Process is already dead or is not a process directory
    }
  }
  return total
}

function trackPeaks(browser: Chromium): () => Promise<Peaks> {
  let peaks: Peaks = { documents: 0, listeners: 0, renderer: 0 }

  async function sample(): Promise<void> {
    try {
      let metrics = await browser.metrics()
      peaks.documents = Math.max(peaks.documents, metrics.Documents ?? 0)
      peaks.listeners = Math.max(peaks.listeners, metrics.JSEventListeners ?? 0)
    } catch {
      // Page is navigating or browser was closed
    }
    peaks.renderer = Math.max(peaks.renderer, rendererMemory())
  }

  let sampling = Promise.resolve()
  let busy = false
  let timer = setInterval(() => {
    if (busy) return
    busy = true
    sampling = sample().finally(() => {
      busy = false
    })
  }, PEAK_INTERVAL)

  return async () => {
    clearInterval(timer)
    await sampling
    return peaks
  }
}

function size(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

let [address, stopServer] = await startServer()
let chromium = await Chromium.start(findChromium())
let stopPeaks: (() => Promise<Peaks>) | undefined

try {
  await chromium.open(`${address}/?benchmark${debug ? '=debug' : ''}`)
  stopPeaks = trackPeaks(chromium)

  if (!(await chromium.evaluate<boolean>('!!window.benchmark.data'))) {
    status('Filling database, it will take a while…')
    await chromium.waitFilled()
  }

  let data = await chromium.evaluate<FillStatistics>('window.benchmark.data')
  status(
    `Data: ${data.feeds} feeds, ${data.posts} posts, ` +
      `filled in ${Math.round(data.duration)} ms`
  )

  let names = await chromium.evaluate<string[]>('window.benchmark.scenarios')
  if (scenario && scenario !== 'freeze' && !names.includes(scenario)) {
    throw new Error(`Unknown scenario ${scenario}`)
  }
  if (!json) {
    startProgress(scenario ? 1 : names.length)
  }
  let results = await chromium.evaluate<BenchmarkResults>(
    scenario
      ? `window.benchmark.run(${JSON.stringify(scenario)})`
      : 'window.benchmark.run()'
  )
  let peaks = await stopPeaks()
  stopPeaks = undefined
  results.total.documents = peaks.documents
  results.total.listeners = peaks.listeners
  results.total.renderer = Math.round(peaks.renderer / 1024 / 1024)

  if (json) {
    print(JSON.stringify(results, null, 2))
  } else {
    let storage = results.storage.end
    let growth = storage.total - results.storage.start.total
    print('\n')
    print(`Duration: ${results.total.duration} ms (sum)`)
    print(`Loaders: ${results.total.loaders} ms (sum)`)
    print(`Freezes: ${results.total.freezes} (sum)`)
    print(`Longest frame: ${results.total.longestFrame} ms (max)`)
    print(`Longest task: ${results.total.longestTask} ms (max)`)
    print(`DOM size: ${results.total.domSize} nodes (sum)`)
    print(`Documents: ${results.total.documents} (max)`)
    print(`Listeners: ${results.total.listeners} (max)`)
    print(`JS heap: ${results.total.memory} MB (max)`)
    print(`Renderer memory: ${results.total.renderer} MB (max)`)
    print(
      `Storage: ${size(storage.total)} ` +
        `(IndexedDB ${size(storage.indexedDB)}, ` +
        `OPFS ${size(storage.opfs)}, ` +
        `localStorage ${size(storage.localStorage)})`
    )
    print(`Storage growth: ${size(growth)} during scenarios`)
    print(`Failed: ${results.total.failed} (sum)`)
  }
} catch (e) {
  void stopPeaks?.()
  chromium.close()
  stopServer()
  fail(e instanceof Error ? e.message : String(e))
} finally {
  void stopPeaks?.()
  chromium.close()
  stopServer()
}

if (!json) finish('Benchmark finished')
