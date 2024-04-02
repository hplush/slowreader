import type { ReadableAtom } from 'nanostores'
import { isAbsolute, join, resolve } from 'node:path'
import pico from 'picocolors'

const supportedExtensions = ['.xml', '.opml']

export function isSupportedExt(path: string): boolean {
  return supportedExtensions.some(ext => path.endsWith(ext))
}

export function isString(attr: null | string): attr is string {
  return typeof attr === 'string' && attr.length > 0
}

export function resolvePath(path: string): string {
  if (isAbsolute(path)) {
    return path
  }
  return resolve(join(process.cwd(), '..', path))
}

export function waitForStoreResolve(
  store: ReadableAtom<boolean>
): Promise<boolean> {
  return new Promise(_resolve => {
    let loadingComparison = 'idle'
    let unbind = store.listen(value => {
      if (value && loadingComparison === 'idle') {
        loadingComparison = 'loading'
      }
      if (!value && loadingComparison === 'loading') {
        unbind()
        _resolve(value)
      }
    })
  })
}

interface Logger {
  err(msg: string): void
  info(msg: string): void
  log(msg: string): void
  succ(msg: string): void
  warn(msg: string): void
}

export const logger: Logger = {
  err(msg) {
    this.log(pico.red(`Error: ${msg}`))
  },
  info(msg) {
    this.log(pico.blue(msg))
  },
  log(msg) {
    process.stderr.write(`${msg}\n`)
  },
  succ(msg) {
    this.log(pico.green(msg))
  },
  warn(msg) {
    this.log(pico.yellow(`Warning: ${msg}`))
  }
}
