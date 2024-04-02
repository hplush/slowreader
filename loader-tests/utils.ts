import {
  enableTestTime,
  getTestEnvironment,
  setBaseTestRoute,
  setRequestMethod,
  setupEnvironment,
  userId
} from '@slowreader/core'
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

export function error(msg: string | unknown): void {
  if (typeof msg === 'string') {
    print(pico.red(msg))
  } else if (msg instanceof OurError) {
    print(pico.red(msg.message))
  } else if (isNoFileError(msg)) {
    print(pico.red(`File not found: ${msg.path}`))
  } else if (msg instanceof Error) {
    print(pico.red(msg.stack))
  }
}

export function warn(msg: string): void {
  print(pico.yellow(msg))
}

export function success(msg: string): void {
  print(pico.green(msg))
}

export class OurError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}
