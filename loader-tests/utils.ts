import {
  enableTestTime,
  getTestEnvironment,
  setBaseTestRoute,
  setRequestMethod,
  setupEnvironment,
  userId
} from '@slowreader/core'
import type { ReadableAtom } from 'nanostores'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import pico from 'picocolors'

export async function readText(path: string): Promise<string> {
  let absolute = path
  if (!isAbsolute(absolute)) {
    absolute = join(process.env.INIT_CWD!, path)
  }
  let buffer = await readFile(absolute)
  return buffer.toString('utf-8')
}

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function enableTestClient(): void {
  setupEnvironment(getTestEnvironment())
  enableTestTime()
  userId.set('10')
  setBaseTestRoute({ params: {}, route: 'home' })
  setRequestMethod(fetch)
}

export function timeout<Value>(
  ms: number,
  promise: Promise<Value>
): Promise<Value> {
  return Promise.race([
    promise,
    new Promise<Value>((resolve, reject) =>
      setTimeout(() => {
        reject(new OurError('Timeout'))
      }, ms)
    )
  ])
}

export function waitFor<Value>(
  store: ReadableAtom,
  value: Value
): Promise<void> {
  return new Promise<void>(resolve => {
    let unbind = store.subscribe(state => {
      if (state === value) {
        unbind()
        resolve()
      }
    })
  })
}

interface NoFileError extends Error {
  code: string
  path: string
}

function isNoFileError(e: unknown): e is NoFileError {
  return e instanceof Error && `code` in e && e.code === 'ENOENT'
}

export function print(msg: string): void {
  process.stderr.write(`${msg}\n`)
}

let hadError = false

export function error(err: string | unknown, details?: string): void {
  hadError = true
  let msg: string
  if (err instanceof OurError) {
    msg = err.message
  } else if (isNoFileError(err)) {
    msg = `File not found: ${err.path}`
  } else if (err instanceof Error) {
    msg = err.stack ?? err.message
  } else {
    msg = String(err)
  }
  print('')
  print(pico.bold(pico.bgRed(' ERROR ')) + ' ' + pico.red(msg))
  if (details) print(details)
  print('')
}

export function exit(): void {
  process.exit(hadError ? 1 : 0)
}

export function success(msg: string, details?: string): void {
  if (details) {
    msg += ` ${pico.gray(details)}`
  }
  print(pico.green(pico.bold('✓ ') + msg))
}

export class OurError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}
